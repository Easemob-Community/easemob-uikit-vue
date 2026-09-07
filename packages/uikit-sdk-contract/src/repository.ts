import type { ConversationTypeValue } from './constants'
import type {
  CreateGroupParams,
  SdkMessage,
  UiContact,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiPresence,
  UserInfo,
  UserInfoAttribute,
  UserInfoAttributeValue,
} from './types'

/**
 * 数据入口层（repository）接口：读写一体、游标分页、可注入替换。
 *
 * 签名风格约定（与 domains.ts 共用一套，2026-08-31 契约层质量整改收敛）：
 * - 统一位置参数，与 `SdkMessageDomain` 等既有公开方法保持一致；
 * - 分页返回统一为 `{ list, cursor?, hasMore }`（cursor 空拉第一页，hasMore 必填）。
 */

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

/**
 * 群组分页结果
 * 当前 SDK 本地群列表无游标分页，adapter 返回 `hasMore: false`。
 */
export interface GroupPage {
  list: UiGroup[]
  cursor?: string
  hasMore: boolean
}

/** 群成员分页结果 */
export interface GroupMemberPage {
  list: UiGroupMember[]
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
 * 消息搜索参数（统一游标语义：cursor 空查第一页）。
 * `conversationId` 提供时会话内搜索强制缩圈（性能口径，见分页设计）；
 * Message search params: cursor empty = first page; `conversationId` narrows
 * the search to a single conversation.
 */
export interface MessageSearchParams {
  /** 搜索关键词 */
  keyword: string
  /** 会话内搜索缩圈（缺省为全局搜索） */
  conversationId?: string
  /** 会话类型过滤（通常与 conversationId 配套） */
  conversationType?: ConversationTypeValue
  /** 分页游标（上一页返回的 cursor） */
  cursor?: string
  /** 每页条数 */
  pageSize?: number
}

/**
 * 会话搜索参数（统一游标语义：cursor 空查第一页）。
 */
export interface ConversationSearchParams {
  /** 搜索关键词（匹配会话名 / 用户昵称） */
  keyword: string
  /** 会话类型过滤 */
  conversationType?: ConversationTypeValue
  /** 分页游标（上一页返回的 cursor） */
  cursor?: string
  /** 每页条数 */
  pageSize?: number
}

/**
 * 会话列表过滤条件（fetchConversations 第三参，可选下推）。
 * 实现方可选：本地库实现下推 SQL；无过滤能力的数据源可忽略该参数
 * （UI 侧维持内存过滤兜底）。
 * Conversation list filter (optional push-down). Implementations may ignore it;
 * `atMe` = conversations containing messages @-mentioning the current user,
 * which requires the implementation to index message ext (`em_at_list`).
 */
export interface ConversationListFilter {
  /** 会话类型过滤 */
  type?: ConversationTypeValue
  /** 仅未读（unreadCount > 0） */
  unreadOnly?: boolean
  /** 仅含 @当前用户消息的会话（依赖实现方对消息 ext 的索引能力） */
  atMe?: boolean
}

/**
 * 消息数据入口（读写一体）。
 */
export interface MessageRepository {
  loadMessages: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    cursor?: string,
    pageSize?: number,
  ) => Promise<MessagePage>

  sendText: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    content: string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendImage: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendFile: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendVoice: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendVideo: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendLocation: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    latitude: number,
    longitude: number,
    address?: string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendCustom: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    event: string,
    customParams?: Record<string, unknown>,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendCmd: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    action: string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  sendCombine: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    title: string,
    summary: string,
    messageList: SdkMessage[],
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) => Promise<SdkMessage>

  recall: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) => Promise<void>

  markMessagesRead: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageIds: string[],
  ) => Promise<void>

  markConversationRead: (
    conversationId: string,
    conversationType: ConversationTypeValue,
  ) => Promise<void>

  modifyText: (
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
    text: string,
  ) => Promise<void>

  getGroupReadReceiptUsers: (
    groupId: string,
    messageId: string,
    cursor?: string,
    pageSize?: number,
  ) => Promise<GroupReadReceiptPage>

  /**
   * 消息全文搜索（可选实现）。
   * 实现方可选：本地库实现走 FTS 全文索引；SDK 漫游实现可不提供
   * （调用方需先判空再使用）。返回统一 `MessagePage` 游标分页，无实时 COUNT。
   * Optional full-text message search. Local-store implementations use an FTS
   * index; roaming-only implementations may omit it (callers must null-check).
   */
  searchMessages?: (params: MessageSearchParams) => Promise<MessagePage>
}

/** 会话数据入口（统一游标分页语义） */
export interface ConversationRepository {
  /**
   * 会话分页拉取。`filter` 为可选下推过滤（实现方可选；无过滤能力的数据源
   * 可忽略该参数，调用方需有内存过滤兜底）。
   * `filter` is an optional push-down (implementations may ignore it).
   */
  fetchConversations: (cursor?: string, pageSize?: number, filter?: ConversationListFilter) => Promise<ConversationPage>

  /**
   * 会话搜索（可选实现）：匹配会话名 / 用户昵称。
   * 实现方可选：本地库实现走小表 LIKE（量级小无需 FTS）；
   * SDK 漫游实现可不提供（调用方需先判空再使用）。
   * Optional conversation search by name/nickname. Local-store implementations
   * use LIKE over small tables; roaming-only implementations may omit it.
   */
  searchConversations?: (params: ConversationSearchParams) => Promise<ConversationPage>

  /**
   * 全量总未读数聚合（可选实现）：分页接管场景替代内存求和
   * （内存求和只覆盖已加载页，分页场景下偏低）。
   * 口径：排除免打扰（isMuted）会话，与 UIKit 既有内存求和口径一致。
   * Total unread count across ALL conversations (optional): replaces in-memory
   * summation under paginated data sources. Muted conversations are excluded,
   * matching UIKit's existing in-memory semantics.
   */
  getTotalUnreadCount?: () => Promise<number>
}

/**
 * 数据入口接管注入：六域均可按方法粒度覆盖（Partial）。
 * 当前 adapter Domain 实际消费：message.loadMessages（fetchHistory 委托）、
 * conversation.fetchConversations（refresh 委托）、contact.fetchContacts /
 * fetchBlocklist / addContact、group.fetchGroups / createGroup、
 * presence.subscribe / unsubscribe / fetchStatus、userInfo.fetchUserInfos；
 * 其余方法为后续 DB 阶段预留。写操作默认不接管，addContact / createGroup
 * 为兼容旧 dataSource 动作接管语义的例外。
 * Repository override injection: all six domains accept method-level overrides.
 * Consumed today by adapter Domains: message.loadMessages, conversation.fetchConversations,
 * contact.fetchContacts/fetchBlocklist/addContact, group.fetchGroups/createGroup,
 * presence.subscribe/unsubscribe/fetchStatus, userInfo.fetchUserInfos; the rest are
 * reserved for later DB phases.
 */
export interface SdkRepositoryOverrides {
  message?: Partial<MessageRepository>
  conversation?: Partial<ConversationRepository>
  contact?: Partial<ContactRepository>
  group?: Partial<GroupRepository>
  presence?: Partial<PresenceRepository>
  userInfo?: Partial<UserInfoRepository>
}

/** 联系人数据入口 */
export interface ContactRepository {
  fetchContacts: (cursor?: string, pageSize?: number) => Promise<ContactPage>
  fetchBlocklist: () => Promise<UiContact[]>
  addContact: (userId: string, message?: string) => Promise<void>
  deleteContact: (userId: string) => Promise<void>
  setRemark: (userId: string, remark: string) => Promise<void>
  addToBlocklist: (userIds: string[]) => Promise<void>
  removeFromBlocklist: (userIds: string[]) => Promise<void>
}

/** 群组数据入口 */
export interface GroupRepository {
  /**
   * 获取群组列表；SDK 本地群列表无游标分页，adapter 默认实现忽略分页参数、
   * 返回单页 `GroupPage`（hasMore=false）。注入的业务/本地源可按 cursor 分页。
   */
  fetchGroups: (cursor?: string, pageSize?: number) => Promise<GroupPage>
  fetchGroupInfo: (groupId: string) => Promise<UiGroup>
  createGroup: (params: CreateGroupParams) => Promise<{ groupId: string }>
  joinGroup: (groupId: string, message?: string) => Promise<void>
  leaveGroup: (groupId: string) => Promise<void>
  destroyGroup: (groupId: string) => Promise<void>
  fetchGroupMembers: (
    groupId: string,
    cursor?: string,
    pageSize?: number,
  ) => Promise<GroupMemberPage>
  removeGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  inviteUsersToGroup: (groupId: string, userIds: string[]) => Promise<void>
  addGroupAdmin: (groupId: string, userId: string) => Promise<void>
  removeGroupAdmin: (groupId: string, userId: string) => Promise<void>
  changeGroupOwner: (groupId: string, newOwnerId: string) => Promise<void>
  updateGroupInfo: (
    groupId: string,
    input: { name?: string, description?: string, avatar?: string, ext?: string },
  ) => Promise<void>
  updateGroupConfigs: (
    groupId: string,
    input: {
      public?: boolean
      joinApprovalRequired?: boolean
      allowInvites?: boolean
      inviteNeedConfirm?: boolean
      maxMembers?: number
    },
  ) => Promise<void>
  muteAllGroupMembers: (groupId: string) => Promise<void>
  unmuteAllGroupMembers: (groupId: string) => Promise<void>
  muteGroupMembers: (groupId: string, userIds: string[], muteDuration: number) => Promise<void>
  unmuteGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  updateGroupAnnouncement: (groupId: string, announcement: string) => Promise<void>
  acceptGroupInvitation: (groupId: string) => Promise<void>
  declineGroupInvitation: (groupId: string) => Promise<void>
  acceptGroupJoinRequest: (groupId: string, userId: string) => Promise<void>
  rejectGroupJoinRequest: (groupId: string, userId: string, reason: string) => Promise<void>
}

/** 在线状态数据入口 */
export interface PresenceRepository {
  subscribe: (userIds: string[], expiry?: number) => Promise<void>
  unsubscribe: (userIds: string[]) => Promise<void>
  fetchStatus: (userIds: string[]) => Promise<UiPresence[]>
  publish: (description: string) => Promise<void>
}

/** 用户资料数据入口 */
export interface UserInfoRepository {
  fetchUserInfos: (userIds: string[], attributes?: UserInfoAttribute[]) => Promise<UserInfo[]>
  updateOwnInfo: (input: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'mail' | 'phone' | 'gender' | 'sign' | 'birth' | 'ext'>>) => Promise<void>
  updateOwnInfoByAttribute: (attribute: UserInfoAttribute, value: UserInfoAttributeValue) => Promise<void>
  subscribeUserInfos: (userIds: string[]) => Promise<void>
  unsubscribeUsersInfo: (userIds: string[]) => Promise<void>
  getSubscribedUsers: () => Promise<readonly UserInfo[]>
}
