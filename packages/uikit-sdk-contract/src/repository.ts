import type { ConversationTypeValue } from './constants'
import type {
  CreateGroupParams,
  SdkMessage,
  UiContact,
  UiContactInvite,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiPresence,
  UserInfo,
  UserInfoAttribute,
  UserInfoAttributeValue,
} from './types'

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

/** 联系人分页结果 */
export interface ContactPage {
  list: UiContact[]
  cursor?: string
  hasMore: boolean
}

/** 群消息已读回执用户条目 */
export interface GroupReadReceiptUser {
  userId: string
  timestamp?: number
}

/** 群消息已读回执分页结果 */
export interface GroupReadReceiptPage {
  list: GroupReadReceiptUser[]
  cursor?: string
  hasMore: boolean
}

/**
 * 消息数据入口（读写一体）。
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

/** 联系人数据入口 */
export interface ContactRepository {
  fetchContacts(params?: { cursor?: string, pageSize?: number }): Promise<ContactPage>
  fetchBlocklist(): Promise<UiContact[]>
  addContact(userId: string, message?: string): Promise<void>
  deleteContact(userId: string): Promise<void>
  setRemark(userId: string, remark: string): Promise<void>
  addToBlocklist(userIds: string[]): Promise<void>
  removeFromBlocklist(userIds: string[]): Promise<void>
}

/** 群组数据入口 */
export interface GroupRepository {
  fetchGroups(): Promise<UiGroup[]>
  fetchGroupInfo(groupId: string): Promise<UiGroup>
  createGroup(params: CreateGroupParams): Promise<{ groupId: string }>
  joinGroup(groupId: string, message?: string): Promise<void>
  leaveGroup(groupId: string): Promise<void>
  destroyGroup(groupId: string): Promise<void>
  fetchGroupMembers(
    groupId: string,
    cursor?: string,
    pageSize?: number,
  ): Promise<{ members: UiGroupMember[], cursor?: string, hasMore?: boolean }>
  removeGroupMembers(groupId: string, userIds: string[]): Promise<void>
  inviteUsersToGroup(groupId: string, userIds: string[]): Promise<void>
  addGroupAdmin(groupId: string, userId: string): Promise<void>
  removeGroupAdmin(groupId: string, userId: string): Promise<void>
  changeGroupOwner(groupId: string, newOwnerId: string): Promise<void>
  updateGroupInfo(
    groupId: string,
    input: { name?: string, description?: string, avatar?: string, ext?: string },
  ): Promise<void>
  updateGroupConfigs(
    groupId: string,
    input: {
      public?: boolean
      joinApprovalRequired?: boolean
      allowInvites?: boolean
      inviteNeedConfirm?: boolean
      maxMembers?: number
    },
  ): Promise<void>
  muteAllGroupMembers(groupId: string): Promise<void>
  unmuteAllGroupMembers(groupId: string): Promise<void>
  muteGroupMembers(groupId: string, userIds: string[], muteDuration: number): Promise<void>
  unmuteGroupMembers(groupId: string, userIds: string[]): Promise<void>
  updateGroupAnnouncement(groupId: string, announcement: string): Promise<void>
  acceptGroupInvitation(groupId: string): Promise<void>
  declineGroupInvitation(groupId: string): Promise<void>
  acceptGroupJoinRequest(groupId: string, userId: string): Promise<void>
  rejectGroupJoinRequest(groupId: string, userId: string, reason: string): Promise<void>
}

/** 在线状态数据入口 */
export interface PresenceRepository {
  subscribe(userIds: string[], expiry?: number): Promise<void>
  unsubscribe(userIds: string[]): Promise<void>
  fetchStatus(userIds: string[]): Promise<void>
  publish(description: string): Promise<void>
}

/** 用户资料数据入口 */
export interface UserInfoRepository {
  fetchUserInfos(userIds: string[], attributes?: UserInfoAttribute[]): Promise<void>
  updateOwnInfo(input: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'mail' | 'phone' | 'gender' | 'sign' | 'birth' | 'ext'>>): Promise<void>
  updateOwnInfoByAttribute(attribute: UserInfoAttribute, value: UserInfoAttributeValue): Promise<void>
  subscribeUserInfos(userIds: string[]): Promise<void>
  unsubscribeUsersInfo(userIds: string[]): Promise<void>
  getSubscribedUsers(): Promise<string[]>
}
