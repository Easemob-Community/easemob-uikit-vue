import type { ChatEventHandlerMap } from 'easemob-websdk'
import type { ManagerHost } from '../client'
import type { ConversationTypeValue } from '../../constants'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '../../constants'
import { toUiMessage } from '../adapter/message-adapter'
import { toUiConversations } from '../adapter/conversation-adapter'
import { toUiContacts } from '../adapter/contact-adapter'
import { toUiGroups } from '../adapter/group-adapter'
import { createLogger } from '../../utils/logger'
import { formatSdkError } from '../../utils/sdk-error'
import { markReadReceiptSent } from '../domain/message-domain'
import type { RootStores } from './types'

const chatLog = createLogger('UIKit:ChatEvents')

/** 正在主动拉取群名称的 ID 集合，避免并发重复请求 */
const fetchingGroupNames = new Set<string>()

/** 待发送已读回执的单聊消息 ID 队列（按会话分组，同一 microtask 内合并为一次请求） */
const pendingReadReceipts = new Map<string, string[]>()
let readReceiptFlushScheduled = false

/**
 * 单聊/群聊消息已读回执入队：同一 microtask 内到达的多条消息合并为一次
 * sendMessageReadReceipts 请求（SDK 限制单次最多 50 条，超出自动分批），
 * 避免逐条消息各发一次回执请求。
 */
function queueMessageReadReceipt(
  client: ManagerHost,
  conversationType: ConversationTypeValue,
  conversationId: string,
  messageId: string,
) {
  if (!messageId)
    return
  const queueKey = `${conversationType}:${conversationId}`
  const list = pendingReadReceipts.get(queueKey) || []
  list.push(messageId)
  pendingReadReceipts.set(queueKey, list)
  if (readReceiptFlushScheduled)
    return
  readReceiptFlushScheduled = true
  void Promise.resolve().then(async () => {
    readReceiptFlushScheduled = false
    // flush 期间可能又有新消息入队，逐轮清空直至队列耗尽
    while (pendingReadReceipts.size > 0) {
      const entries = Array.from(pendingReadReceipts.entries())
      pendingReadReceipts.clear()
      for (const [queueKey, messageIds] of entries) {
        const [conversationType, conversationId] = queueKey.split(':') as [ConversationTypeValue, string]
        for (let i = 0; i < messageIds.length; i += 50) {
          const batch = messageIds.slice(i, i + 50)
          try {
            await client.chatManager.sendMessageReadReceipts({
              conversationId,
              conversationType,
              messageIds: batch,
            })
            // 发送成功记录去重，进入会话时不再重复补发该批消息
            markReadReceiptSent(batch)
          }
          catch (err) {
            chatLog.warn('sendMessageReadReceipts failed:', err)
          }
        }
      }
    }
  })
}

/**
 * 批量回显会话免打扰状态。
 * 会话列表同步协议不携带免打扰字段（SDK 侧恒为 DEFAULT，
 * 群会话仅有 joined-group 同步可能带入），必须走 PushManager
 * getConversationSilentModes 批量查询（单次最多 20 条，自动分批）。
 * DURATION/INTERVAL 规则无 remindType，用 expireTimestamp 未过期判定免打扰中。
 */
async function patchConversationMuteStates(stores: RootStores, client: ManagerHost) {
  const targets = stores.conversation.conversationList.map(c => ({
    conversationId: c.id,
    conversationType: c.type,
  }))
  if (targets.length === 0)
    return

  for (let i = 0; i < targets.length; i += 20) {
    try {
      const result = await client.pushManager.getConversationSilentModes({
        conversationList: targets.slice(i, i + 20),
      })
      for (const item of result.conversations) {
        const muted = item.rule.remindType === 'NONE'
          || (item.rule.expireTimestamp !== undefined && item.rule.expireTimestamp > Date.now())
        const existing = stores.conversation.conversationList.find(c => c.id === item.conversationId)
        if (existing && existing.isMuted !== muted) {
          stores.conversation.updateConversation(item.conversationId, {
            isMuted: muted,
            remindType: item.rule.remindType ?? (muted ? 'NONE' : 'DEFAULT'),
          })
        }
      }
    }
    catch (err) {
      chatLog.warn('patch conversation mute states failed:', err)
    }
  }
}

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
    if (cvs.type === CONVERSATION_TYPE.GROUPCHAT) {
      const groupName = groupMap.get(cvs.id)
      if (groupName) {
        stores.conversation.updateConversation(cvs.id, { name: groupName })
      }
      else if (!fetchingGroupNames.has(cvs.id)) {
        missingGroupIds.push(cvs.id)
      }
    }
    else if (cvs.type === CONVERSATION_TYPE.SINGLECHAT) {
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
    chatLog.warn('fetch missing group names failed:', err)
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
      chatLog.info('onSyncDataStart', { dataType: payload.dataType })
      if (payload.dataType === 'conversation') {
        stores.conversation.setSyncingConversations(true)
      }
    },

    onSyncDataFinished: (payload) => {
      chatLog.info('onSyncDataFinished', { dataType: payload.dataType })
      // SDK 按数据类型分别触发同步完成（conversation / contact / group），逐类回填。
      switch (payload.dataType) {
        case 'conversation':
          stores.conversation.setSyncingConversations(false)
          {
            const rawItems = client.chatManager.getConversationList()
            chatLog.info('getConversationList raw (onSyncDataFinished)', rawItems)
            const incoming = toUiConversations(rawItems)
            const merged = mergeWithExistingConversations(stores, incoming)
            stores.conversation.setConversationList(merged)
          }
          stores.conversation.setConversationsLoaded(true)
          void patchConversationNames(stores, client)
          void patchConversationMuteStates(stores, client)
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
      chatLog.info('onConversationListUpdate', { count: payload.items.length, reset: payload.patch.reset, removed: payload.patch.removed.length })
      chatLog.info('getConversationList raw (onConversationListUpdate)', payload.items)
      // 诊断：打印 combine/unknown snippet 的 SDK 原始形态（定位合并消息预览空白）
      {
        const typeCount: Record<string, number> = {}
        const suspects: unknown[] = []
        for (const item of payload.items) {
          const type = String(item.lastMessage?.type ?? '(null)')
          typeCount[type] = (typeCount[type] ?? 0) + 1
          if (type === MESSAGE_TYPE.COMBINE || type === 'unknown') {
            suspects.push({ conversationId: item.conversationId, lastMessage: item.lastMessage })
          }
        }
        if (suspects.length > 0) {
          chatLog.info('raw snippets (onConversationListUpdate)', { typeCount, suspects })
        }
      }
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
      // cmd 透传消息不进消息流（否则会被渲染成 "[命令]" 气泡）；
      // typing 等 cmd 的分发处理为后续 TODO。
      if (sdkMsg.type === MESSAGE_TYPE.CMD)
        return
      chatLog.info('onMessage', { conversationId: sdkMsg.conversationId, from: sdkMsg.from, type: sdkMsg.type })
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
          conversationType: sdkMsg.conversationType as ConversationTypeValue,
        }).catch((err: unknown) => {
          console.warn('[UIKit] auto clearConversationUnreadMessageCount failed:', formatSdkError(err))
        })
        // 单聊/群聊还需向对方发送消息已读回执（clearConversationUnreadMessageCount 仅同步自己多设备）；
        // 与清未读共用“当前会话”判定，回执按 microtask 合并批量发送
        if (sdkMsg.conversationType === CONVERSATION_TYPE.SINGLECHAT || sdkMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT) {
          queueMessageReadReceipt(client, sdkMsg.conversationType, sdkMsg.conversationId, sdkMsg.msgServerId)
        }
      }

      // 更新@我状态
      if (sdkMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT && sdkMsg.from !== stores.client.currentUser) {
        const atList = sdkMsg.ext?.em_at_list
        if (Array.isArray(atList) && atList.includes(stores.client.currentUser)) {
          stores.conversation.setAtMe(sdkMsg.conversationId, true)
          stores.message.addAtMeMessage(sdkMsg.conversationId, uiMsg.msgServerId || uiMsg.msgLocalId)
        }
      }
    },

    onMessageRecalled: (payload) => {
      chatLog.info('onMessageRecalled', { messageId: payload.messageId })
      stores.message.recallMessage(payload.messageId, stores.client.currentUser)
    },

    onMessageDelivered: (payload) => {
      chatLog.info('onMessageDelivered', { messageId: payload.messageId })
      stores.message.updateMessageStatus(payload.messageId, MESSAGE_STATUS.DELIVERED)
    },

    onMessageReadReceipts: (payload) => {
      chatLog.info('onMessageReadReceipts', { count: payload.length })
      // 0.14.243 起事件更名为 onMessageReadReceipts；payload 按 conversationType 判别。
      // 单聊：messageIds 逐条标记已读；群聊：receiptDetails 携带按消息 ID 的累计已读人数。
      for (const receipt of payload) {
        if (receipt.conversationType === CONVERSATION_TYPE.GROUPCHAT) {
          for (const detail of receipt.receiptDetails) {
            stores.message.updateMessageById(detail.messageId, { groupReadCount: detail.count })
          }
        }
        else {
          for (const messageId of receipt.messageIds) {
            stores.message.updateMessageStatus(messageId, MESSAGE_STATUS.READ)
          }
        }
      }
    },

    onMessageUpdated: (payload) => {
      chatLog.info('onMessageUpdated', { messageId: payload.messageId })
      // payload.message 仅含 type/body/ext/modifiedInfo（无 msgServerId），
      // 必须用 payload.messageId 定位，只 patch 编辑相关字段并标记已编辑。
      stores.message.updateMessageById(payload.messageId, {
        body: payload.message.body,
        ext: payload.message.ext,
        modifiedInfo: payload.message.modifiedInfo,
        modified: true,
      })
    },

    onPinnedMessageChanged: async (payload) => {
      chatLog.info('onPinnedMessageChanged', { conversationId: payload.conversationId, operation: payload.operation })
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
          chatLog.warn('refresh pinned messages failed:', err)
        }
      }
    },

    onMultiDeviceConversation: (event) => {
      chatLog.info('onMultiDeviceConversation', { operation: event.operation })
      // 0.14.233 起未读清零事件统一通过 onMultiDeviceConversation 派发；
      // ALL 变体不携带 conversationId，先单独处理并完成类型收窄。
      if (event.operation === 'ALL_CONVERSATIONS_UNREAD_MESSAGE_COUNT_CLEARED') {
        for (const cvs of stores.conversation.conversationList) {
          stores.conversation.updateUnreadCount(cvs.id, 0)
        }
        return
      }

      const { operation, conversationId } = event
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
        case 'CONVERSATION_UNREAD_MESSAGE_COUNT_CLEARED':
          // 多设备清空单会话未读数
          stores.conversation.updateUnreadCount(conversationId, 0)
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
          chatLog.warn('onMultiDeviceConversation unhandled:', event)
      }
    },

    onMultiDeviceMessageRemoved: (event) => {
      chatLog.info('onMultiDeviceMessageRemoved', { conversationId: event.conversationId, operation: event.operation, messageIds: event.messageIds })
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
