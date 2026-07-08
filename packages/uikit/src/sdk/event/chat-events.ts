import type { ChatEventHandlerMap } from 'easemob-websdk'
import type { ManagerHost } from '../client'
import { toUiMessage } from '../adapter/message-adapter'
import { toUiConversations } from '../adapter/conversation-adapter'
import { toUiContacts } from '../adapter/contact-adapter'
import { toUiGroups } from '../adapter/group-adapter'
import type { RootStores } from './types'

/** 正在主动拉取群名称的 ID 集合，避免并发重复请求 */
const fetchingGroupNames = new Set<string>()

/**
 * 用联系人 / 用户资料 / 群组信息补全会话名称。
 * websdk2 本地会话缓存中的 conversationName 在部分场景（如群聊）可能为空，
 * 导致会话列表只显示 ID，因此需要二次补全。
 * 若本地群组列表没有对应群，还会通过 getGroupInfoList 主动拉取一次群详情。
 */
async function patchConversationNames(stores: RootStores, client: ManagerHost) {
  const groupMap = new Map(stores.group.groupList.map(g => [g.groupId, g.groupName]))
  const missingGroupIds: string[] = []
  for (const cvs of stores.conversation.conversationList) {
    const needsPatch = !cvs.name || cvs.name === cvs.id
    if (!needsPatch)
      continue
    if (cvs.type === 'groupChat') {
      const groupName = groupMap.get(cvs.id)
      if (groupName) {
        stores.conversation.updateConversation(cvs.id, { name: groupName })
      }
      else if (!fetchingGroupNames.has(cvs.id)) {
        missingGroupIds.push(cvs.id)
      }
    }
    else if (cvs.type === 'singleChat') {
      const contact = stores.contact.getContact(cvs.id)
      const userInfo = stores.userInfo.getUserInfo(cvs.id)
      const name = contact?.remark || contact?.name || userInfo?.nickname
      if (name) {
        stores.conversation.updateConversation(cvs.id, { name })
      }
    }
  }

  if (missingGroupIds.length === 0)
    return

  for (const id of missingGroupIds) fetchingGroupNames.add(id)
  try {
    const details = await client.groupManager.getGroupInfoList({ groupIds: missingGroupIds })
    const groups = toUiGroups(details)
    for (const group of groups) {
      stores.group.updateGroup(group.groupId, group)
      stores.conversation.updateConversation(group.groupId, { name: group.groupName || group.groupId })
    }
  }
  catch (err) {
    console.warn('[UIKit] fetch missing group names failed:', err)
  }
  finally {
    for (const id of missingGroupIds) fetchingGroupNames.delete(id)
  }
}

/**
 * 与会话列表中已有的 UI 数据合并，优先保留已补全的名称/头像，
 * 避免 SDK 把 conversationName 回退成 conversationId 导致闪烁。
 */
function mergeWithExistingConversations(stores: RootStores, incoming: ReturnType<typeof toUiConversations>) {
  return incoming.map((item) => {
    const existing = stores.conversation.conversationList.find(c => c.id === item.id)
    if (!existing)
      return item
    const keepName = (!item.name || item.name === item.id) && existing.name && existing.name !== existing.id
    const keepAvatar = !item.avatar && existing.avatar
    return {
      ...item,
      name: keepName ? existing.name : item.name,
      avatar: keepAvatar ? existing.avatar : item.avatar,
    }
  })
}

/**
 * 创建 ChatManager 事件处理器。
 * 注册到 client.chatManager.addEventHandler。
 */
export function createChatHandlers(client: ManagerHost, stores: RootStores): ChatEventHandlerMap {
  return {
    onSyncDataStart: (payload) => {
      if (payload.dataType === 'conversation') {
        stores.conversation.setSyncingConversations(true)
      }
    },

    onSyncDataFinished: (payload) => {
      // SDK 按数据类型分别触发同步完成（conversation / contact / group），逐类回填。
      switch (payload.dataType) {
        case 'conversation':
          stores.conversation.setSyncingConversations(false)
          {
            const incoming = toUiConversations(client.chatManager.getConversationList())
            const merged = mergeWithExistingConversations(stores, incoming)
            stores.conversation.setConversationList(merged)
          }
          stores.conversation.setConversationsLoaded(true)
          void patchConversationNames(stores, client)
          break
        case 'contact':
          // 已由自定义数据源填充（loaded 为真）则跳过，避免覆盖业务数据
          if (!stores.contact.loaded) {
            stores.contact.setContactList(toUiContacts(client.contactManager.getContacts()))
          }
          void patchConversationNames(stores, client)
          break
        case 'group':
          if (!stores.group.loaded) {
            stores.group.setGroupList(toUiGroups(client.groupManager.getJoinedGroupList()))
          }
          void patchConversationNames(stores, client)
          break
      }
    },

    onConversationListUpdate: (payload) => {
      // SDK5 payload.items 是当前完整快照；patch.removed 包含本次移除的会话。
      // 当有删除或整体重置时，直接以快照替换列表，避免已删除会话仍留在 UI 上。
      const incoming = toUiConversations(payload.items)
      const merged = mergeWithExistingConversations(stores, incoming)

      if (payload.patch.reset || payload.patch.removed.length > 0) {
        stores.conversation.setConversationList(merged)
      }
      else {
        for (const item of merged) {
          const existing = stores.conversation.conversationList.find(c => c.id === item.id)
          if (existing) {
            stores.conversation.updateConversation(item.id, item)
          }
          else {
            stores.conversation.addConversation(item)
          }
        }
      }
      void patchConversationNames(stores, client)
    },

    onMessage: (sdkMsg) => {
      const uiMsg = toUiMessage(sdkMsg, stores.client.currentUser)
      stores.message.addMessage(uiMsg)

      // 当前会话收到新消息时自动标记已读，避免刷新/重新同步后服务端未读数再次浮现
      const currentCvsId = stores.conversation.currentConversationId
      if (
        currentCvsId
        && sdkMsg.conversationId === currentCvsId
        && sdkMsg.from !== stores.client.currentUser
      ) {
        void client.chatManager.clearConversationUnreadMessageCount({
          conversationId: sdkMsg.conversationId,
          conversationType: sdkMsg.conversationType as 'singleChat' | 'groupChat',
        }).catch((err: unknown) => {
          console.warn('[UIKit] auto clearConversationUnreadMessageCount failed:', err)
        })
      }

      // 更新@我状态
      if (sdkMsg.conversationType === 'groupChat' && sdkMsg.from !== stores.client.currentUser) {
        const atList = sdkMsg.ext?.em_at_list
        if (Array.isArray(atList) && atList.includes(stores.client.currentUser)) {
          stores.conversation.setAtMe(sdkMsg.conversationId, true)
          stores.message.addAtMeMessage(sdkMsg.conversationId, uiMsg.msgServerId || uiMsg.msgLocalId)
        }
      }
    },

    onMessageRecalled: (payload) => {
      stores.message.recallMessage(payload.messageId, stores.client.currentUser)
    },

    onMessageDelivered: (payload) => {
      stores.message.updateMessageStatus(payload.messageId, 'delivered')
    },

    onMessageReceipts: (payload) => {
      // 新 API（0.14.181）：payload 是 ReadonlyArray<MessageReceiptEventPayload>
      // 每项包含 { conversationId, conversationType, messageIds, timestamp }
      // 群聊已读回执不再携带 ackContent/count，群已读人数需通过 getMessageReadReceipts 按需获取
      for (const receipt of payload) {
        for (const messageId of receipt.messageIds) {
          if (receipt.conversationType !== 'groupChat') {
            stores.message.updateMessageStatus(messageId, 'read')
          }
        }
      }
    },

    onConversationUnreadMessageCountCleared: (payload) => {
      // 多设备清空会话未读数时派发
      if (payload.conversationId) {
        stores.conversation.updateUnreadCount(payload.conversationId, 0)
      }
    },

    onAllConversationsUnreadMessageCountCleared: () => {
      // 多设备清空所有会话未读数时派发
      for (const cvs of stores.conversation.conversationList) {
        stores.conversation.updateUnreadCount(cvs.id, 0)
      }
    },

    onMessageUpdated: (payload) => {
      const uiMsg = toUiMessage(payload.message as any, stores.client.currentUser)
      stores.message.applyModifiedMessage(uiMsg)
    },

    onPinnedMessageChanged: async (payload) => {
      if (!payload.messageId)
        return
      if (payload.operation === 'pin') {
        stores.message.setMessagePinned(payload.messageId, {
          operatorId: payload.operatorId || '',
          pinTime: payload.pinTime || Date.now(),
        })
      }
      else if (payload.operation === 'unpin') {
        stores.message.setMessageUnpinned(payload.messageId)
      }

      // 同步置顶消息列表，保证顶部 PinnedBar 与消息气泡状态一致
      if (payload.conversationId && payload.conversationType) {
        try {
          const result = await client.chatManager.getPinnedMessageList({
            conversationId: payload.conversationId,
            conversationType: payload.conversationType,
          })
          const uiMsgs = result.items.map(item => toUiMessage(item.message, stores.client.currentUser))
          stores.message.setPinnedMessages(payload.conversationId, uiMsgs)
        }
        catch (err) {
          console.warn('[UIKit] refresh pinned messages failed:', err)
        }
      }
    },

    onMultiDeviceConversation: (event) => {
      const { operation, conversationId } = event
      if (!conversationId)
        return
      switch (operation) {
        case 'CONVERSATION_DELETED':
          stores.conversation.deleteConversation(conversationId)
          break
        case 'CONVERSATION_PINNED':
          stores.conversation.updateConversation(conversationId, { isPinned: true })
          break
        case 'CONVERSATION_UNPINNED':
          stores.conversation.updateConversation(conversationId, { isPinned: false })
          break
        case 'CONVERSATION_MARK':
          if (event.mark !== undefined) {
            stores.conversation.updateConversation(conversationId, { marks: [event.mark] })
          }
          break
        case 'CONVERSATION_MUTE_INFO_CHANGED':
          if (event.remindType) {
            stores.conversation.updateConversation(conversationId, {
              isMuted: event.remindType === 'NONE',
              remindType: event.remindType,
            })
          }
          break
        default:
          console.warn('[UIKit] onMultiDeviceConversation unhandled:', event)
      }
    },

    onMultiDeviceMessageRemoved: (event) => {
      const { operation, conversationId, messageIds, beforeTimestamp } = event
      if (!conversationId || operation !== 'MESSAGE_REMOVED')
        return

      if (messageIds && messageIds.length > 0) {
        stores.message.deleteMessages([...messageIds])
      }
      else if (beforeTimestamp) {
        const msgs = stores.message.getMessages(conversationId)
        const idsToDelete = msgs
          .filter(m => m.timestamp && m.timestamp < beforeTimestamp)
          .map(m => m.msgServerId || m.msgLocalId)
          .filter((id: string | undefined): id is string => !!id)
        if (idsToDelete.length > 0) {
          stores.message.deleteMessages(idsToDelete)
        }
      }
    },
  }
}
