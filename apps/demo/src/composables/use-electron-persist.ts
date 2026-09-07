/**
 * Demo Electron 本地持久化接入（demo-electron 验证工程渲染侧）。
 *
 * 双栖约定：demo 同时跑在 Web 与 Electron（demo-electron 壳）；
 * 全部桥调用先特性检测 `window.uikitPersist`，Web 模式行为零变化。
 *
 * 链路：设置面板开关（localStorage 记忆，切换后整页刷新）→ 登录前
 * `prepareElectronPersist(appKey, userId)` 经 IPC 让主进程打开库 →
 * `buildDemoSdkInitConfig` 合并 `getElectronPersistInjection()` 产物
 * （persistence 旁路写库 hooks + repositories 读路径接管）注入 Provider init。
 *
 * 注入时机与 demo 自定义数据源一致：init 时装配，切换开关后重新登录（刷新）生效。
 */
import { ref } from 'vue'
import type { UiMessage } from '@easemob/uikit-im'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import type {
  ConversationPage,
  ConversationTypeValue,
  MessagePage,
  MessageRecord,
  MessageSearchParams,
  SdkPersistenceHooks,
  SdkRepositoryOverrides,
  UiConversation,
} from '@easemob/uikit-sdk-contract'

/** 「本地持久化」开关的 localStorage 记忆 key：值 'on' 表示开启 */
const ELECTRON_PERSIST_STORAGE_KEY = 'demo-electron-persist-enabled'

/** 是否处于 demo-electron 壳内（preload 注入了桥） */
export const electronPersistSupported = typeof window !== 'undefined' && !!window.uikitPersist

/**
 * Electron 本地持久化开关（模块级单例；login 前装配路径与 app.vue 外层都要读，
 * 故与 demoSdkVersion 同级不放进 createDemoSettings）。
 * 仅 Electron 壳内可见可开；Web 模式恒 false。
 */
export const electronPersistEnabled = ref(
  electronPersistSupported && localStorage.getItem(ELECTRON_PERSIST_STORAGE_KEY) === 'on',
)

/**
 * 切换持久化开关：持久化后整页刷新。
 * 注入发生在 init（登录链路）时，运行时热切换无法回填已装配的 Provider，
 * 与 SDK 版本切换同口径：切完 reload 由新一轮挂载按记忆值装配。
 * 关闭时桥存在先 close 库再刷新——避免 reload 把「仍打开」的库句柄留到壳退出才回收。
 */
export async function setElectronPersistEnabled(enabled: boolean): Promise<void> {
  if (electronPersistEnabled.value === enabled)
    return
  electronPersistEnabled.value = enabled
  localStorage.setItem(ELECTRON_PERSIST_STORAGE_KEY, enabled ? 'on' : 'off')
  if (!enabled && window.uikitPersist) {
    try {
      await window.uikitPersist.close()
    }
    catch (error) {
      console.warn('[persist] 关闭开关时 close 库失败', error)
    }
  }
  location.reload()
}

/** 注入产物：persistence 旁路 hooks + repositories 读路径接管（IPC 代理对象） */
export interface ElectronPersistInjection {
  persistence: SdkPersistenceHooks
  repositories: SdkRepositoryOverrides
}

let injection: ElectronPersistInjection | null = null
let currentAccount: { appKey: string, userId: string } | null = null

/** 通用 IPC 调用（fire-and-forget 场景由调用方决定是否 await） */
function invoke<T>(method: string, ...args: unknown[]): Promise<T> {
  return window.uikitPersist?.invoke(method, ...args) as Promise<T>
}

/**
 * hooks 旁路写库调用（fire-and-forget 语义）：库未打开 / 切账号窗口期的失败
 * 只告警不上抛——写库是旁路，不阻塞消息主链路，也不制造 unhandled rejection。
 */
function invokeHook(method: string, ...args: unknown[]): Promise<void> {
  return invoke<void>(method, ...args).catch((error) => {
    console.warn('[persist] hook 调用失败', error)
  })
}

/* ==================== 本地读取追踪器 ====================
 * 所有本地库读取都经过下面的 repository IPC 代理（SDK 网络加载不经过），
 * 在代理层埋点即可精确区分「数据是否来自本地库」。
 */

/** 本地库读取方法名（四个 repository 读方法） */
export type PersistReadMethod = 'loadMessages' | 'fetchConversations' | 'searchMessages' | 'searchConversations'

/** 一条本地读取活动记录（rows=-1 表示调用异常） */
export interface PersistReadActivity {
  method: PersistReadMethod
  /** 发生时间（ms 时间戳） */
  at: number
  /** 返回 list 长度；异常记 -1 */
  rows: number
  /** 渲染侧墙钟耗时 ms（含 IPC 往返与回调排队） */
  ms: number
  /** 主进程内 SQL 耗时 ms；旧壳未回包时为 undefined（降级只显墙钟） */
  sqlMs?: number
  /** 明细（conversationId / 关键词等，供面板展示） */
  detail: string
}

/** 主进程分段计时回包（repository 读方法，见 main.cjs REPOSITORY_READ_CHANNELS） */
interface TimedReadEnvelope<T> {
  result: T
  sqlMs: number
}

/**
 * 解包分段计时回包：新壳返回 `{ result, sqlMs }`，旧壳直返原结果。
 * 判定看 `sqlMs` 为 number 的 `result` 键——MessagePage / ConversationPage
 * 自身不含这两个键，不会误判。
 */
function unwrapTimedRead<T>(raw: T | TimedReadEnvelope<T>): { page: T, sqlMs?: number } {
  if (raw && typeof raw === 'object' && 'result' in raw && 'sqlMs' in raw) {
    const envelope = raw as TimedReadEnvelope<T>
    if (typeof envelope.sqlMs === 'number')
      return { page: envelope.result, sqlMs: envelope.sqlMs }
  }
  return { page: raw as T }
}

/** 最近活动记录上限 */
const READ_ACTIVITY_MAX = 20

/** 按方法累计读取次数（响应式） */
export const persistReadCounts = ref<Record<PersistReadMethod, number>>({
  loadMessages: 0,
  fetchConversations: 0,
  searchMessages: 0,
  searchConversations: 0,
})

/** 最近本地读取活动（新→旧，20 条封顶，响应式） */
export const persistReadActivities = ref<PersistReadActivity[]>([])

/** 是否发生过本地读取（浮球绿点标识，once 语义） */
export const persistReadSeen = ref(false)

function recordRead(method: PersistReadMethod, detail: string, rows: number, ms: number, sqlMs?: number): void {
  persistReadCounts.value[method] += 1
  persistReadSeen.value = true
  persistReadActivities.value = [
    { method, at: Date.now(), rows, ms, sqlMs, detail },
    ...persistReadActivities.value.slice(0, READ_ACTIVITY_MAX - 1),
  ]
}

/**
 * 包装 repository 读方法：记录 { method, at, rows, ms, sqlMs }，异常记 rows=-1 后原样上抛。
 * ms 为渲染侧墙钟（含 IPC 往返），sqlMs 为主进程 SQL 耗时（旧壳未回包时缺省）。
 */
async function trackedRead<T extends { list: unknown[] }>(
  method: PersistReadMethod,
  detail: string,
  fn: () => Promise<T | TimedReadEnvelope<T>>,
): Promise<T> {
  const start = Date.now()
  try {
    const { page, sqlMs } = unwrapTimedRead(await fn())
    const ms = Date.now() - start
    recordRead(method, detail, page.list.length, ms, sqlMs)
    // harness 埋点日志（no-console 只允许 warn/error）
    console.warn(`[persist] ${method} ${detail} → ${page.list.length} 条 · 墙钟 ${ms}ms${sqlMs !== undefined ? ` / SQL ${sqlMs}ms` : ''}`)
    return page
  }
  catch (error) {
    const ms = Date.now() - start
    recordRead(method, detail, -1, ms)
    console.warn(`[persist] ${method} ${detail} → 异常 · 墙钟 ${ms}ms`, error)
    throw error
  }
}

/** 构造 hooks / repository 的 IPC 代理对象（方法签名与契约一致，通道名见主进程 CHANNELS） */
function buildInjection(): ElectronPersistInjection {
  const persistence: SdkPersistenceHooks = {
    message: {
      saveMessage: record => invokeHook('hooks.message.saveMessage', record),
      saveMessages: records => invokeHook('hooks.message.saveMessages', records),
      updateMessageStatus: (msgId, status) => invokeHook('hooks.message.updateMessageStatus', msgId, status),
      markMessageRecalled: (msgId, operatorId) => invokeHook('hooks.message.markMessageRecalled', msgId, operatorId),
      updateMessageContent: (msgId, body, ext, modifiedInfo) =>
        invokeHook('hooks.message.updateMessageContent', msgId, body, ext, modifiedInfo),
      deleteMessages: msgIds => invokeHook('hooks.message.deleteMessages', msgIds),
      updateMessagePinned: (msgId, pinnedTime) => invokeHook('hooks.message.updateMessagePinned', msgId, pinnedTime),
    },
    conversation: {
      saveConversations: records => invokeHook('hooks.conversation.saveConversations', records),
      removeConversations: (ids, opts) => invokeHook('hooks.conversation.removeConversations', ids, opts),
    },
  }
  const repositories: SdkRepositoryOverrides = {
    message: {
      loadMessages: (conversationId, conversationType, cursor, pageSize) =>
        trackedRead('loadMessages', conversationId, () =>
          invoke<MessagePage>('repository.loadMessages', conversationId, conversationType, cursor, pageSize)),
      searchMessages: (params: MessageSearchParams) =>
        trackedRead('searchMessages', `"${params.keyword}"${params.conversationId ? ` @ ${params.conversationId}` : ''}`, () =>
          invoke<MessagePage>('repository.searchMessages', params)),
    },
    conversation: {
      fetchConversations: (cursor, pageSize, filter) =>
        trackedRead('fetchConversations', cursor ? '翻页' : '首页', () =>
          invoke<ConversationPage>('repository.fetchConversations', cursor, pageSize, filter)),
      searchConversations: params =>
        trackedRead('searchConversations', `"${params.keyword}"`, () =>
          invoke<ConversationPage>('repository.searchConversations', params)),
      // 总未读聚合：标量高频调用（300ms 防抖重查），不进读取活动追踪，避免刷屏
      getTotalUnreadCount: () => invoke<number>('repository.getTotalUnreadCount'),
    },
  }
  return { persistence, repositories }
}

/**
 * 登录前准备：Electron 持久化开关开启时，经 IPC 让主进程打开 `uikit_<appKey>_<userId>.db`，
 * 并构建（一次性）IPC 代理注入产物。切账号时主进程侧自动 close 旧库。
 */
export async function prepareElectronPersist(appKey: string, userId: string): Promise<void> {
  if (!electronPersistEnabled.value || !window.uikitPersist)
    return
  if (currentAccount && (currentAccount.appKey !== appKey || currentAccount.userId !== userId))
    await window.uikitPersist.close()
  await window.uikitPersist.init({ appKey, userId })
  currentAccount = { appKey, userId }
  if (!injection)
    injection = buildInjection()
}

/** init 配置组装处读取注入产物（未开启 / 未登录前为 null） */
export function getElectronPersistInjection(): ElectronPersistInjection | null {
  return injection
}

/* ==================== 测试面板动作（仅 Electron 模式面板可见） ==================== */

/** 库统计（getStorageStats） */
export function electronPersistStats(): Promise<unknown> {
  return invoke('manage.getStorageStats')
}

/** 清空全部（clearAll + 水位线） */
export function electronPersistClearAll(): Promise<unknown> {
  return invoke('manage.clearAll')
}

/** 删库重开（主进程删 userData 下库文件含 -wal/-shm 侧车后重载页面，登录页重新登录开库） */
export function electronPersistDeleteDbAndRelaunch(): Promise<void> {
  return window.uikitPersist?.deleteDbAndRelaunch() ?? Promise.resolve()
}

/** 断网模拟（断开 SDK）：true 断网 / false 恢复 */
export function electronSetOffline(offline: boolean): Promise<void> {
  return window.demoShell?.setOffline(offline) ?? Promise.resolve()
}

/** 灌数中文样本（轮换拼接序号，灌完可直接验证中文 FTS 搜索） */
const SEED_TEXT_SAMPLES = [
  '明天下午开会讨论方案',
  '这个项目的需求文档已经更新',
  '周五之前把设计稿评审完',
  '服务端的漫游接口需要联调',
  '本地搜索的性能验收标准是五百毫秒',
  '群公告记得同步给新成员',
  '数据库迁移脚本今天跑一遍',
  '客户反馈的问题已记录到工单',
  '下周的版本计划排一下优先级',
  '附件离线下载功能开始验收',
]

/** 灌数分批大小（避免单次巨型 IPC） */
const SEED_BATCH_SIZE = 500

/**
 * 灌测试消息：分批调 hooks.saveMessages 造数据（每批 500 条，批间让出事件循环）。
 * 内容轮换中文样本 + 序号，用于「翻页穿内存」「中文 FTS 搜索」
 * 「10 万级全局搜索 P95 < 500ms」等验收路径的数据准备。
 * onProgress 回传（已写入, 总数）；返回总耗时 ms。
 */
export async function electronPersistSeedMessages(
  conversationId: string,
  conversationType: ConversationTypeValue,
  count: number,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const start = Date.now()
  let written = 0
  while (written < count) {
    const batchSize = Math.min(SEED_BATCH_SIZE, count - written)
    const batchBase = written
    const records: MessageRecord[] = Array.from({ length: batchSize }, (_, i) => {
      const seq = batchBase + i
      return {
        msgServerId: `seed-${start}-${seq}`,
        msgLocalId: `seed-local-${start}-${seq}`,
        from: 'seed-bot',
        to: currentAccount?.userId ?? 'me',
        sender: { userId: 'seed-bot', nickname: '灌数机器人' },
        conversationId,
        conversationType,
        type: MESSAGE_TYPE.TEXT,
        sendStatus: MESSAGE_STATUS.SENT,
        ext: {},
        timestamp: start - (count - seq) * 1000,
        body: { content: `${SEED_TEXT_SAMPLES[seq % SEED_TEXT_SAMPLES.length]}（第 ${seq + 1} 条）` },
      }
    })
    await invoke('hooks.message.saveMessages', records)
    written += batchSize
    onProgress?.(written, count)
    // 批间让出事件循环，避免长链路 IPC 阻塞渲染
    if (written < count)
      await new Promise(resolve => setTimeout(resolve, 0))
  }
  return Date.now() - start
}

/** 灌会话中文名称样本（轮换 + 序号） */
const SEED_CONVERSATION_NAMES = [
  '产品讨论组',
  '技术分享群',
  '张三',
  '李四',
  '需求评审群',
  '王五',
  '客户支持群',
  '前端周报群',
  '赵六',
  '版本发布群',
]

/** 灌会话分批大小（避免单次巨型 IPC） */
const SEED_CONVERSATION_BATCH_SIZE = 200

/**
 * 灌测试会话：分批调 hooks.conversation.saveConversations 造数据（每批 200 条，
 * 批间让出事件循环）。中文名称轮换、type 混合 singleChat/groupChat、
 * lastMessageTime 递减保证排序分布真实；少量置顶（97 取 1）、少量未读（17 取 1）、
 * 少量带草稿（31 取 1）。不灌消息体——lastMessage* 字段已够列表渲染。
 * 用于大会话量场景的桌面端渲染压测。onProgress 回传（已写入, 总数）；返回总耗时 ms。
 */
export async function electronPersistSeedConversations(
  count: number,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const start = Date.now()
  let written = 0
  while (written < count) {
    const batchSize = Math.min(SEED_CONVERSATION_BATCH_SIZE, count - written)
    const batchBase = written
    const records: UiConversation[] = Array.from({ length: batchSize }, (_, i) => {
      const seq = batchBase + i
      const isGroup = seq % 3 === 0
      const pinned = seq % 97 === 0
      const record: UiConversation = {
        id: `seed-cvs-${start}-${seq}`,
        name: `${SEED_CONVERSATION_NAMES[seq % SEED_CONVERSATION_NAMES.length]} ${seq + 1}`,
        type: isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT,
        unreadCount: seq % 17 === 0 ? (seq % 9) + 1 : 0,
        lastMessageText: `${SEED_TEXT_SAMPLES[seq % SEED_TEXT_SAMPLES.length]}（第 ${seq + 1} 条）`,
        lastMessageFrom: 'seed-bot',
        lastMessageTime: start - seq * 60000,
        isPinned: pinned,
        pinnedTime: pinned ? start - seq * 1000 : undefined,
        isMuted: false,
        marks: [],
        draft: seq % 31 === 0 ? `草稿：待发送的内容 ${seq + 1}` : undefined,
        draftTime: seq % 31 === 0 ? start - seq * 30000 : undefined,
      }
      return record
    })
    await invoke('hooks.conversation.saveConversations', records)
    written += batchSize
    onProgress?.(written, count)
    // 批间让出事件循环，避免长链路 IPC 阻塞渲染
    if (written < count)
      await new Promise(resolve => setTimeout(resolve, 0))
  }
  return Date.now() - start
}

/* ==================== 数据风暴模拟器 ====================
 * 复刻真实链路「SDK onMessage → 事件层写 store（视图跳动）+ 旁路 persistence
 * 写库」：renderer 侧双写——store.addMessage 驱动视图（会话重排序 / 未读数 /
 * lastMessage），hooks.message.saveMessage 经 IPC 落库。不碰网络。
 * stores 由面板组件在 setup 内 useUIKit() 取得后传入（provide/inject 只能在
 * 组件上下文调用，模块级 composable 不直接碰）。
 */

/** 风暴消息统一内容前缀（可识别可清理） */
export const STORM_CONTENT_PREFIX = '[风暴]'

/** 风暴模拟器需要的最小 store 接口（uikit-im stores 的结构子集） */
export interface StormStoresLike {
  message: {
    addMessage: (msg: UiMessage) => void
    deleteMessages: (msgIds: string[]) => void
  }
  conversation: {
    conversationList: UiConversation[]
    updateConversation: (id: string, patch: Partial<UiConversation>) => void
  }
}

/** 持续风暴运行态（面板展示用） */
export const stormRunning = ref(false)
/** 启动爆发进行中（互斥禁用用） */
export const stormBursting = ref(false)
/** 本次风暴已发计数 */
export const stormSentCount = ref(0)

let stormTimer: ReturnType<typeof setInterval> | null = null
let stormStopTimer: ReturnType<typeof setTimeout> | null = null
let stormSeq = 0
/** 本会话内已双写 DB 的风暴消息 msgLocalId（清理用；重开后不追踪，见 cleanup 注释） */
const stormMsgLocalIds: string[] = []

/** 构造一条风暴消息（UiMessage 写视图 + MessageRecord 落库共源） */
function makeStormMessage(cvs: UiConversation): { uiMsg: UiMessage, record: MessageRecord } {
  const seq = ++stormSeq
  const now = Date.now()
  const msgLocalId = `local_storm_${now}_${seq}`
  const content = `${STORM_CONTENT_PREFIX}${SEED_TEXT_SAMPLES[seq % SEED_TEXT_SAMPLES.length]}（#${seq}）`
  const base = {
    msgServerId: '',
    msgLocalId,
    from: 'storm-bot',
    to: currentAccount?.userId ?? 'me',
    sender: { userId: 'storm-bot', nickname: '风暴机器人' },
    conversationId: cvs.id,
    conversationType: cvs.type as ConversationTypeValue,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: now,
    body: { content },
  }
  return {
    uiMsg: { ...base, isSelf: false, status: MESSAGE_STATUS.SENT } as unknown as UiMessage,
    record: base as unknown as MessageRecord,
  }
}

/** 单条双写：store（视图）+ hooks（IPC 落库，fire-and-forget） */
function stormWriteOne(stores: StormStoresLike, cvs: UiConversation): void {
  const { uiMsg, record } = makeStormMessage(cvs)
  // 视图侧：消息入 store + 会话摘要 / 未读数 / 时间戳更新（驱动列表重排序）
  stores.message.addMessage(uiMsg)
  stores.conversation.updateConversation(cvs.id, {
    lastMessageText: (uiMsg.body as { content: string }).content,
    lastMessageTime: uiMsg.timestamp,
    unreadCount: (cvs.unreadCount ?? 0) + 1,
  })
  // 落库侧：msgLocalId 带 local_storm_ 前缀便于识别与清理；经 hooks.saveMessage
  // 走普通接收消息的落库路径（isLocal=0，loadMessages 正常读回），不是本地插入语义
  stormMsgLocalIds.push(record.msgLocalId)
  void invoke('hooks.message.saveMessage', record)
}

/** 从 store 会话列表随机取一个（列表为空返回 null） */
function pickStormConversation(stores: StormStoresLike): UiConversation | null {
  const list = stores.conversation.conversationList
  if (!list || list.length === 0)
    return null
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * 持续风暴：每 intervalMs 往随机会话双写一条模拟消息，durationS 后自动停止。
 * 会话列表为空时报错（提示先灌会话）。返回停止函数。
 * 注：只写 store 里已有的会话；只存在于 DB 而未进内存的会话不选取——
 * 那条链路「只写库、视图不跳」是符合预期的（视图变化本来就该由 store 驱动）。
 */
export function electronStormStart(
  stores: StormStoresLike,
  opts: { intervalMs?: number, durationS?: number } = {},
): () => void {
  if (stormRunning.value)
    return electronStormStop
  if (!stores.conversation.conversationList?.length)
    throw new Error('会话列表为空，请先「灌会话」')

  const intervalMs = opts.intervalMs ?? 200
  const durationS = opts.durationS ?? 30
  stormRunning.value = true
  stormSentCount.value = 0
  stormTimer = setInterval(() => {
    const cvs = pickStormConversation(stores)
    if (!cvs) {
      electronStormStop()
      return
    }
    stormWriteOne(stores, cvs)
    stormSentCount.value += 1
  }, intervalMs)
  stormStopTimer = setTimeout(electronStormStop, durationS * 1000)
  return electronStormStop
}

/** 手动停止持续风暴 */
export function electronStormStop(): void {
  if (stormTimer !== null) {
    clearInterval(stormTimer)
    stormTimer = null
  }
  if (stormStopTimer !== null) {
    clearTimeout(stormStopTimer)
    stormStopTimer = null
  }
  stormRunning.value = false
}

/**
 * 启动爆发：tight loop 一次性双发 count 条（模拟离线重连后的同步风暴），
 * 每 200 条让出一次事件循环（万级量级下渲染与 IPC 都不卡死）。
 * onProgress 回传（已发, 总数）；返回 { count, elapsedMs }。
 */
export async function electronStormBurst(
  stores: StormStoresLike,
  count = 500,
  onProgress?: (done: number, total: number) => void,
): Promise<{ count: number, elapsedMs: number }> {
  if (!stores.conversation.conversationList?.length)
    throw new Error('会话列表为空，请先「灌会话」')
  stormBursting.value = true
  const start = Date.now()
  let done = 0
  try {
    for (let i = 0; i < count; i++) {
      const cvs = pickStormConversation(stores)
      if (!cvs)
        break
      stormWriteOne(stores, cvs)
      stormSentCount.value += 1
      done += 1
      if (done % 200 === 0) {
        onProgress?.(done, count)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    onProgress?.(done, count)
    return { count: done, elapsedMs: Date.now() - start }
  }
  finally {
    stormBursting.value = false
  }
}

/**
 * 清理风暴消息：store 侧删除 + DB 侧墓碑（hooks.deleteMessages 置 deleted +
 * 撤 FTS 行，loadMessages 不再返回——视图与后续启动都不可见）。
 * 选墓碑而非物理删：现有管理 API 的 clearMessages 只支持 before/type/conversationId
 * 过滤，不支持按 ID 前缀物理删；墓碑语义对已双写进库的风暴数据足够且最简。
 * 局限（注释在案）：只覆盖本会话内追踪到的 msgLocalId；重开后遗留的风暴行
 * 由「清空全部」（clearAll）兜底物理清。
 */
export async function electronStormCleanup(stores: StormStoresLike): Promise<number> {
  const ids = stormMsgLocalIds.splice(0)
  if (ids.length === 0)
    return 0
  stores.message.deleteMessages(ids)
  await invoke('hooks.message.deleteMessages', ids)
  return ids.length
}
