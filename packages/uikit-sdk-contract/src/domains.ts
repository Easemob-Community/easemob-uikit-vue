import type { ConversationTypeValue } from './constants'
import type { ContactPage, ConversationPage, ConversationSearchParams, GroupMemberPage, GroupPage } from './repository'
import type {
  CreateGroupParams,
  SdkMessage,
  UiContact,
  UiConversation,
  UiGroup,
  UiMessage,
  UserInfo,
  UserInfoAttribute,
  UserInfoAttributeValue,
} from './types'

/**
 * 中立业务域接口（Domain Port）：uikit-im / uikit-core 的 UI 层消费这些接口，
 * 具体 adapter（websdk5 / webim4）实现并透传。
 *
 * 设计说明：
 * - 这些是「现有 UI 消费面」的中立化快照，签名以 contract 类型为准；
 *   SDK 专属的返回值（翻译结果、共享文件分页等）用宽松结构兜底，后续按需收紧。
 * - 与 repository.ts 的关系：repository 是「数据入口层」（读写一体、游标分页），
 *   domain port 是「既有 UI 操作面」。UI 层先迁到 domain port，
 *   后续再按主计划收敛到 repository。
 * - 签名风格约定（与 repository.ts 共用一套，2026-08-31 契约层质量整改收敛）：
 *   统一位置参数；分页返回统一为 `{ list, cursor?, hasMore }`（hasMore 必填）。
 */

/** 消息业务域 */
export interface SdkMessageDomain {
  sendText: (conversationId: string, conversationType: ConversationTypeValue, content: string, ext?: Record<string, unknown>, needReadReceipt?: boolean) => Promise<SdkMessage>
  sendImage: (conversationId: string, conversationType: ConversationTypeValue, data: File | string, ext?: Record<string, unknown>, needReadReceipt?: boolean) => Promise<SdkMessage>
  sendFile: (conversationId: string, conversationType: ConversationTypeValue, data: File | string, ext?: Record<string, unknown>, needReadReceipt?: boolean) => Promise<SdkMessage>
  sendVoice: (conversationId: string, conversationType: ConversationTypeValue, data: File | string, duration: number, ext?: Record<string, unknown>, needReadReceipt?: boolean) => Promise<SdkMessage>
  sendVideo: (conversationId: string, conversationType: ConversationTypeValue, data: File | string, duration: number, ext?: Record<string, unknown>, needReadReceipt?: boolean) => Promise<SdkMessage>
  sendLocation: (conversationId: string, conversationType: ConversationTypeValue, latitude: number, longitude: number, address?: string, ext?: Record<string, unknown>) => Promise<SdkMessage>
  sendCustom: (conversationId: string, conversationType: ConversationTypeValue, event: string, params?: Record<string, string>, ext?: Record<string, unknown>) => Promise<SdkMessage>
  sendCmd: (conversationId: string, conversationType: ConversationTypeValue, action: string, ext?: Record<string, unknown>) => Promise<SdkMessage>
  sendCombine: (conversationId: string, conversationType: ConversationTypeValue, title: string, summary: string, compatibleText: string, messageList: readonly SdkMessage[], ext?: Record<string, unknown>) => Promise<SdkMessage>
  fetchHistory: (conversationId: string, conversationType: ConversationTypeValue, cursor?: string, pageSize?: number) => Promise<{ list: UiMessage[], cursor?: string, hasMore: boolean }>
  recall: (conversationId: string, conversationType: ConversationTypeValue, messageId: string) => Promise<void>
  /** 发送单条消息已读回执 */
  markRead: (conversationId: string, conversationType: ConversationTypeValue, messageId: string) => Promise<void>
  /** 批量发送消息已读回执 */
  markMessagesRead: (conversationId: string, conversationType: ConversationTypeValue, messageIds: string[]) => Promise<void>
  /** 补发当前会话尚未回执的接收消息 */
  sendPendingReadReceipts: (conversationId: string, conversationType: ConversationTypeValue) => Promise<void>
  modifyText: (conversationId: string, conversationType: ConversationTypeValue, messageId: string, text: string) => Promise<void>
  pinMessage: (conversationId: string, conversationType: ConversationTypeValue, messageId: string) => Promise<void>
  unpinMessage: (conversationId: string, conversationType: ConversationTypeValue, messageId: string) => Promise<void>
  getPinnedMessages: (conversationId: string, conversationType: ConversationTypeValue) => Promise<UiMessage[]>
  translateMessage: (message: SdkMessage, targetLanguages: string[]) => Promise<{ translations?: ReadonlyArray<{ text: string, to: string }> } | undefined>
  transcribeVoiceMessage: (message: SdkMessage, voiceParams?: Record<string, unknown>) => Promise<{ text?: string } | undefined>
  /** 下载并解析合并消息，返回子消息列表 */
  downloadAndParseCombineMessage: (message: SdkMessage) => Promise<readonly SdkMessage[]>
  /** 群消息已读详情（自动翻页聚合全部已读成员） */
  fetchGroupReadDetail: (groupId: string, messageId: string, pageSize?: number) => Promise<{ groupId: string, messageId: string, users: Array<{ userId: string, timestamp?: number }>, count: number }>
}

/** 会话业务域 */
export interface SdkConversationDomain {
  enter: (conversationId: string, conversationType: ConversationTypeValue) => void
  leave: () => void
  /** 从本地缓存读取会话列表并写入 store */
  syncLocal: () => UiConversation[]
  /** 主动刷新服务端会话列表，由事件回填 store */
  refresh: (includeEmpty?: boolean) => Promise<void>
  /** 加载更多会话（无分页能力的 SDK 退化为本地全量） */
  loadMore: (pageSize?: number) => Promise<void>
  /**
   * 会话搜索（可选）：仅注入数据源（本地库 / 业务源）时可用；
   * 未注入返回 null，调用方回落内存过滤。结果不写入会话 store（调用方本地持有）。
   * Conversation search (optional): only with an injected data source; returns
   * null when not injected so callers fall back to in-memory filtering.
   */
  searchConversations?: (params: ConversationSearchParams) => Promise<ConversationPage | null>
  pin: (conversationId: string, conversationType: ConversationTypeValue, pinned: boolean) => Promise<void>
  setMuted: (conversationId: string, conversationType: ConversationTypeValue, muted: boolean) => Promise<void>
  /** 清空会话未读数 */
  markRead: (conversationId: string, conversationType: ConversationTypeValue) => Promise<void>
  /** 发送 channel ack（内部有未读数守卫与节流） */
  sendChannelAck: (conversationId: string, conversationType: ConversationTypeValue) => Promise<void>
  clearChatHistory: (conversationId: string, conversationType: ConversationTypeValue, deleteRoamingMessages?: boolean) => Promise<void>
  remove: (conversationId: string, conversationType: ConversationTypeValue, deleteRoamingMessages?: boolean) => Promise<void>
  removeLocal: (conversationId: string, conversationType: ConversationTypeValue) => Promise<void>
  addMark: (conversations: Array<{ conversationId: string, conversationType: ConversationTypeValue }>, mark: number) => Promise<void>
  removeMark: (conversations: Array<{ conversationId: string, conversationType: ConversationTypeValue }>, mark: number) => Promise<void>
}

/** 联系人业务域 */
export interface SdkContactDomain {
  syncLocal: () => UiContact[]
  getLocalCount: () => number
  /**
   * 分页拉取联系人列表（数据入口读路径）：注入 contact.fetchContacts 时委托给
   * 注入实现（store 写入由消费方负责）；未注入时回落 SDK 本地全量
   * （cursor 忽略，hasMore=false）。
   */
  fetchContacts: (cursor?: string, pageSize?: number) => Promise<ContactPage>
  addContact: (userId: string, message?: string) => Promise<void>
  deleteContact: (userId: string) => Promise<void>
  setRemark: (userId: string, remark: string) => Promise<void>
  acceptInvite: (userId: string) => Promise<void>
  declineInvite: (userId: string) => Promise<void>
  syncBlocklist: () => Promise<UiContact[]>
  addToBlocklist: (userIds: string[]) => Promise<void>
  removeFromBlocklist: (userIds: string[]) => Promise<void>
}

/** 群组业务域 */
export interface SdkGroupDomain {
  syncLocal: () => UiGroup[]
  getLocalCount: () => number
  /**
   * 分页拉取已加入群组列表（数据入口读路径）：注入 group.fetchGroups 时委托给
   * 注入实现（store 写入由消费方负责）；未注入时回落 SDK 默认实现
   * （SDK 本地群列表无游标分页，cursor 忽略，hasMore=false）。
   */
  fetchGroups: (cursor?: string, pageSize?: number) => Promise<GroupPage>
  fetchGroupInfo: (groupId: string) => Promise<UiGroup>
  fetchGroupInfoList: (groupIds: string[]) => Promise<UiGroup[]>
  createGroup: (params: CreateGroupParams) => Promise<{ groupId: string }>
  joinGroup: (groupId: string, message?: string) => Promise<void>
  leaveGroup: (groupId: string) => Promise<void>
  destroyGroup: (groupId: string) => Promise<void>
  fetchGroupMembers: (groupId: string, cursor?: string, pageSize?: number) => Promise<GroupMemberPage>
  fetchGroupAnnouncement: (groupId: string) => Promise<string>
  updateGroupAnnouncement: (groupId: string, announcement: string) => Promise<void>
  changeGroupOwner: (groupId: string, newOwnerId: string) => Promise<void>
  removeGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  inviteUsersToGroup: (groupId: string, userIds: string[]) => Promise<void>
  addGroupAdmin: (groupId: string, userId: string) => Promise<void>
  removeGroupAdmin: (groupId: string, userId: string) => Promise<void>
  acceptGroupInvitation: (groupId: string) => Promise<void>
  declineGroupInvitation: (groupId: string) => Promise<void>
  acceptGroupJoinRequest: (groupId: string, userId: string) => Promise<void>
  rejectGroupJoinRequest: (groupId: string, userId: string, reason: string) => Promise<void>
  updateGroupInfo: (groupId: string, input: { name?: string, description?: string, avatar?: string, ext?: string }) => Promise<void>
  updateGroupConfigs: (groupId: string, input: { public?: boolean, joinApprovalRequired?: boolean, allowInvites?: boolean, inviteNeedConfirm?: boolean, maxMembers?: number }) => Promise<void>
  muteAllGroupMembers: (groupId: string) => Promise<void>
  unmuteAllGroupMembers: (groupId: string) => Promise<void>
  muteGroupMembers: (groupId: string, userIds: string[], muteDuration: number) => Promise<void>
  unmuteGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  getGroupMuteList: (groupId: string, pageNum?: number, pageSize?: number) => Promise<any>
  getGroupBlocklist: (groupId: string, pageNum?: number, pageSize?: number) => Promise<any>
  blockGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  unblockGroupMembers: (groupId: string, userIds: string[]) => Promise<void>
  getGroupAllowlist: (groupId: string) => Promise<any>
  addUsersToGroupAllowlist: (groupId: string, userIds: string[]) => Promise<void>
  removeUsersFromGroupAllowlist: (groupId: string, userIds: string[]) => Promise<void>
  checkIfInGroupAllowList: (groupId: string) => Promise<any>
  checkIfInGroupMuteList: (groupId: string) => Promise<any>
  getGroupSharedFileList: (groupId: string, pageNum?: number, pageSize?: number) => Promise<any>
  uploadGroupSharedFile: (groupId: string, file: File) => Promise<any>
  deleteGroupSharedFile: (groupId: string, fileId: string) => Promise<void>
  downloadGroupSharedFile: (groupId: string, fileId: string) => Promise<Blob>
}

/** 在线状态业务域 */
export interface SdkPresenceDomain {
  subscribe: (userIds: string[], expiry?: number) => Promise<unknown>
  unsubscribe: (userIds: string[]) => Promise<unknown>
  fetchStatus: (userIds: string[]) => Promise<unknown>
  publish: (description: string) => Promise<unknown>
}

/** 用户资料业务域 */
export interface SdkUserInfoDomain {
  fetchUserInfos: (userIds: string[], attributes?: UserInfoAttribute[]) => Promise<UserInfo[]>
  updateOwnInfo: (input: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'mail' | 'phone' | 'gender' | 'sign' | 'birth' | 'ext'>>) => Promise<UserInfo | undefined>
  updateOwnInfoByAttribute: (attribute: UserInfoAttribute, value: UserInfoAttributeValue) => Promise<UserInfo | undefined>
  subscribeUserInfos: (userIds: string[]) => Promise<void>
  unsubscribeUsersInfo: (userIds: string[]) => Promise<void>
  getSubscribedUsers: () => Promise<readonly UserInfo[]>
}

/** 业务域集合：adapter 对外暴露的完整操作面 */
export interface SdkDomainSet {
  readonly message: SdkMessageDomain
  readonly conversation: SdkConversationDomain
  readonly contact: SdkContactDomain
  readonly group: SdkGroupDomain
  readonly presence: SdkPresenceDomain
  readonly userInfo: SdkUserInfoDomain
}
