import {
  ChatManager,
  ChatRoomManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
} from 'easemob-websdk'
import type {
  ContactRepository,
  ConversationRepository,
  ConversationTypeValue,
  GroupRepository,
  MessageRepository,
  PresenceRepository,
  SdkAdapter,
  SdkCapabilities,
  SdkConfig,
  SdkEventHandlers,
  SdkMessage,
  SdkPersistenceHooks,
  SdkRepositoryOverrides,
  UIKitDataSource,
  UIKitFeatures,
  UiContact,
  UiContactInvite,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiMessage,
  UiPresence,
  UserInfo,
  UserInfoAttribute,
  UserInfoAttributeValue,
  UserInfoRepository,
} from '@easemob/uikit-sdk-contract'
import { SDK_CONTRACT_VERSION, createLogger } from '@easemob/uikit-sdk-contract'
import type { ClientConfig, UIKitClient } from './client'
import { createClient } from './client'
import { MessageDomain } from './domain/message-domain'
import { ConversationDomain } from './domain/conversation-domain'
import { ContactDomain } from './domain/contact-domain'
import { GroupDomain } from './domain/group-domain'
import { PresenceDomain } from './domain/presence-domain'
import { UserInfoDomain } from './domain/user-info-domain'
import { registerEventHandlers } from './event/registry'
import { getEventHandlerDeps, setEventHandlerDeps } from './event/deps'
import type { EventHandlerDeps } from './event/deps'
import type { EventStores } from './event/types'
import { setSyncStatusListener } from './use-sync-status'
import { formatSdkError } from './utils/sdk-error'

const adapterLog = createLogger('UIKit:Websdk5Adapter')

/**
 * IM 场景默认 SDK manager 注册列表（不含 ChatRoomManager）。
 * 聊天室场景（chatroom 包）经 `SdkConfig.adapterConfig.managers` 透传注入
 * ChatManager/ChatRoomManager/UserInfoManager（见主计划决策 15）。
 */
export const WEBSDK5_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
]

/**
 * 聊天室场景 SDK manager 注册列表（只含 Chat/ChatRoom/UserInfo）。
 * 经 `SdkConfig.adapterConfig.managerPreset = 'chatroom'` 启用：
 * 场景包（uikit-chatroom）只传预设名，不直接 import SDK manager 类，
 * easemob-websdk 的 import 保持封在本包内。
 */
export const WEBSDK5_CHATROOM_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ChatRoomManager,
  UserInfoManager,
]

/** manager 预设名（adapterConfig.managerPreset） */
export type Websdk5ManagerPreset = 'im' | 'chatroom'

/**
 * 默认 UIKit 能力开关：adapter 独立运行或未传 features 时使用。
 * presence 默认开启（对齐 UIKit Provider 3.x 默认）：在线状态为产品化默认形态；
 * 注意订阅/查询会带来额外请求，私有化或低频场景应显式关闭。
 */
function getDefaultFeatures(): UIKitFeatures {
  return {
    enableContact: true,
    enableBlocklist: true,
    enablePresence: true,
    presenceStrangerMode: 'query-on-visible',
    fetchGroupMemberPresenceOnVisible: true,
    contactFetchMode: 'all',
    enableGroup: true,
    enableUserInfo: true,
    enableUserInfoSubscription: true,
    enableInvitePersistence: true,
    enableDraft: true,
    enableAtMe: true,
    enableTyping: true,
    filterBlockedContacts: true,
  }
}

/** 内部消息类型：SDK 消息 + UIKit 扩展字段 */
type SdkUiMessage = SdkMessage & {
  recalled?: boolean
  recalledBy?: string
  status?: string
  pinned?: boolean
  pinTime?: number
  pinOperatorId?: string
  translation?: { text: string, to: string }
  showTranslation?: boolean
  translating?: boolean
  voiceText?: { text: string }
  showVoiceText?: boolean
  voiceTranscribing?: boolean
  progress?: number
  failReason?: string
  modified?: boolean
}

/** 事件处理器引用类型 */
type HandlersRef = () => SdkEventHandlers | undefined

/**
 * 旧 dataSource 直连兼容：adapterConfig.dataSource.fetchUserInfos 收敛为
 * userInfo repository 形态（core 装配已改为 repositories 翻译注入，本路径仅供
 * 直连 adapter 的旧调用方；`SdkConfig.repositories` 注入优先）。
 * 返回类型差异（dataSource 允许部分字段）由 UserInfoDomain 的字段收敛兜底。
 */
function legacyDataSourceToUserInfoRepository(
  ds?: UIKitDataSource,
): Partial<UserInfoRepository> | undefined {
  if (!ds?.fetchUserInfos)
    return undefined
  return { fetchUserInfos: ds.fetchUserInfos as UserInfoRepository['fetchUserInfos'] }
}

/**
 * 若业务层（core/uikit-im）未注入事件层依赖，则注入一组最小兜底实现，
 * 保证 adapter 独立运行时不因 `getEventHandlerDeps()` 抛错而崩溃。
 * 真正使用通知/系统通知/i18n 时，业务层应在 subscribe 前调用 setEventHandlerDeps。
 */
function ensureEventHandlerDeps(): void {
  try {
    getEventHandlerDeps()
  }
  catch {
    adapterLog.warn('[Websdk5Adapter] 事件层依赖未注入，使用最小兜底实现')
    setEventHandlerDeps({
      t: (key: string) => key,
      insertChatNotice: () => {},
      buildAnnouncementNoticeText: (announcement: string) => announcement || '',
      resolveNoticeUserName: user => user?.nickname || user?.userId || '',
      useNotification: () => ({
        state: {
          value: {
            enabled: false,
            browserEnabled: false,
            inAppEnabled: false,
            triggerMode: 'background' as const,
          },
        },
        notify: () => {},
        notifyBrowser: async () => false,
      }),
      emitNotificationDelivered: () => {},
    })
  }
}

/** 创建连接状态 store：跟踪 connected/connecting/hasConnectedOnce 并翻译为 ConnectState */
function createClientStore(
  adapter: Websdk5Adapter,
  handlersRef: HandlersRef,
): EventStores['client'] {
  let connected = false
  let connecting = false
  let hasConnectedOnce = false
  let kicked = false

  function getConnectState(): import('@easemob/uikit-sdk-contract').ConnectState {
    if (connecting)
      return 'connecting'
    if (connected)
      return 'connected'
    if (hasConnectedOnce)
      return 'reconnectFailed'
    return 'disconnected'
  }

  function emit() {
    handlersRef()?.onConnectStateChange?.(getConnectState())
  }

  return {
    get currentUser() {
      return adapter.currentUserId || ''
    },
    get client() {
      return adapter.client
        ? { deleteConversationOnGroupDestroyed: adapter.client.deleteConversationOnGroupDestroyed }
        : null
    },
    setConnected(value: boolean) {
      connected = value
      // 重新连接成功即恢复账号态（清除被踢标记）
      if (value)
        kicked = false
      emit()
    },
    setConnecting(value: boolean) {
      connecting = value
      emit()
    },
    setHasConnectedOnce(value: boolean) {
      hasConnectedOnce = value
    },
    setKicked(_code?: number) {
      // 被踢为账号态终态（SDK 不再自动重连）：内置 store 记账，避免影响 ConnectState 翻译
      kicked = true
      emit()
    },
  }
}

/** 创建消息 store：维护会话消息列表并把写入翻译为 SdkEventHandlers */
function createMessageStore(handlersRef: HandlersRef): EventStores['message'] {
  const messages = new Map<string, SdkUiMessage[]>()
  const sending = new Map<string, SdkMessage>()
  let syncingMessages = false

  function getList(conversationId: string): UiMessage[] {
    return (messages.get(conversationId) ?? []) as UiMessage[]
  }

  function findMessage(
    msgId: string,
  ): { list: SdkUiMessage[], index: number, conversationId: string } | null {
    for (const [conversationId, list] of messages) {
      const index = list.findIndex(m => m.msgServerId === msgId || m.msgLocalId === msgId)
      if (index >= 0)
        return { list, index, conversationId }
    }
    return null
  }

  function upsertMessage(msg: UiMessage) {
    const sdkMsg = msg as SdkUiMessage
    const list = messages.get(sdkMsg.conversationId) ?? []
    const idx = list.findIndex(
      m => m.msgServerId && m.msgServerId === sdkMsg.msgServerId,
    )
    if (idx >= 0) {
      list[idx] = sdkMsg
    }
    else {
      list.push(sdkMsg)
    }
    list.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    messages.set(sdkMsg.conversationId, list)
  }

  return {
    getMessages: getList,

    addMessage(msg) {
      upsertMessage(msg)
      handlersRef()?.onMessage?.(msg as SdkMessage)
    },

    addSendingMessage(localId, sdkMsg) {
      sending.set(localId, sdkMsg)
    },

    replaceWithSent(localId, msg) {
      sending.delete(localId)
      upsertMessage(msg)
      handlersRef()?.onMessage?.(msg as SdkMessage)
    },

    updateUploadProgress(localId, percent) {
      const sdkMsg = sending.get(localId)
      if (!sdkMsg)
        return
      const found = findMessage(sdkMsg.msgLocalId || sdkMsg.msgServerId || '')
      if (found) {
        const updated = { ...found.list[found.index], progress: percent }
        found.list[found.index] = updated
      }
    },

    markFailed(localId, reason) {
      const sdkMsg = sending.get(localId)
      sending.delete(localId)
      const msgId = sdkMsg?.msgLocalId || sdkMsg?.msgServerId
      if (!msgId)
        return
      const found = findMessage(msgId)
      if (found) {
        const updated = { ...found.list[found.index], status: 'failed', failReason: reason }
        found.list[found.index] = updated
      }
    },

    prependMessages(conversationId, msgs) {
      const existing = messages.get(conversationId) ?? []
      const map = new Map<string, SdkUiMessage>()
      for (const msg of msgs) {
        const sdkMsg = msg as SdkUiMessage
        if (sdkMsg.msgServerId)
          map.set(sdkMsg.msgServerId, sdkMsg)
      }
      for (const msg of existing) {
        if (msg.msgServerId && !map.has(msg.msgServerId))
          map.set(msg.msgServerId, msg)
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
      )
      messages.set(conversationId, merged)
    },

    updateStatusByServerId(serverId, status) {
      const found = findMessage(serverId)
      if (!found)
        return
      found.list[found.index] = { ...found.list[found.index], status }
      handlersRef()?.onMessageStatusChanged?.({ messageId: serverId, status })
    },

    recallMessage(serverId, operatorId) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.recalled = true
      msg.recalledBy = operatorId
      handlersRef()?.onMessagesRecalled?.({
        messageId: serverId,
        conversationId: found.conversationId,
        conversationType: msg.conversationType as ConversationTypeValue,
        operatorId,
      })
    },

    updateMessage(serverId, msg) {
      const found = findMessage(serverId)
      if (!found)
        return
      const sdkMsg = msg as SdkUiMessage
      found.list[found.index] = sdkMsg
      if (sdkMsg.modified)
        handlersRef()?.onMessageUpdated?.(sdkMsg)
    },

    setPinnedMessages(_conversationId, _msgs) {
      // 内部缓存：事件层刷新置顶列表时写入，暂不通过事件暴露
    },

    setTranslation(msgId, translation) {
      const found = findMessage(msgId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.translation = translation
      msg.showTranslation = true
    },

    setTranslating(msgId, translating) {
      const found = findMessage(msgId)
      if (found)
        found.list[found.index] = { ...found.list[found.index], translating }
    },

    setVoiceText(msgId, voiceText) {
      const found = findMessage(msgId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.voiceText = voiceText
      msg.showVoiceText = true
    },

    setVoiceTranscribing(msgId, transcribing) {
      const found = findMessage(msgId)
      if (found)
        found.list[found.index] = { ...found.list[found.index], voiceTranscribing: transcribing }
    },

    clearConversationMessages(conversationId) {
      messages.delete(conversationId)
    },

    updateMessageById(msgId, patch) {
      const found = findMessage(msgId)
      if (!found)
        return
      const prev = found.list[found.index]
      const updated = { ...prev, ...patch } as SdkUiMessage
      found.list[found.index] = updated

      if (patch.modified || patch.modifiedInfo)
        handlersRef()?.onMessageUpdated?.(updated)

      if (patch.status && patch.status !== prev.status) {
        handlersRef()?.onMessageStatusChanged?.({
          messageId: msgId,
          status: patch.status,
        })
      }
    },

    replaceMessageById(msgId, msg) {
      const found = findMessage(msgId)
      if (!found)
        return
      const sdkMsg = msg as SdkUiMessage
      found.list[found.index] = sdkMsg
      handlersRef()?.onMessageUpdated?.(sdkMsg)
    },

    addAtMeMessage(conversationId, msgId) {
      handlersRef()?.onAtMe?.({ conversationId, messageId: msgId })
    },

    updateMessageStatus(msgId, status) {
      const found = findMessage(msgId)
      if (!found)
        return
      found.list[found.index] = { ...found.list[found.index], status }
      handlersRef()?.onMessageStatusChanged?.({ messageId: msgId, status })
    },

    setMessagePinned(serverId, info) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.pinned = true
      msg.pinTime = info.pinTime
      msg.pinOperatorId = info.operatorId
    },

    setMessageUnpinned(serverId) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.pinned = false
    },

    deleteMessages(msgIds) {
      const idSet = new Set(msgIds)
      const deletedByConversation = new Map<string, string[]>()
      for (const [conversationId, list] of messages) {
        const remaining: SdkUiMessage[] = []
        for (const m of list) {
          const id = m.msgServerId || m.msgLocalId
          if (id && idSet.has(id)) {
            const arr = deletedByConversation.get(conversationId) ?? []
            arr.push(id)
            deletedByConversation.set(conversationId, arr)
          }
          else {
            remaining.push(m)
          }
        }
        messages.set(conversationId, remaining)
      }
      for (const [conversationId, ids] of deletedByConversation) {
        handlersRef()?.onMessagesDeleted?.({ messageIds: ids, conversationId })
      }
    },

    setSyncingMessages(value) {
      if (syncingMessages === value)
        return
      syncingMessages = value
      handlersRef()?.onSyncStatus?.({
        type: 'message',
        status: value ? 'syncing' : 'success',
      })
    },
  }
}

/** 创建会话 store */
function createConversationStore(handlersRef: HandlersRef): EventStores['conversation'] {
  let conversationList: UiConversation[] = []
  let currentConversationId: string | null = null
  let conversationsLoaded = false

  function emitChange() {
    handlersRef()?.onConversationChange?.(conversationList)
  }

  return {
    get conversationList() {
      return conversationList
    },
    get currentConversationId() {
      return currentConversationId
    },
    get conversationsLoaded() {
      return conversationsLoaded
    },

    setList(list) {
      conversationList = list
      emitChange()
    },

    setCurrentConversationId(id) {
      currentConversationId = id
    },

    setSyncing(_syncing) {
      // domain 层可能调用，但同步状态事件由 setSyncStatusListener 处理
    },

    delete(id) {
      conversationList = conversationList.filter(c => c.id !== id)
      handlersRef()?.onConversationDeleted?.(id)
    },

    update(id, patch) {
      const idx = conversationList.findIndex(c => c.id === id)
      if (idx < 0)
        return
      conversationList[idx] = { ...conversationList[idx], ...patch }
      emitChange()
      handlersRef()?.onConversationUpdated?.({ id, conversation: patch })
    },

    setConversationList(list) {
      this.setList(list)
    },

    addConversation(cvs) {
      const idx = conversationList.findIndex(c => c.id === cvs.id)
      if (idx >= 0)
        conversationList[idx] = cvs
      else
        conversationList.push(cvs)
      emitChange()
    },

    deleteConversation(id) {
      this.delete(id)
    },

    updateConversation(id, patch) {
      this.update(id, patch)
    },

    setConversationsLoaded(v) {
      conversationsLoaded = v
    },

    setSyncingConversations(_v) {
      // 同步状态由 use-sync-status 监听器发出
    },

    setTyping(conversationId, userId) {
      handlersRef()?.onTyping?.({ conversationId, userId })
    },

    setAtMe(_conversationId, _hasAtMe) {
      // 具体 messageId 由 message store.addAtMeMessage 触发 onAtMe
    },

    updateUnreadCount(id, count) {
      this.update(id, { unreadCount: count })
    },
  }
}

/** 创建联系人 store */
function createContactStore(handlersRef: HandlersRef): EventStores['contact'] {
  let contactList: UiContact[] = []
  let _blocklist: UiContact[] = []
  let invites: UiContactInvite[] = []
  const loaded = false

  function emitChange() {
    handlersRef()?.onContactChange?.(contactList)
  }

  function emitInviteChange() {
    handlersRef()?.onInviteChange?.(invites)
  }

  return {
    get contactList() {
      return contactList
    },
    get loaded() {
      return loaded
    },

    setList(list) {
      contactList = list
      emitChange()
    },

    addContact(contact) {
      const idx = contactList.findIndex(c => c.userId === contact.userId)
      if (idx >= 0)
        contactList[idx] = { ...contactList[idx], ...contact }
      else
        contactList.push(contact)
      emitChange()
      handlersRef()?.onContactUpdated?.(contact)
    },

    removeContact(userId) {
      const removed = contactList.find(c => c.userId === userId)
      contactList = contactList.filter(c => c.userId !== userId)
      if (removed) {
        emitChange()
        handlersRef()?.onContactUpdated?.(removed)
      }
    },

    updateRemark(userId, remark) {
      const idx = contactList.findIndex(c => c.userId === userId)
      if (idx < 0)
        return
      contactList[idx] = { ...contactList[idx], remark, name: remark || contactList[idx].name }
      emitChange()
      handlersRef()?.onContactUpdated?.(contactList[idx])
    },

    setBlocklist(list) {
      _blocklist = list
    },

    addInvite(invite) {
      const idx = invites.findIndex(i => i.id === invite.id)
      if (idx >= 0)
        invites[idx] = { ...invites[idx], ...invite }
      else
        invites.push(invite)
      emitInviteChange()
    },

    removeInvite(id) {
      invites = invites.filter(i => i.id !== id)
      emitInviteChange()
    },

    updateInviteStatus(id, status) {
      const idx = invites.findIndex(i => i.id === id)
      if (idx < 0)
        return
      invites[idx] = { ...invites[idx], status }
      emitInviteChange()
    },

    getContact(userId) {
      return contactList.find(c => c.userId === userId)
    },

    getInvite(id) {
      return invites.find(i => i.id === id)
    },

    setContactList(list) {
      this.setList(list)
    },

    updateContactRemark(userId, remark) {
      this.updateRemark(userId, remark)
    },
  }
}

/** 创建群组 store */
function createGroupStore(handlersRef: HandlersRef): EventStores['group'] {
  let groupList: UiGroup[] = []
  const members = new Map<string, UiGroupMember[]>()
  const announcements = new Map<string, string>()
  const muteList = new Map<string, UiGroupMember[]>()
  const blocklist = new Map<string, UiGroupMember[]>()
  const allowlist = new Map<string, UiGroupMember[]>()
  const sharedFiles = new Map<string, any[]>()
  const joinRequests = new Map<string, any[]>()
  const adminSynced = new Set<string>()
  const loaded = false

  function emitChange() {
    handlersRef()?.onGroupChange?.(groupList)
  }

  return {
    get groupList() {
      return groupList
    },
    get loaded() {
      return loaded
    },

    setList(list) {
      groupList = list
      emitChange()
    },

    addGroup(group) {
      const idx = groupList.findIndex(g => g.groupId === group.groupId)
      if (idx >= 0)
        groupList[idx] = { ...groupList[idx], ...group }
      else
        groupList.push(group)
      emitChange()
      handlersRef()?.onGroupUpdated?.(group)
    },

    removeGroup(groupId) {
      const removed = groupList.find(g => g.groupId === groupId)
      groupList = groupList.filter(g => g.groupId !== groupId)
      if (removed) {
        emitChange()
        handlersRef()?.onGroupUpdated?.(removed)
      }
    },

    updateGroup(groupId, patch) {
      const idx = groupList.findIndex(g => g.groupId === groupId)
      if (idx < 0)
        return
      groupList[idx] = { ...groupList[idx], ...patch }
      emitChange()
      handlersRef()?.onGroupUpdated?.(groupList[idx])
    },

    setGroupMembers(groupId, list) {
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    appendGroupMembers(groupId, list) {
      const existing = members.get(groupId) ?? []
      const map = new Map(existing.map(m => [m.userId, m]))
      for (const m of list)
        map.set(m.userId, m)
      const merged = Array.from(map.values())
      members.set(groupId, merged)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: merged })
    },

    removeGroupMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      const list = (members.get(groupId) ?? []).filter(m => !idSet.has(m.userId))
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    updateGroupMemberRole(groupId, userId, role) {
      const list = members.get(groupId) ?? []
      const idx = list.findIndex(m => m.userId === userId)
      if (idx < 0)
        return
      list[idx] = { ...list[idx], role }
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    setGroupAnnouncement(groupId, announcement) {
      announcements.set(groupId, announcement)
      handlersRef()?.onGroupAnnouncementChanged?.({ groupId, announcement })
    },

    isGroupAdminSynced(groupId) {
      return adminSynced.has(groupId)
    },

    markGroupAdminSynced(groupId) {
      adminSynced.add(groupId)
    },

    setGroupMuteList(groupId, list) {
      muteList.set(groupId, list)
    },

    addGroupMuteMembers(groupId, entries) {
      const existing = muteList.get(groupId) ?? []
      const userIds: string[] = Array.isArray(entries) && entries.length > 0 && typeof entries[0] === 'string'
        ? entries as string[]
        : (entries as Array<{ userId: string }>).map(e => e.userId)
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      muteList.set(groupId, existing)
    },

    removeGroupMuteMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      muteList.set(groupId, (muteList.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupBlocklist(groupId, list) {
      blocklist.set(groupId, list)
    },

    addGroupBlocklistMembers(groupId, userIds) {
      const existing = blocklist.get(groupId) ?? []
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      blocklist.set(groupId, existing)
    },

    removeGroupBlocklistMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      blocklist.set(groupId, (blocklist.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupAllowlist(groupId, list) {
      allowlist.set(groupId, list)
    },

    addGroupAllowlistMembers(groupId, userIds) {
      const existing = allowlist.get(groupId) ?? []
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      allowlist.set(groupId, existing)
    },

    removeGroupAllowlistMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      allowlist.set(groupId, (allowlist.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupList(list) {
      this.setList(list)
    },

    getGroupById(groupId) {
      return groupList.find(g => g.groupId === groupId)
    },

    incrementMemberCount(groupId, delta) {
      const g = this.getGroupById(groupId)
      if (g)
        this.updateGroup(groupId, { memberCount: (g.memberCount ?? 0) + delta })
    },

    decrementMemberCount(groupId, delta) {
      const g = this.getGroupById(groupId)
      if (g)
        this.updateGroup(groupId, { memberCount: Math.max(0, (g.memberCount ?? 0) - delta) })
    },

    addGroupSharedFile(groupId, file) {
      const existing = sharedFiles.get(groupId) ?? []
      existing.push(file)
      sharedFiles.set(groupId, existing)
    },

    removeGroupSharedFile(groupId, fileId) {
      sharedFiles.set(groupId, (sharedFiles.get(groupId) ?? []).filter(f => f.fileId !== fileId))
    },

    getGroupJoinRequests(groupId) {
      return joinRequests.get(groupId) ?? []
    },

    setGroupJoinRequests(groupId, requests) {
      joinRequests.set(groupId, requests)
    },

    updateGroupJoinRequest(groupId, userId, status) {
      const list = joinRequests.get(groupId) ?? []
      const req = list.find(
        (r: any) => r.applicantId === userId || r.applicant?.userId === userId,
      )
      if (req)
        req.status = status
    },
  }
}

/** 创建在线状态 store */
function createPresenceStore(handlersRef: HandlersRef): EventStores['presence'] {
  let presenceList: UiPresence[] = []
  const subscribed = new Set<string>()

  return {
    updateBatch(list) {
      const map = new Map(presenceList.map(p => [p.userId, p]))
      for (const p of list)
        map.set(p.userId, p)
      presenceList = Array.from(map.values())
      handlersRef()?.onPresenceChanged?.(presenceList)
    },

    setSubscribed(userIds) {
      for (const id of userIds)
        subscribed.add(id)
    },
  }
}

/** 创建用户资料 store */
function createUserInfoStore(handlersRef: HandlersRef): EventStores['userInfo'] {
  const userInfos = new Map<string, UserInfo>()
  const loading = new Set<string>()
  const failed = new Set<string>()
  const subscribed = new Set<string>()
  let subscriptionDisabled = false
  const fetchedAttributes = new Map<string, Set<UserInfoAttribute>>()

  function emitChange() {
    handlersRef()?.onUserInfoChanged?.(Array.from(userInfos.values()))
  }

  return {
    getUserInfo(userId) {
      return userInfos.get(userId)
    },

    setUserInfo(info) {
      userInfos.set(info.userId, info)
      emitChange()
    },

    setUserInfos(infos) {
      for (const info of infos)
        userInfos.set(info.userId, info)
      emitChange()
    },

    areAttributesFetched(userId, attributes) {
      const fetched = fetchedAttributes.get(userId)
      if (!fetched)
        return false
      return attributes.every(a => fetched.has(a))
    },

    markFetchedAttributes(userIds, attributes) {
      for (const userId of userIds) {
        const set = fetchedAttributes.get(userId) ?? new Set<UserInfoAttribute>()
        for (const a of attributes)
          set.add(a)
        fetchedAttributes.set(userId, set)
      }
    },

    markLoading(userIds) {
      for (const id of userIds)
        loading.add(id)
    },

    markLoaded(userIds) {
      for (const id of userIds)
        loading.delete(id)
    },

    markFetchFailed(userIds) {
      for (const id of userIds)
        failed.add(id)
    },

    isFetchFailed(userId) {
      return failed.has(userId)
    },

    markSubscribed(userIds) {
      for (const id of userIds)
        subscribed.add(id)
    },

    markUnsubscribed(userIds) {
      for (const id of userIds)
        subscribed.delete(id)
    },

    markSubscribeFailed(userIds) {
      for (const id of userIds)
        failed.add(id)
    },

    isSubscribeFailed(userId) {
      return failed.has(userId)
    },

    disableSubscription() {
      subscriptionDisabled = true
    },

    isSubscriptionDisabled() {
      return subscriptionDisabled
    },

    isSubscribed(userId) {
      return subscribed.has(userId)
    },

    isLoading(userId) {
      return loading.has(userId)
    },
  }
}

/**
 * easemob-websdk@5.x 适配器。
 *
 * 生命周期所有权（主计划决策 18，单一所有者，禁止半注入）：
 * - 内置模式：UIKit 全权（本实例内部创建 client，login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（`new Websdk5Adapter(connection)`，UIKit 只订阅事件 + 借实例操作）。
 */
export class Websdk5Adapter implements SdkAdapter {
  readonly capabilities: SdkCapabilities = {
    combineMessage: true,
    pinnedMessage: true,
    streamingMessage: true,
    groupReadReceipt: true,
    // 本 adapter 遵循的契约版本（协商机制见 contract capabilities.ts）
    contractVersion: SDK_CONTRACT_VERSION,
  }

  private _client: UIKitClient | null = null
  private _domains?: {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
  }

  private _userInfoDomain?: UserInfoDomain
  private _stores?: EventStores
  private _features?: UIKitFeatures
  /** 中立事件订阅者集合（支持多方订阅，扇出派发） */
  private _handlersSet = new Set<SdkEventHandlers>()
  private _fanout?: SdkEventHandlers
  private _disposeEventHandlers?: () => void
  private _disposeSyncListener?: () => void
  /** SDK 事件处理器是否已注册（logout 后置 false，login 前重建） */
  private _eventsRegistered = false
  /** 是否注册 IM 事件套件（聊天室场景关闭，见 adapterConfig.registerImEvents） */
  private _registerImEvents = true
  /** 旁路持久化钩子（init 记账，事件处理器登出重建时仍需透传） */
  private _persistence?: SdkPersistenceHooks

  constructor(private injectedClient?: UIKitClient) {}

  /** 原生 SDK 客户端实例（UIKitClient 包装，可选） */
  get client(): UIKitClient | null {
    return this._client
  }

  /** 当前登录用户 ID（未登录时为空字符串） */
  get currentUserId(): string {
    return this._client?.currentUserId ?? ''
  }

  /** 当前连接是否就绪（Domain 层短路守卫用） */
  get isConnected(): boolean {
    return this._client?.isConnected ?? false
  }

  /** 业务域对象集合：供 uikit-im / uikit-core 直接消费既有 Domain API */
  get domains(): {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
    userInfo: UserInfoDomain
  } {
    if (!this._domains || !this._userInfoDomain)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return { ...this._domains, userInfo: this._userInfoDomain }
  }

  async init(config: SdkConfig): Promise<void> {
    const adapterCfg = (config.adapterConfig ?? {}) as Partial<ClientConfig> & {
      /** UIKit 功能开关（live 对象引用，事件层运行时读取最新值） */
      features?: UIKitFeatures
      /**
       * 旧版业务数据源接管（@deprecated，仅兼容直连 adapter 的旧调用方，
       * 且仅消费 fetchUserInfos）：core 装配已改为把 dataSource 翻译成
       * `SdkConfig.repositories` 注入；新接入请直接用 repositories。
       */
      dataSource?: UIKitDataSource
      /**
       * 事件层 store 注入：Provider 模式传入 Pinia stores（结构兼容 EventStores），
       * 事件与 Domain 直接写入业务 store；未提供的域回落到 adapter 内置 store
       *（内置 store 会把写入翻译成 SdkEventHandlers 中立事件扇出）。
       */
      stores?: Partial<EventStores>
      /** 事件层依赖（i18n / 通知 / 系统通知插入），由 core/im 在 init 时注入 */
      eventDeps?: EventHandlerDeps
      /** 用户资料订阅无权限/服务未开通回调 */
      onUserInfoSubscriptionPermissionError?: () => void
      /**
       * 是否注册 IM 事件套件（连接/消息/联系人/群/在线状态 → EventStores），默认 true。
       * 聊天室场景（无 Contact/Group/Presence/Push manager）必须显式传 false，
       * 场景事件改经 core onAdapterReady 挂钩自行注册。
       */
      registerImEvents?: boolean
      /** manager 预设：'im'（默认）| 'chatroom'；显式传 managers 数组时优先 */
      managerPreset?: Websdk5ManagerPreset
      /**
       * 数据入口接管注入（Phase 3.1 留口子）：core 归一化会把 SdkConfig.repositories
       * 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，两处都读。
       */
      repositories?: SdkRepositoryOverrides
      /**
       * 旁路持久化钩子注入（只写不读）：core 归一化会把 SdkConfig.persistence
       * 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，两处都读。
       */
      persistence?: SdkPersistenceHooks
    }
    // clientCfg 仅保留 SDK 初始化字段，剥离 features/stores/eventDeps 等 adapter 装配字段
    const {
      features,
      dataSource,
      stores: providedStores,
      eventDeps,
      onUserInfoSubscriptionPermissionError,
      registerImEvents,
      managerPreset,
      repositories: adapterRepositories,
      persistence: adapterPersistence,
      ...clientCfg
    } = adapterCfg
    // 数据入口接管：SdkConfig 顶层字段优先（直连 adapter 场景），core 归一化下沉的 adapterConfig 次之
    const repositories = config.repositories ?? adapterRepositories
    // 旁路持久化：同 repositories 读取方式（SdkConfig 顶层优先，adapterConfig 下沉次之）
    const persistence = config.persistence ?? adapterPersistence
    this._persistence = persistence

    this._client = this.injectedClient ?? createClient({
      appKey: config.appKey,
      debug: config.debug,
      managers: clientCfg.managers ?? (managerPreset === 'chatroom' ? WEBSDK5_CHATROOM_MANAGERS : WEBSDK5_MANAGERS),
      ...clientCfg,
    })

    if (eventDeps)
      setEventHandlerDeps(eventDeps)

    this._features = features ?? getDefaultFeatures()
    this._registerImEvents = registerImEvents !== false

    // 注入的 store 域：未注入的域回落 adapter 内置 store（写入经中立事件扇出）。
    // 排查「事件在跑但 UI 不更新」时先看这里——多半是对应域的 store 没注入。
    const injectedStoreDomains = providedStores ? Object.keys(providedStores) : []
    adapterLog.info('[Websdk5Adapter] init 开始', {
      mode: this.injectedClient ? 'injected-client' : 'builtin',
      managerPreset: managerPreset ?? 'im',
      registerImEvents: this._registerImEvents,
      injectedStores: injectedStoreDomains,
    })
    if (injectedStoreDomains.length < 7) {
      const allDomains = ['client', 'message', 'conversation', 'contact', 'group', 'presence', 'userInfo']
      adapterLog.debug(
        '[Websdk5Adapter] 以下 store 域未注入，回落 adapter 内置 store：',
        allDomains.filter(d => !injectedStoreDomains.includes(d)),
      )
    }

    const handlersRef = () => this._getFanout()
    const internalStores: EventStores = {
      client: createClientStore(this, handlersRef),
      message: createMessageStore(handlersRef),
      conversation: createConversationStore(handlersRef),
      contact: createContactStore(handlersRef),
      group: createGroupStore(handlersRef),
      presence: createPresenceStore(handlersRef),
      userInfo: createUserInfoStore(handlersRef),
    }
    // Provider 注入的 store 覆盖内置实现：事件层与 Domain 直接写业务 Pinia store，
    // 行为与旧 registerEventHandlers 直连模式一致；未注入的域仍走内置 store + 中立事件。
    const stores = { ...internalStores, ...(providedStores as EventStores) }
    this._stores = stores

    this._domains = {
      message: new MessageDomain(this._client, stores.message, {
        messageRepository: repositories?.message,
        persistence: persistence?.message,
      }),
      conversation: new ConversationDomain(this._client, stores.conversation, {
        sendPendingReadReceipts: (conversationId, conversationType) => {
          void this._domains?.message.sendPendingReadReceipts(conversationId, conversationType)
        },
        resolveSenderName: (userId) => {
          const contact = stores.contact.getContact(userId)
          if (contact?.remark || contact?.name)
            return contact.remark || contact.name
          return stores.userInfo.getUserInfo(userId)?.nickname
        },
        conversationRepository: repositories?.conversation,
        persistence: persistence?.conversation,
      }),
      contact: new ContactDomain(this._client, stores.contact, {
        contactRepository: repositories?.contact,
      }),
      group: new GroupDomain(this._client, stores.group, {
        groupRepository: repositories?.group,
      }),
      presence: new PresenceDomain(this._client, stores.presence, {
        presenceRepository: repositories?.presence,
      }),
    }

    // 用户资料域：内部监听 SDK 用户资料变更事件，通过 userInfo store 触发 onUserInfoChanged
    // 数据入口注入优先取 repositories.userInfo；旧 adapterConfig.dataSource 直连仅兼容兜底
    this._userInfoDomain = new UserInfoDomain(
      this._client,
      stores.userInfo,
      repositories?.userInfo ?? legacyDataSourceToUserInfoRepository(dataSource) ?? {},
      onUserInfoSubscriptionPermissionError
      ?? (() => adapterLog.warn('[Websdk5Adapter] 用户资料订阅无权限，已自动熔断')),
    )
    this._userInfoDomain.listen()

    // SDK 事件处理器随初始化注册（旧 setupClient 语义）；logout 后由 login 重建
    this._setupEventHandlers()
    adapterLog.info('[Websdk5Adapter] init 完成')
  }

  async login(user: string, token: string): Promise<void> {
    if (!this._client)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    // 登出后再登录：事件处理器与用户资料监听已在登出时 dispose，需在重新建立连接前恢复注册
    if (!this._eventsRegistered) {
      adapterLog.debug('[Websdk5Adapter] 登出后重新登录，恢复事件处理器与用户资料监听')
      this._userInfoDomain?.listen()
      this._setupEventHandlers()
    }
    adapterLog.info('[Websdk5Adapter] login 开始', { user })
    try {
      await this._client.login(user, token)
    }
    catch (err) {
      adapterLog.error('[Websdk5Adapter] login 失败:', formatSdkError(err))
      throw err
    }
    // 登录成功即记账 currentUser（注入模式下业务直连本方法、不经 core login，见决策 18）；
    // 内置 store 的 currentUser 派生自 adapter.currentUserId，无需显式 set（可选方法）
    this._stores?.client.setCurrentUser?.(user)
    adapterLog.info('[Websdk5Adapter] login 成功', { user })
  }

  async logout(): Promise<void> {
    adapterLog.info('[Websdk5Adapter] logout')
    await this._client?.logout()
    // dispose 事件处理器 / 同步状态监听 / 用户资料监听（旧 registerClientSetup 清理链）
    this._disposeEventHandlers?.()
    this._disposeEventHandlers = undefined
    this._disposeSyncListener?.()
    this._disposeSyncListener = undefined
    this._userInfoDomain?.dispose()
    this._eventsRegistered = false
  }

  /** 订阅中立事件，返回取消订阅函数（支持多方订阅，内部扇出派发） */
  subscribe(handlers: SdkEventHandlers): () => void {
    this._handlersSet.add(handlers)
    return () => {
      this._handlersSet.delete(handlers)
    }
  }

  /** 扇出派发：把同一次内部 store 写入翻译给全部订阅者 */
  private _getFanout(): SdkEventHandlers {
    if (!this._fanout) {
      const set = this._handlersSet
      this._fanout = new Proxy({} as SdkEventHandlers, {
        get: (_target, key) => (...args: unknown[]) => {
          for (const h of set) {
            const fn = (h as Record<string, unknown>)[key as string]
            if (typeof fn === 'function')
              (fn as (...a: unknown[]) => void)(...args)
          }
        },
      })
    }
    return this._fanout
  }

  private _setupEventHandlers(): void {
    if (!this._client || !this._stores)
      return
    // 聊天室等场景可关闭 IM 事件套件（manager 未注入时注册会崩），
    // 场景事件改经 core onAdapterReady 挂钩自行注册
    if (!this._registerImEvents) {
      adapterLog.debug('[Websdk5Adapter] IM 事件套件已关闭（registerImEvents=false），场景事件由业务经 onAdapterReady 自行注册')
      return
    }

    ensureEventHandlerDeps()

    this._disposeSyncListener?.()
    this._disposeSyncListener = setSyncStatusListener((payload) => {
      this._getFanout().onSyncStatus?.(payload)
    })

    this._disposeEventHandlers?.()
    this._disposeEventHandlers = registerEventHandlers(
      this._client,
      this._stores,
      {
        onTokenWillExpire: () => this._getFanout().onTokenWillExpire?.(),
        onTokenExpired: () => this._getFanout().onTokenExpired?.(),
      },
      this._features,
      this._persistence,
    )
    this._eventsRegistered = true
    adapterLog.debug('[Websdk5Adapter] SDK 事件处理器已注册')
  }

  get message(): MessageRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const messageDomain = this._domains.message
    const conversationDomain = this._domains.conversation

    // 注意：repositories 注入不在此 getter 合并——loadMessages 已由
    // MessageDomain.fetchHistory 委托覆盖（UI 实际消费 domains.*），
    // 其余注入方法本期不消费（Phase 3.1 仅留口子）。
    return {
      loadMessages: async (conversationId, conversationType, cursor, pageSize) => {
        const result = await messageDomain.fetchHistory(conversationId, conversationType, cursor, pageSize)
        return {
          list: result.list as SdkMessage[],
          cursor: result.cursor,
          hasMore: result.hasMore,
        }
      },

      sendText: (conversationId, conversationType, content, ext, needReadReceipt) =>
        messageDomain.sendText(conversationId, conversationType, content, ext, needReadReceipt),

      sendImage: (conversationId, conversationType, data, ext, needReadReceipt) =>
        messageDomain.sendImage(conversationId, conversationType, data, ext, needReadReceipt),

      sendFile: (conversationId, conversationType, data, ext, needReadReceipt) =>
        messageDomain.sendFile(conversationId, conversationType, data, ext, needReadReceipt),

      sendVoice: (conversationId, conversationType, data, duration, ext, needReadReceipt) =>
        messageDomain.sendVoice(conversationId, conversationType, data, duration, ext, needReadReceipt),

      sendVideo: (conversationId, conversationType, data, duration, ext, needReadReceipt) =>
        messageDomain.sendVideo(conversationId, conversationType, data, duration, ext, needReadReceipt),

      // 契约的 needReadReceipt 未透传：domain sendLocation 无此参数（SDK 不支持位置消息回执）
      sendLocation: (conversationId, conversationType, latitude, longitude, address, ext) =>
        messageDomain.sendLocation(conversationId, conversationType, latitude, longitude, address, ext),

      sendCustom: (conversationId, conversationType, event, customParams, ext) => {
        // 契约 customParams 为 unknown 值域，domain/SDK wire 仅接受 string 值域，做浅层 String 收敛
        const mappedParams = customParams
          ? Object.fromEntries(Object.entries(customParams).map(([k, v]) => [k, String(v)]))
          : undefined
        return messageDomain.sendCustom(conversationId, conversationType, event, mappedParams, ext)
      },

      sendCmd: (conversationId, conversationType, action, ext) =>
        messageDomain.sendCmd(conversationId, conversationType, action, ext),

      // 契约 sendCombine 无 compatibleText 参数，domain 侧以空串占位
      sendCombine: (conversationId, conversationType, title, summary, messageList, ext) =>
        messageDomain.sendCombine(conversationId, conversationType, title, summary, '', messageList, ext),

      recall: (conversationId, conversationType, messageId) =>
        messageDomain.recall(conversationId, conversationType, messageId),

      markMessagesRead: (conversationId, conversationType, messageIds) =>
        messageDomain.markMessagesRead(conversationId, conversationType, messageIds),

      markConversationRead: (conversationId, conversationType) =>
        conversationDomain.markRead(conversationId, conversationType),

      modifyText: (conversationId, conversationType, messageId, text) =>
        messageDomain.modifyText(conversationId, conversationType, messageId, text),

      getGroupReadReceiptUsers: async (groupId, messageId, cursor, pageSize) => {
        const result = await messageDomain.getGroupMessageReadUsers(groupId, messageId, cursor, pageSize)
        return {
          list: result.users.map(u => ({ userId: u.userId, timestamp: u.timestamp })),
          cursor: result.cursor || undefined,
          hasMore: result.hasMore,
        }
      },
    }
  }

  get conversation(): ConversationRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const conversationDomain = this._domains.conversation
    // 注意：repositories 注入不在此 getter 合并——fetchConversations 已由
    // ConversationDomain.refresh 委托覆盖（UI 实际消费 domains.*），
    // 其余注入方法本期不消费（Phase 3.1 仅留口子）。
    return {
      fetchConversations: async () => {
        // SDK5 当前无游标分页，直接返回本地会话全量快照
        const list = conversationDomain.syncLocal()
        return { list, cursor: undefined, hasMore: false }
      },
    }
  }

  get contact(): ContactRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const contactDomain = this._domains.contact
    return {
      // 经 domain.fetchContacts 读取：注入 contact.fetchContacts 时由 domain 委托覆盖
      fetchContacts: async (cursor, pageSize) => contactDomain.fetchContacts(cursor, pageSize),

      fetchBlocklist: async () => contactDomain.syncBlocklist(),

      addContact: async (userId, message) => {
        await contactDomain.addContact(userId, message)
      },

      deleteContact: async (userId) => {
        await contactDomain.deleteContact(userId)
      },

      setRemark: async (userId, remark) => {
        await contactDomain.setRemark(userId, remark)
      },

      addToBlocklist: async (userIds) => {
        await contactDomain.addToBlocklist(userIds)
      },

      removeFromBlocklist: async (userIds) => {
        await contactDomain.removeFromBlocklist(userIds)
      },
    }
  }

  get group(): GroupRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const groupDomain = this._domains.group
    return {
      // 经 domain.fetchGroups 读取：注入 group.fetchGroups 时由 domain 委托覆盖
      fetchGroups: async (cursor, pageSize) => groupDomain.fetchGroups(cursor, pageSize),

      fetchGroupInfo: async groupId => groupDomain.fetchGroupInfo(groupId),

      createGroup: async params => groupDomain.createGroup(params),

      joinGroup: async (groupId, message) => {
        await groupDomain.joinGroup(groupId, message)
      },

      leaveGroup: async (groupId) => {
        await groupDomain.leaveGroup(groupId)
      },

      destroyGroup: async (groupId) => {
        await groupDomain.destroyGroup(groupId)
      },

      fetchGroupMembers: async (groupId, cursor, pageSize) => {
        return groupDomain.fetchGroupMembers(groupId, cursor, pageSize)
      },

      removeGroupMembers: async (groupId, userIds) => {
        await groupDomain.removeGroupMembers(groupId, userIds)
      },

      inviteUsersToGroup: async (groupId, userIds) => {
        await groupDomain.inviteUsersToGroup(groupId, userIds)
      },

      addGroupAdmin: async (groupId, userId) => {
        await groupDomain.addGroupAdmin(groupId, userId)
      },

      removeGroupAdmin: async (groupId, userId) => {
        await groupDomain.removeGroupAdmin(groupId, userId)
      },

      changeGroupOwner: async (groupId, newOwnerId) => {
        await groupDomain.changeGroupOwner(groupId, newOwnerId)
      },

      updateGroupInfo: async (groupId, input) => {
        await groupDomain.updateGroupInfo(groupId, input)
      },

      updateGroupConfigs: async (groupId, input) => {
        await groupDomain.updateGroupConfigs(groupId, input)
      },

      muteAllGroupMembers: async (groupId) => {
        await groupDomain.muteAllGroupMembers(groupId)
      },

      unmuteAllGroupMembers: async (groupId) => {
        await groupDomain.unmuteAllGroupMembers(groupId)
      },

      muteGroupMembers: async (groupId, userIds, muteDuration) => {
        await groupDomain.muteGroupMembers(groupId, userIds, muteDuration)
      },

      unmuteGroupMembers: async (groupId, userIds) => {
        await groupDomain.unmuteGroupMembers(groupId, userIds)
      },

      updateGroupAnnouncement: async (groupId, announcement) => {
        await groupDomain.updateGroupAnnouncement(groupId, announcement)
      },

      acceptGroupInvitation: async (groupId) => {
        await groupDomain.acceptGroupInvitation(groupId)
      },

      declineGroupInvitation: async (groupId) => {
        await groupDomain.declineGroupInvitation(groupId)
      },

      acceptGroupJoinRequest: async (groupId, userId) => {
        await groupDomain.acceptGroupJoinRequest(groupId, userId)
      },

      rejectGroupJoinRequest: async (groupId, userId, reason) => {
        await groupDomain.rejectGroupJoinRequest(groupId, userId, reason)
      },
    }
  }

  get presence(): PresenceRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const presenceDomain = this._domains.presence
    return {
      subscribe: async (userIds, expiry) => {
        await presenceDomain.subscribe(userIds, expiry)
      },

      unsubscribe: async (userIds) => {
        await presenceDomain.unsubscribe(userIds)
      },

      fetchStatus: async (userIds) => {
        return presenceDomain.fetchStatus(userIds)
      },

      publish: async (description) => {
        await presenceDomain.publish(description)
      },
    }
  }

  get userInfo(): UserInfoRepository {
    if (!this._userInfoDomain)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    const domain = this._userInfoDomain
    return {
      fetchUserInfos: async (userIds, attributes) => {
        return domain.fetchUserInfos(userIds, attributes)
      },
      updateOwnInfo: async (input) => {
        await domain.updateOwnInfo(input)
      },
      updateOwnInfoByAttribute: async (attribute, value) => {
        await domain.updateOwnInfoByAttribute(attribute, value as UserInfoAttributeValue)
      },
      subscribeUserInfos: async (userIds) => {
        await domain.subscribeUserInfos(userIds)
      },
      unsubscribeUsersInfo: async (userIds) => {
        await domain.unsubscribeUsersInfo(userIds)
      },
      getSubscribedUsers: async () => {
        return domain.getSubscribedUsers()
      },
    }
  }
}
