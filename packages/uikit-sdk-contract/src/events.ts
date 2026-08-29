import type { ConversationTypeValue } from './constants'
import type { SdkMessage, UiConversation } from './types'

/** 中立连接状态 */
export type ConnectState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'reconnectFailed'

/** 已读/送达回执事件载荷 */
export interface ReceiptEventPayload {
  conversationId: string
  conversationType: ConversationTypeValue
  messageIds: string[]
  timestamp: number
}

/**
 * 中立事件集：uikit-im 订阅它写 store；adapter 把 SDK 事件翻译成这些再回调。
 * 全部回调均为可选，adapter 按能力派发。
 */
export interface SdkEventHandlers {
  onConnectStateChange?: (state: ConnectState) => void
  onTokenWillExpire?: () => void
  onTokenExpired?: () => void
  onMessage?: (msg: SdkMessage) => void
  onConversationChange?: (conversations: UiConversation[]) => void
  onMessageReceipts?: (receipts: ReceiptEventPayload[]) => void
  onRecall?: (payload: { messageId: string, conversationId: string, conversationType: ConversationTypeValue }) => void
  onMessageUpdated?: (msg: SdkMessage) => void
  // TODO：onPresenceChanged / onContactChanged / onGroupChanged / onPinnedMessageChanged 等按需补齐
}
