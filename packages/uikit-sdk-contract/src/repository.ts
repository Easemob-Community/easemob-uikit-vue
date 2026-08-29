import type { ConversationTypeValue } from './constants'
import type { SdkMessage, UiContact, UiConversation, UiGroup, UiPresence } from './types'

/** 消息历史分页结果（统一游标语义：cursor 空拉第一页；返回 list + cursor + hasMore） */
export interface MessagePage {
  list: SdkMessage[]
  cursor?: string
  hasMore: boolean
}

/** 会话列表分页结果 */
export interface ConversationPage {
  list: UiConversation[]
  cursor?: string
  hasMore: boolean
}

/** 群消息已读回执用户条目 */
export interface GroupReadReceiptUser {
  userId: string
  readTime?: number
}

/** 群消息已读回执分页结果 */
export interface GroupReadReceiptPage {
  list: GroupReadReceiptUser[]
  cursor?: string
  hasMore: boolean
}

/**
 * 消息数据入口（读写一体）。
 * 读操作在 Phase 1 落地；写/操作面在 Phase 1 迁移 MessageDomain 时对照其公开方法逐项落地
 * （sendText/sendImage/sendFile/sendVoice/sendVideo/sendLocation/sendCustom/sendCmd/sendCombine/
 * recall/markMessagesRead/markConversationRead/modifyText/getGroupReadReceiptUsers 等）。
 * Phase 3 DB 接入时补：saveMessage / updateMessageStatus / recallMessage。
 */
export interface MessageRepository {
  loadMessages(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    cursor?: string
    pageSize?: number
  }): Promise<MessagePage>

  sendText(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    content: string
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendImage(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    data: File | string
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendFile(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    data: File | string
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendVoice(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    data: File | string
    duration: number
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendVideo(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    data: File | string
    duration: number
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendLocation(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    latitude: number
    longitude: number
    address?: string
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendCustom(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    event: string
    customParams?: Record<string, unknown>
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendCmd(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    action: string
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  sendCombine(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    title: string
    summary: string
    messageList: SdkMessage[]
    ext?: Record<string, unknown>
    needReadReceipt?: boolean
  }): Promise<SdkMessage>

  recall(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageId: string
  }): Promise<void>

  markMessagesRead(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageIds: string[]
  }): Promise<void>

  markConversationRead(params: {
    conversationId: string
    conversationType: ConversationTypeValue
  }): Promise<void>

  modifyText(params: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageId: string
    text: string
  }): Promise<void>

  getGroupReadReceiptUsers(params: {
    groupId: string
    messageId: string
    cursor?: string
    pageSize?: number
  }): Promise<GroupReadReceiptPage>
}

/** 会话数据入口（统一游标分页语义） */
export interface ConversationRepository {
  fetchConversations(params: { cursor?: string, pageSize?: number }): Promise<ConversationPage>
}

/** 联系人数据入口（由旧 UIKitDataSource 迁移） */
export interface ContactRepository {
  // TODO：fetchContacts / fetchBlocklist / addContact / searchUsers —— 由旧 UIKitDataSource 迁移
}

/** 群组数据入口（由旧 UIKitDataSource 迁移） */
export interface GroupRepository {
  // TODO：fetchGroups / createGroup / fetchGroupInfo —— 由旧 UIKitDataSource 迁移
}

/** 在线状态数据入口（由旧 UIKitDataSource 迁移） */
export interface PresenceRepository {
  // TODO：fetchPresence / subscribePresence / unsubscribePresence —— 由旧 UIKitDataSource 迁移
}
