import type { ConversationTypeValue } from './constants'
import type {
  ConnectState,
  SdkMessage,
  UiConversation,
  UiContact,
  UiContactInvite,
  UiGroup,
  UiGroupMember,
  UiPresence,
  UserInfo,
  MessageStatus,
} from './types'

/** 已读/送达回执事件载荷 */
export interface ReceiptEventPayload {
  conversationId: string
  conversationType: ConversationTypeValue
  messageIds: string[]
  timestamp: number
}

/** 消息状态变更事件载荷 */
export interface MessageStatusChangedPayload {
  messageId: string
  status: MessageStatus
}

/** 消息撤回事件载荷 */
export interface MessagesRecalledPayload {
  messageId: string
  conversationId: string
  conversationType: ConversationTypeValue
  operatorId?: string
}

/** 消息删除事件载荷 */
export interface MessagesDeletedPayload {
  messageIds: string[]
  conversationId?: string
  beforeTimestamp?: number
}

/** 会话更新事件载荷 */
export interface ConversationUpdatedPayload {
  id: string
  conversation: Partial<UiConversation>
}

/** 输入状态事件载荷 */
export interface TypingPayload {
  conversationId: string
  userId: string
}

/** @我 事件载荷 */
export interface AtMePayload {
  conversationId: string
  messageId: string
}

/** 群成员变更事件载荷 */
export interface GroupMembersChangedPayload {
  groupId: string
  members: UiGroupMember[]
}

/** 群公告变更事件载荷 */
export interface GroupAnnouncementChangedPayload {
  groupId: string
  announcement: string
}

/** 数据同步状态事件载荷 */
export interface SyncStatusPayload {
  type: 'message' | 'conversation' | 'contact' | 'group'
  status: 'syncing' | 'success' | 'failed'
  error?: {
    stage?: string
    retryable?: boolean
    message?: string
  }
}

/**
 * 中立事件集：uikit-im 订阅它写 store；adapter 把 SDK 事件翻译成这些再回调。
 * 全部回调均为可选，adapter 按能力派发。
 */
export interface SdkEventHandlers {
  // 连接与 Token
  onConnectStateChange?: (state: ConnectState) => void
  onTokenWillExpire?: () => void
  onTokenExpired?: () => void

  // 消息
  onMessage?: (msg: SdkMessage) => void
  onMessageUpdated?: (msg: SdkMessage) => void
  onMessageStatusChanged?: (payload: MessageStatusChangedPayload) => void
  onMessagesRecalled?: (payload: MessagesRecalledPayload) => void
  onMessagesDeleted?: (payload: MessagesDeletedPayload) => void

  // 会话
  onConversationChange?: (conversations: UiConversation[]) => void
  onConversationUpdated?: (payload: ConversationUpdatedPayload) => void
  onConversationDeleted?: (id: string) => void

  // 联系人 / 好友申请
  onContactChange?: (contacts: UiContact[]) => void
  onContactUpdated?: (contact: UiContact) => void
  onInviteChange?: (invites: UiContactInvite[]) => void

  // 群组
  onGroupChange?: (groups: UiGroup[]) => void
  onGroupUpdated?: (group: UiGroup) => void
  onGroupMembersChanged?: (payload: GroupMembersChangedPayload) => void
  onGroupAnnouncementChanged?: (payload: GroupAnnouncementChangedPayload) => void

  // 在线状态 / 用户资料
  onPresenceChanged?: (presence: UiPresence[]) => void
  onUserInfoChanged?: (userInfos: UserInfo[]) => void

  // 交互状态
  onTyping?: (payload: TypingPayload) => void
  onAtMe?: (payload: AtMePayload) => void

  // 同步状态
  onSyncStatus?: (payload: SyncStatusPayload) => void

  // 二期能力占位（已读回执明细、消息 reaction 等）
  onMessageReceipts?: (receipts: ReceiptEventPayload[]) => void
}
