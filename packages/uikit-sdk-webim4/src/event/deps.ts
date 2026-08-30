import type { ConversationTypeValue, NoticeEventTypeValue, UserInfo } from '@easemob/uikit-sdk-contract'
import type { EventStores } from './types'

/**
 * 通知插入上下文：调用点提供事件类型/参数/默认文案。
 * 与 core 的 NoticeInsertContext 同构，避免 adapter 反向依赖 core。
 */
export interface NoticeInsertContext {
  eventType: NoticeEventTypeValue
  params: Record<string, string | number | boolean>
  defaultText: string
}

/** 通知条目输入（去 id/unreadCount，由 UIKit 侧补充） */
export interface NotificationItemInput {
  title: string
  body: string
  avatar?: string
  timestamp: number
  conversationId: string
  conversationType: ConversationTypeValue
}

/** 通知状态快照 */
export interface NotificationStateSnapshot {
  enabled: boolean
  browserEnabled: boolean
  inAppEnabled: boolean
  triggerMode: 'background' | 'always'
}

/** 通知 API（对齐 core useNotification 的返回值） */
export interface NotificationApis {
  state: { value: NotificationStateSnapshot }
  notify: (item: NotificationItemInput) => void
  notifyBrowser: (item: NotificationItemInput) => Promise<boolean>
}

export type NotificationChannel = 'browser' | 'in-app'

/**
 * 事件层依赖注入集合。
 * adapter 事件处理需要 i18n / 通知 / 系统通知插入等 UIKit 能力，
 * 但这些能力属于 UI 层，不能反向 import core/uikit-im。
 * 由 core 在注册事件处理器前注入。
 */
export interface EventHandlerDeps {
  /** i18n 翻译函数 */
  t: (key: string) => string
  /** 向指定会话插入本地系统通知 */
  insertChatNotice: (
    stores: EventStores,
    conversationId: string,
    conversationType: ConversationTypeValue,
    context: NoticeInsertContext,
  ) => void
  /** 构建群公告变更通知文案 */
  buildAnnouncementNoticeText: (announcement: string) => string
  /** 从 UserInfo 解析通知展示名 */
  resolveNoticeUserName: (user?: UserInfo | null) => string
  /** 通知状态与触发函数 */
  useNotification: () => NotificationApis
  /** 通知已投递回调 */
  emitNotificationDelivered: (item: NotificationItemInput, channel: NotificationChannel) => void
}

let _deps: EventHandlerDeps | null = null

/** 注入事件层依赖（core 调用） */
export function setEventHandlerDeps(deps: EventHandlerDeps): void {
  _deps = deps
}

/** 获取事件层依赖 */
export function getEventHandlerDeps(): EventHandlerDeps {
  if (!_deps) {
    throw new Error(
      '[UIKit] 事件层依赖未注入：请在调用 registerEventHandlers 前先执行 setEventHandlerDeps()',
    )
  }
  return _deps
}
