import { readonly, ref } from 'vue'
import type { NotificationItem } from '../components/notification/types'

/** 通知触发模式：'background' 仅页面隐藏时触发（默认）| 'always' 非当前会话即触发 */
export type NotificationTriggerMode = 'background' | 'always'

/** 通知能力配置（可由 Provider 或业务方通过 configureNotification 设置） */
export interface NotificationConfig {
  /** 总开关 */
  enabled?: boolean
  /** 浏览器系统通知开关 */
  browserEnabled?: boolean
  /** 页内右上角弹窗开关 */
  inAppEnabled?: boolean
  /** 首次通知时自动请求浏览器通知权限（默认 true） */
  autoRequestPermission?: boolean
  /** 触发模式 */
  triggerMode?: NotificationTriggerMode
}

interface NotificationState {
  /** 页内弹窗条目列表（堆叠展示） */
  list: NotificationItem[]
  /** 总开关 */
  enabled: boolean
  /** 浏览器系统通知开关 */
  browserEnabled: boolean
  /** 页内弹窗开关 */
  inAppEnabled: boolean
  /** 浏览器通知权限：'default' | 'granted' | 'denied' | 'unsupported'（不支持时） */
  permission: NotificationPermission | 'unsupported'
  /** 当前环境是否支持 Notification API */
  supported: boolean
  /** 触发模式 */
  triggerMode: NotificationTriggerMode
}

/** 同会话消息合并窗口（ms）：窗口内新消息刷新卡片内容而非新增卡片 */
const MERGE_WINDOW_MS = 3000
/** 页内弹窗自动消失时长（ms） */
const IN_APP_DURATION_MS = 5000

function detectSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

const supported = detectSupported()

const state = ref<NotificationState>({
  list: [],
  enabled: true,
  browserEnabled: true,
  inAppEnabled: true,
  permission: supported ? window.Notification.permission : 'unsupported',
  supported,
  triggerMode: 'background',
})

let autoRequestPermission = true

/** 页内弹窗自动消失定时器 */
const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** 浏览器通知点击回调（由 Provider 注册默认跳转行为） */
let clickHandler: ((item: Omit<NotificationItem, 'id' | 'unreadCount'>) => void) | null = null
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function clearTimer(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function scheduleAutoClose(id: string) {
  clearTimer(id)
  timers.set(id, setTimeout(() => {
    timers.delete(id)
    close(id)
  }, IN_APP_DURATION_MS))
}

/**
 * 入列一条页内通知。
 * 同会话且在上次消息 3s 窗口内时，合并刷新该条内容并累加 unreadCount，不新增卡片。
 * @returns 通知条目 ID（合并时返回既有 ID）
 */
function notify(item: Omit<NotificationItem, 'id' | 'unreadCount'>): string {
  const now = Date.now()
  const existingIndex = state.value.list.findIndex(
    it => it.conversationId === item.conversationId && now - it.timestamp < MERGE_WINDOW_MS,
  )
  if (existingIndex > -1) {
    const existing = state.value.list[existingIndex]
    state.value.list[existingIndex] = {
      ...existing,
      title: item.title,
      body: item.body,
      avatar: item.avatar ?? existing.avatar,
      timestamp: item.timestamp,
      unreadCount: existing.unreadCount + 1,
    }
    scheduleAutoClose(existing.id)
    return existing.id
  }
  const id = generateId()
  state.value.list.push({ ...item, id, unreadCount: 1 })
  scheduleAutoClose(id)
  return id
}

/** 关闭指定通知 */
function close(id: string) {
  clearTimer(id)
  state.value.list = state.value.list.filter(it => it.id !== id)
}

/** 清空全部页内通知 */
function closeAll() {
  for (const id of timers.keys())
    clearTimer(id)
  state.value.list = []
}

/** 总开关 */
function setEnabled(value: boolean) {
  state.value.enabled = value
  if (!value)
    closeAll()
}

/** 浏览器系统通知开关 */
function setBrowserEnabled(value: boolean) {
  state.value.browserEnabled = value
}

/** 页内弹窗开关 */
function setInAppEnabled(value: boolean) {
  state.value.inAppEnabled = value
  if (!value)
    closeAll()
}

/** 触发模式 */
function setTriggerMode(mode: NotificationTriggerMode) {
  state.value.triggerMode = mode
}

/** 批量应用配置（Provider / 业务方调用） */
function configureNotification(config: NotificationConfig) {
  if (config.enabled !== undefined)
    setEnabled(config.enabled)
  if (config.browserEnabled !== undefined)
    setBrowserEnabled(config.browserEnabled)
  if (config.inAppEnabled !== undefined)
    setInAppEnabled(config.inAppEnabled)
  if (config.autoRequestPermission !== undefined)
    autoRequestPermission = config.autoRequestPermission
  if (config.triggerMode !== undefined)
    setTriggerMode(config.triggerMode)
}

/** 注册浏览器通知点击回调（Provider 默认跳转会话） */
function setNotificationClickHandler(handler: ((item: Omit<NotificationItem, 'id' | 'unreadCount'>) => void) | null) {
  clickHandler = handler
}
/**
 * 请求浏览器通知权限。
 * 已授权返回 true；被拒绝/不支持返回 false；未决定时自动弹出系统授权框。
 */
async function ensureBrowserPermission(): Promise<boolean> {
  if (!state.value.supported)
    return false
  if (state.value.permission === 'granted')
    return true
  if (state.value.permission === 'denied')
    return false
  try {
    const result = await window.Notification.requestPermission()
    state.value.permission = result
    return result === 'granted'
  }
  catch {
    return false
  }
}

/**
 * 发送浏览器系统通知。
 * - 权限未决定且 autoRequestPermission 开启时自动请求；
 * - 使用 conversationId 作为 tag，同会话多条通知被浏览器原生合并替换；
 * - 点击通知：聚焦页面 + 触发已注册的 clickHandler（默认跳转会话）。
 * @returns 是否成功发出（权限被拒/不支持/异常时返回 false，由调用方降级页内弹窗）
 */
async function notifyBrowser(item: Omit<NotificationItem, 'id' | 'unreadCount'>): Promise<boolean> {
  if (!state.value.browserEnabled)
    return false
  if (!state.value.supported)
    return false
  if (!autoRequestPermission && state.value.permission === 'default')
    return false
  const granted = await ensureBrowserPermission()
  if (!granted)
    return false
  try {
    const notification = new window.Notification(item.title, {
      body: item.body,
      icon: item.avatar,
      tag: item.conversationId,
    })
    notification.onclick = () => {
      window.focus()
      clickHandler?.(item)
      notification.close()
    }
    return true
  }
  catch {
    return false
  }
}

/** 消息通知单例：状态 + 能力入口（与 use-toast 同一模式） */
export function useNotification() {
  return {
    state: readonly(state),
    notify,
    close,
    closeAll,
    setEnabled,
    setBrowserEnabled,
    setInAppEnabled,
    setTriggerMode,
    configureNotification,
    ensureBrowserPermission,
    notifyBrowser,
    setNotificationClickHandler,
  }
}
