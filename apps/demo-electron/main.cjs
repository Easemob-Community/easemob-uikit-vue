/**
 * demo-electron 主进程（Electron 壳，尽量薄）。
 *
 * 职责（规格书决策 4 / 8.7）：
 * - 单实例锁：第二实例退出并聚焦已有窗口；
 * - 权限 / 外链适配点：media（麦克风）放行，window.open 拦截走 shell.openExternal；
 * - 持久化实例化：renderer 登录后经 IPC 传 appKey/userId 才 createPersistence
 *   （登录前库不打开），库文件 userData/uikit_<appKey>_<userId>.db；切账号先 close 旧实例；
 * - IPC 注册：hooks / repository / 管理 API 每个方法一条 `uikit-persist:<方法名>` 通道，
 *   通用注册函数遍历方法名（白名单即注册表，未登记的方法名一律拒绝）。
 *
 * 本文件为 Node/Electron 主进程 CommonJS，不依赖 TS。
 */
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { createPersistence } = require('@easemob/uikit-persist-sqlite')

/**
 * demo dev server 地址。默认 5273 是 demo-electron 专属端口（scripts/dev.mjs 会用
 * DEMO_PORT=5273 启动本仓库 demo），避免与本机其他项目默认的 5173 撞车加载错应用
 */
const DEMO_DEV_URL = process.env.DEMO_URL || 'http://localhost:5273'

// 冒烟 / 并行验收：DEMO_USER_DATA_DIR 指定独立 userData 目录
// （独立的单实例锁与库文件目录，可与常驻实例并存，互不影响）
if (process.env.DEMO_USER_DATA_DIR)
  app.setPath('userData', process.env.DEMO_USER_DATA_DIR)

/** 库文件名安全化：appKey 含 '#' 等路径不友好字符，统一替换为 '_' */
function sanitizeFilePart(part) {
  return String(part).replace(/[\\/:*?"<>|#\s]/g, '_')
}

function dbPathOf(account) {
  return path.join(
    app.getPath('userData'),
    `uikit_${sanitizeFilePart(account.appKey)}_${sanitizeFilePart(account.userId)}.db`,
  )
}

/** 当前持久化实例与账号（登录前为 null，库不打开） */
let persist = null
let persistAccount = null

/** init 并发互斥（模块级 in-flight 链）：并发 / 重复 init 串行执行，不双开同一库文件 */
let openInFlight = Promise.resolve()

async function doOpenPersistence(account) {
  // 切账号 / 重复登录：先 close 旧实例（close 内部会落盘 FTS 队列尾部）
  if (persist) {
    try {
      persist.close()
    }
    catch (error) {
      console.warn('[demo-electron] close 旧持久化实例失败', error)
    }
    persist = null
    persistAccount = null
  }
  persist = await createPersistence({
    dbPath: dbPathOf(account),
    account,
    adapterId: 'websdk5',
  })
  persistAccount = account
  console.warn(`[demo-electron] 持久化库已打开: ${dbPathOf(account)}`)
}

function openPersistence(account) {
  const next = openInFlight.then(() => doOpenPersistence(account))
  // 链上挂吞错分支接力，避免一次开库失败毒化后续所有 init
  openInFlight = next.catch(() => {})
  return next
}

/**
 * IPC 通道注册表：通道名 → 实例方法取值器。
 * 白名单即此表——未登记的方法名即使 renderer 调用也直接 reject。
 */
const CHANNELS = {
  // 旁路写库 hooks（fire-and-forget，主进程同步执行）
  'hooks.message.saveMessage': p => p.hooks.message.saveMessage,
  'hooks.message.saveMessages': p => p.hooks.message.saveMessages,
  'hooks.message.updateMessageStatus': p => p.hooks.message.updateMessageStatus,
  'hooks.message.markMessageRecalled': p => p.hooks.message.markMessageRecalled,
  'hooks.message.updateMessageContent': p => p.hooks.message.updateMessageContent,
  'hooks.message.deleteMessages': p => p.hooks.message.deleteMessages,
  'hooks.message.updateMessagePinned': p => p.hooks.message.updateMessagePinned,
  'hooks.conversation.saveConversations': p => p.hooks.conversation.saveConversations,
  'hooks.conversation.removeConversations': p => p.hooks.conversation.removeConversations,
  // repository 读路径
  'repository.loadMessages': p => p.repository.loadMessages,
  'repository.fetchConversations': p => p.repository.fetchConversations,
  'repository.searchMessages': p => p.repository.searchMessages,
  'repository.searchConversations': p => p.repository.searchConversations,
  // 管理 API
  'manage.getStorageStats': p => p.getStorageStats,
  'manage.clearMessages': p => p.clearMessages,
  'manage.clearAll': p => p.clearAll,
  'manage.vacuum': p => p.vacuum,
  'manage.backup': p => p.backup,
  'manage.insertLocalMessage': p => p.insertLocalMessage,
  'manage.setMessagePinned': p => p.setMessagePinned,
  'manage.upsertUserInfos': p => p.upsertUserInfos,
  'manage.getUserInfos': p => p.getUserInfos,
  'manage.upsertGroupMembers': p => p.upsertGroupMembers,
  'manage.getGroupMembers': p => p.getGroupMembers,
  'manage.flushFts': p => p.flushFts,
}

/**
 * 管理 API 首参浅层类型期望（'object' = 非 null 对象 / 数组负载；'string' = 字符串；
 * 'none' = 无参；'path' = 路径字符串且必须落在 userData 目录内）。
 * 校验失败直接 reject，防渲染进程把错乱类型直送 SQLite 层。
 */
const MANAGE_FIRST_ARG = {
  'manage.getStorageStats': 'none',
  'manage.clearMessages': 'object',
  'manage.clearAll': 'none',
  'manage.vacuum': 'none',
  'manage.backup': 'path',
  'manage.insertLocalMessage': 'object',
  'manage.setMessagePinned': 'string',
  'manage.upsertUserInfos': 'object',
  'manage.getUserInfos': 'object',
  'manage.upsertGroupMembers': 'object',
  'manage.getGroupMembers': 'string',
  'manage.flushFts': 'none',
}

/** 管理 API 参数浅层校验（在 CHANNELS 通用注册中被逐方法调用） */
function validateManageArgs(name, args) {
  const expect = MANAGE_FIRST_ARG[name]
  if (expect === undefined)
    return
  const first = args[0]
  if (expect === 'none')
    return
  if (expect === 'object') {
    if (typeof first !== 'object' || first === null)
      throw new Error(`[demo-electron] ${name} 需要对象参数`)
    return
  }
  if (typeof first !== 'string' || first.length === 0)
    throw new Error(`[demo-electron] ${name} 需要非空字符串参数`)
  if (expect === 'path') {
    // backup 落盘路径限制在 userData 之下：规范化后前缀校验，防 '..' 逃逸
    const userData = app.getPath('userData')
    const resolved = path.resolve(first)
    if (resolved !== userData && !resolved.startsWith(`${userData}${path.sep}`))
      throw new Error('[demo-electron] manage.backup 的 targetPath 必须位于 userData 目录之下')
  }
}

function registerIpc() {
  // 登录信息传递通道：登录后打开 / 切换库（account 做 shape 校验：非空字符串）
  ipcMain.handle('uikit-persist:init', async (_event, account) => {
    if (!account || typeof account !== 'object'
      || typeof account.appKey !== 'string' || account.appKey.length === 0
      || typeof account.userId !== 'string' || account.userId.length === 0) {
      throw new Error('uikit-persist:init 需要 { appKey, userId }（均为非空字符串）')
    }
    await openPersistence(account)
  })

  ipcMain.handle('uikit-persist:close', async () => {
    persist?.close()
    persist = null
    persistAccount = null
  })

  // 删库重开（测试面板「全新安装路径」验收）：close 后删 userData 下当前账号
  // 库文件（含 -wal / -shm 侧车），再重载渲染层——回到登录页重新登录时经 init 重新
  // 开库，与「全新安装」语义等价。不 app.relaunch()：scripts/dev.cjs 是「electron 退出
  // 即杀 vite」联动，relaunch 的新实例会白屏或让 vite 变孤儿占死 5273。
  ipcMain.handle('uikit-persist:delete-db-and-relaunch', async () => {
    if (persistAccount) {
      const dbPath = dbPathOf(persistAccount)
      try {
        persist?.close()
      }
      catch { /* 忽略 close 异常，删库重开本来就是破坏性测试 */ }
      persist = null
      persistAccount = null
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`])
        fs.rmSync(file, { force: true })
      console.warn(`[demo-electron] 已删除库文件 ${dbPath}，重载页面后重新登录开库`)
    }
    BrowserWindow.getAllWindows()[0]?.reload()
  })

  // 通用注册：遍历注册表逐方法挂 handle（登录前调用 reject「库未打开」）
  for (const [name, pick] of Object.entries(CHANNELS)) {
    ipcMain.handle(`uikit-persist:${name}`, async (_event, ...args) => {
      if (!persist)
        throw new Error('[demo-electron] 持久化库未打开（请先登录）')
      const method = pick(persist)
      if (typeof method !== 'function')
        throw new Error(`[demo-electron] 方法不可用: ${name}`)
      validateManageArgs(name, args)
      return method(...args)
    })
  }

  // 断网模拟（测试面板「断开 SDK」）：切断渲染进程全部网络连接（含 WebSocket），
  // 恢复时关闭 offline 模拟，SDK 自动重连
  ipcMain.handle('demo-shell:set-offline', async (event, offline) => {
    const session = event.sender.session
    if (offline) {
      await session.closeAllConnections()
      await session.enableNetworkEmulation({ offline: true })
    }
    else {
      await session.disableNetworkEmulation()
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    // macOS 去掉原生标题栏，红绿灯嵌入内容区左上角（企微风格）；
    // 渲染层需配合 -webkit-app-region: drag 才能拖动窗口（仅 Electron 环境生效）
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 权限适配点（D85）：放行 media（麦克风 / 语音消息），其余默认拒绝
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  // 外链适配点（D85）：window.open 一律拦截，仅 http(s) 放行给系统浏览器；
  // 其余协议（file:// 经 openExternal 可执行本地文件等）deny + warn
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url)
    }
    else {
      console.warn(`[demo-electron] 已拦截非 http(s) 外链: ${url}`)
    }
    return { action: 'deny' }
  })

  win.loadURL(DEMO_DEV_URL)

  // 调试开关（`pnpm -F @easemob/demo-electron dev:console`）：自动打开 DevTools 控制台。
  // detach 独立窗口模式，不遮挡页面；经 ELECTRON_OPEN_DEVTOOLS 环境变量传入，
  // 直接 `electron .` 启动时也可自行设置该变量。
  if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    win.webContents.once('did-finish-load', () => {
      win.webContents.openDevTools({ mode: 'detach' })
    })
  }

  win.webContents.on('did-finish-load', () => {
    console.warn(`[demo-electron] 页面加载完成: ${win.webContents.getURL()}（title: ${win.webContents.getTitle()}）`)
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.warn(`[demo-electron] 页面加载失败: ${code} ${desc}`)
  })
}

// 单实例锁（决策 8.7）：第二实例直接退出并聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}
else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized())
        win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    registerIpc()
    createWindow()
  })

  app.on('window-all-closed', () => {
    persist?.close()
    persist = null
    persistAccount = null
    app.quit()
  })
}
