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

/** demo dev server 地址。默认 5273 是 demo-electron 专属端口（scripts/dev.mjs 会用
 * DEMO_PORT=5273 启动本仓库 demo），避免与本机其他项目默认的 5173 撞车加载错应用 */
const DEMO_DEV_URL = process.env.DEMO_URL || 'http://localhost:5273'

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

async function openPersistence(account) {
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

function registerIpc() {
  // 登录信息传递通道：登录后打开 / 切换库
  ipcMain.handle('uikit-persist:init', async (_event, account) => {
    if (!account || !account.appKey || !account.userId)
      throw new Error('uikit-persist:init 需要 { appKey, userId }')
    await openPersistence(account)
  })

  ipcMain.handle('uikit-persist:close', async () => {
    persist?.close()
    persist = null
    persistAccount = null
  })

  // 删库重开（测试面板「全新安装路径」验收）：删 userData 下当前账号库文件后 relaunch
  ipcMain.handle('uikit-persist:delete-db-and-relaunch', async () => {
    if (persistAccount) {
      const dbPath = dbPathOf(persistAccount)
      try {
        persist?.close()
      }
      catch { /* 忽略 close 异常，删库重开本来就是破坏性测试 */ }
      persist = null
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`])
        fs.rmSync(file, { force: true })
      console.warn(`[demo-electron] 已删除库文件 ${dbPath}，即将重启`)
    }
    app.relaunch()
    app.exit(0)
  })

  // 通用注册：遍历注册表逐方法挂 handle（登录前调用 reject「库未打开」）
  for (const [name, pick] of Object.entries(CHANNELS)) {
    ipcMain.handle(`uikit-persist:${name}`, async (_event, ...args) => {
      if (!persist)
        throw new Error('[demo-electron] 持久化库未打开（请先登录）')
      const method = pick(persist)
      if (typeof method !== 'function')
        throw new Error(`[demo-electron] 方法不可用: ${name}`)
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

  // 外链适配点（D85）：window.open 一律拦截走系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.loadURL(DEMO_DEV_URL)
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
