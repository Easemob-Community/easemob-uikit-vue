import type {
  MessageStatus,
  SdkMessage,
  UiContact,
  UiContactInvite,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiMessage,
  UiPresence,
  UserInfo,
  UserInfoAttribute,
} from '@easemob/uikit-sdk-contract'

/**
 * 事件处理器可访问的 store 最小接口集合（结构类型）。
 * 场景包（uikit-im / uikit-chatroom）传入的完整 Pinia store 只要结构兼容即可，
 * adapter 不依赖具体场景 store 定义（原 im `sdk/event/types.ts` 的 RootStores 中立化）。
 */

export interface MessageStoreLike {
  getMessages: (conversationId: string) => UiMessage[]
  addMessage: (msg: UiMessage) => void
  addSendingMessage: (localId: string, sdkMsg: SdkMessage) => void
  replaceWithSent: (localId: string, msg: UiMessage) => void
  updateUploadProgress: (localId: string, percent: number) => void
  markFailed: (localId: string, reason: string) => void
  prependMessages: (conversationId: string, msgs: UiMessage[]) => void
  updateStatusByServerId: (serverId: string, status: MessageStatus) => void
  recallMessage: (serverId: string, operatorId?: string) => void
  updateMessage: (serverId: string, msg: UiMessage) => void
  setPinnedMessages: (conversationId: string, msgs: UiMessage[]) => void
  setTranslation: (msgId: string, translation: { text: string, to: string }) => void
  setTranslating: (msgId: string, translating: boolean) => void
  setVoiceText: (msgId: string, voiceText: { text: string }) => void
  setVoiceTranscribing: (msgId: string, transcribing: boolean) => void
  clearConversationMessages: (conversationId: string) => void
  updateMessageById: (msgId: string, patch: Partial<UiMessage>) => void
  replaceMessageById: (msgId: string, msg: UiMessage) => void
  addAtMeMessage: (conversationId: string, msgId: string) => void
  updateMessageStatus: (msgId: string, status: MessageStatus) => void
  setMessagePinned: (serverId: string, info: { operatorId: string, pinTime: number }) => void
  setMessageUnpinned: (serverId: string) => void
  deleteMessages: (msgIds: string[]) => void
  setSyncingMessages: (value: boolean) => void
}

export interface ConversationStoreLike {
  conversationList: UiConversation[]
  currentConversationId: string | null
  conversationsLoaded: boolean
  setList: (list: UiConversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  setSyncing: (syncing: boolean) => void
  delete: (id: string) => void
  update: (id: string, patch: Partial<UiConversation>) => void
  setConversationList: (list: UiConversation[]) => void
  addConversation: (cvs: UiConversation) => void
  deleteConversation: (id: string) => void
  updateConversation: (id: string, patch: Partial<UiConversation>) => void
  setConversationsLoaded: (v: boolean) => void
  setSyncingConversations: (v: boolean) => void
  setTyping: (conversationId: string, userId: string) => void
  setAtMe: (conversationId: string, hasAtMe: boolean) => void
  updateUnreadCount: (id: string, count: number) => void
}

export interface ContactStoreLike {
  contactList: UiContact[]
  loaded: boolean
  setList: (list: UiContact[]) => void
  addContact: (contact: UiContact) => void
  removeContact: (userId: string) => void
  updateRemark: (userId: string, remark: string) => void
  setBlocklist: (list: UiContact[]) => void
  addInvite: (invite: UiContactInvite) => void
  removeInvite: (id: string) => void
  updateInviteStatus: (id: string, status: UiContactInvite['status']) => void
  getContact: (userId: string) => UiContact | undefined
  getInvite: (id: string) => UiContactInvite | undefined
  setContactList: (list: UiContact[]) => void
  updateContactRemark: (userId: string, remark: string) => void
}

export interface GroupStoreLike {
  groupList: UiGroup[]
  loaded: boolean
  setList: (list: UiGroup[]) => void
  addGroup: (group: UiGroup) => void
  removeGroup: (groupId: string) => void
  updateGroup: (groupId: string, patch: Partial<UiGroup>) => void
  setGroupMembers: (groupId: string, members: UiGroupMember[]) => void
  appendGroupMembers: (groupId: string, members: UiGroupMember[]) => void
  removeGroupMembers: (groupId: string, userIds: string[]) => void
  updateGroupMemberRole: (groupId: string, userId: string, role: UiGroupMember['role']) => void
  setGroupAnnouncement: (groupId: string, announcement: string) => void
  isGroupAdminSynced?: (groupId: string) => boolean
  markGroupAdminSynced?: (groupId: string) => void
  setGroupMuteList: (groupId: string, members: UiGroupMember[]) => void
  addGroupMuteMembers: (groupId: string, entries: string[] | Array<{ userId: string, muteExpire?: number, muteDuration?: number }>) => void
  removeGroupMuteMembers: (groupId: string, userIds: string[]) => void
  setGroupBlocklist: (groupId: string, members: UiGroupMember[]) => void
  addGroupBlocklistMembers: (groupId: string, userIds: string[]) => void
  removeGroupBlocklistMembers: (groupId: string, userIds: string[]) => void
  setGroupAllowlist: (groupId: string, members: UiGroupMember[]) => void
  addGroupAllowlistMembers: (groupId: string, userIds: string[]) => void
  removeGroupAllowlistMembers: (groupId: string, userIds: string[]) => void
  setGroupList: (list: UiGroup[]) => void
  getGroupById: (groupId: string) => UiGroup | undefined
  incrementMemberCount: (groupId: string, delta: number) => void
  decrementMemberCount: (groupId: string, delta: number) => void
  addGroupSharedFile: (groupId: string, file: any) => void
  removeGroupSharedFile: (groupId: string, fileId: string) => void
  getGroupJoinRequests: (groupId: string) => Array<{ applicantId?: string, applicant?: UserInfo, status?: string, [key: string]: any }>
  setGroupJoinRequests: (groupId: string, requests: Array<Record<string, any>>) => void
  updateGroupJoinRequest: (groupId: string, userId: string, status: 'pending' | 'accepted' | 'declined') => void
}

export interface PresenceStoreLike {
  updateBatch: (list: UiPresence[]) => void
  setSubscribed: (userIds: string[]) => void
}

export interface ClientStoreLike {
  currentUser: string
  client: { deleteConversationOnGroupDestroyed?: boolean } | null
  setConnected: (value: boolean) => void
  setConnecting: (value: boolean) => void
  setHasConnectedOnce: (value: boolean) => void
}

export interface UserInfoStoreLike {
  getUserInfo: (userId: string) => UserInfo | undefined
  setUserInfo: (userInfo: UserInfo) => void
  setUserInfos: (infos: UserInfo[]) => void
  areAttributesFetched: (userId: string, attributes: UserInfoAttribute[]) => boolean
  markFetchedAttributes: (userIds: string[], attributes: UserInfoAttribute[]) => void
  markLoading: (userIds: string[]) => void
  markLoaded: (userIds: string[]) => void
  markFetchFailed: (userIds: string[]) => void
  isFetchFailed: (userId: string) => boolean
  markSubscribed: (userIds: string[]) => void
  markUnsubscribed: (userIds: string[]) => void
  markSubscribeFailed: (userIds: string[]) => void
  isSubscribeFailed: (userId: string) => boolean
  isSubscribed: (userId: string) => boolean
  disableSubscription: () => void
  isSubscriptionDisabled: () => boolean
  isLoading: (userId: string) => boolean
}

/** 事件处理器可访问的 store 集合（中立最小接口） */
export interface EventStores {
  message: MessageStoreLike
  conversation: ConversationStoreLike
  contact: ContactStoreLike
  group: GroupStoreLike
  presence: PresenceStoreLike
  client: ClientStoreLike
  userInfo: UserInfoStoreLike
}
