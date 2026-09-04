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
import type {
  ConversationPage,
  MessagePage,
  MessageRecord,
  MessageSearchParams,
  SdkPersistenceHooks,
  SdkRepositoryOverrides,
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
 */
export function setElectronPersistEnabled(enabled: boolean) {
  if (electronPersistEnabled.value === enabled)
    return
  electronPersistEnabled.value = enabled
  localStorage.setItem(ELECTRON_PERSIST_STORAGE_KEY, enabled ? 'on' : 'off')
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

/** 构造 hooks / repository 的 IPC 代理对象（方法签名与契约一致，通道名见主进程 CHANNELS） */
function buildInjection(): ElectronPersistInjection {
  const persistence: SdkPersistenceHooks = {
    message: {
      saveMessage: record => invoke('hooks.message.saveMessage', record),
      saveMessages: records => invoke('hooks.message.saveMessages', records),
      updateMessageStatus: (msgId, status) => invoke('hooks.message.updateMessageStatus', msgId, status),
      markMessageRecalled: (msgId, operatorId) => invoke('hooks.message.markMessageRecalled', msgId, operatorId),
      updateMessageContent: (msgId, body, ext, modifiedInfo) =>
        invoke('hooks.message.updateMessageContent', msgId, body, ext, modifiedInfo),
      deleteMessages: msgIds => invoke('hooks.message.deleteMessages', msgIds),
      updateMessagePinned: (msgId, pinnedTime) => invoke('hooks.message.updateMessagePinned', msgId, pinnedTime),
    },
    conversation: {
      saveConversations: records => invoke('hooks.conversation.saveConversations', records),
      removeConversations: (ids, opts) => invoke('hooks.conversation.removeConversations', ids, opts),
    },
  }
  const repositories: SdkRepositoryOverrides = {
    message: {
      loadMessages: (conversationId, conversationType, cursor, pageSize) =>
        invoke<MessagePage>('repository.loadMessages', conversationId, conversationType, cursor, pageSize),
      searchMessages: (params: MessageSearchParams) =>
        invoke<MessagePage>('repository.searchMessages', params),
    },
    conversation: {
      fetchConversations: (cursor, pageSize) =>
        invoke<ConversationPage>('repository.fetchConversations', cursor, pageSize),
      searchConversations: params =>
        invoke<ConversationPage>('repository.searchConversations', params),
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

/** 删库重开（删 userData 下库文件后 relaunch） */
export function electronPersistDeleteDbAndRelaunch(): Promise<void> {
  return window.uikitPersist?.deleteDbAndRelaunch() ?? Promise.resolve()
}

/** 断网模拟（断开 SDK）：true 断网 / false 恢复 */
export function electronSetOffline(offline: boolean): Promise<void> {
  return window.demoShell?.setOffline(offline) ?? Promise.resolve()
}

/**
 * 灌测试消息：直接调 hooks.saveMessages 批量造数据（文本类型，时间戳递增）。
 * 用于「翻页穿内存」「中文搜索」等验收路径的数据准备。
 */
export async function electronPersistSeedMessages(
  conversationId: string,
  conversationType: 'singleChat' | 'groupChat',
  count: number,
): Promise<void> {
  const now = Date.now()
  const records: MessageRecord[] = Array.from({ length: count }, (_, i) => ({
    msgServerId: `seed-${now}-${i}`,
    msgLocalId: `seed-local-${now}-${i}`,
    from: 'seed-bot',
    to: currentAccount?.userId ?? 'me',
    sender: { userId: 'seed-bot', nickname: '灌数机器人' },
    conversationId,
    conversationType,
    type: 'text',
    sendStatus: 'sent',
    ext: {},
    timestamp: now - (count - i) * 1000,
    body: { content: `灌数消息 ${i + 1}：明天下午开会讨论持久化方案` },
  }))
  await invoke('hooks.message.saveMessages', records)
}
