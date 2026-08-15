import type { ChatEventHandlerMap } from 'easemob-websdk'
import type { ManagerHost } from '@easemob/uikit-core'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-core'
import type { UIKitFeatures } from '@easemob/uikit-core'
import { normalizeUserId, toUiMessage } from '../adapter/message-adapter'
import { toUiConversations } from '../adapter/conversation-adapter'
import { toUiContacts } from '../adapter/contact-adapter'
import { toUiGroups } from '../adapter/group-adapter'
import { notifyOnNewMessage } from '../notification-engine'
import { createLogger } from '@easemob/uikit-core'
import { formatSdkError } from '@easemob/uikit-core'
import { isStreamActive } from '../../utils/stream-message'
import { markReadReceiptSent } from '../domain/message-domain'
import { formatConversationPreview, resolveSenderDisplayName, resolveUserDisplayName } from '../../utils/resolve-last-message-text'
import { t } from '@easemob/uikit-core'
import type { RootStores } from './types'

const chatLog = createLogger('UIKit:ChatEvents')

/** 正在主动拉取群名称的 ID 集合，避免并发重复请求 */
const fetchingGroupNames = new Set<string>()

/** 已主动拉取过群名称的 ID 集合（本次事件注册周期内），避免 SDK 定时同步会话列表时重复请求 */
const fetchedGroupNameIds = new Set<string>()

/** 待发送已读回执的单聊消息 ID 队列（按会话分组，同一 microtask 内合并为一次请求） */
const pendingReadReceipts = new Map<string, string[]>()
let readReceiptFlushScheduled = false

/** 清空 chat-events 模块级缓存状态，登出或重新注册事件时调用 */
export function resetChatEventState() {
  fetchingGroupNames.clear()
  fetchedGroupNameIds.clear()
  pendingReadReceipts.clear()
  readReceiptFlushScheduled = false
}

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
    // 已经主动拉取过群名称的会话不再重复请求（无论之前成功或失败），
    // 避免 SDK 定时同步会话列表时批量触发 getGroupInfoList。
    const needsPatch = (!cvs.name || cvs.name === cvs.id) && !fetchedGroupNameIds.has(cvs.id)
    if (!needsPatch)
      continue
    if (cvs.type === CONVERSATION_TYPE.GROUPCHAT) {
      const groupName = groupMap.get(cvs.id)
      // 本地群组列表中已有有效名称时直接补全，不再走网络请求。
      if (groupName && groupName !== cvs.id) {
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

  for (const id of missingGroupIds) {
    fetchingGroupNames.add(id)
    fetchedGroupNameIds.add(id)
  }
  try {
    const details = await client.groupManager.getGroupInfoList({ groupIds: missingGroupIds })
    const groups = toUiGroups(details)
    for (const group of groups) {
      stores.group.updateGroup(group.groupId, group)
      // 群名有效时才更新会话名称；空名称回退到 groupId 会让 needsPatch 永远成立，导致无限循环请求。
      if (group.groupName && group.groupName !== group.groupId) {
        stores.conversation.updateConversation(group.groupId, { name: group.groupName })
      }
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
 * 消息被撤回时，若被撤回的是会话最后一条消息，同步更新会话列表摘要。
 * 当前会话由 chat.vue 的 lastMessageSummary watch 自动刷新；
 * 非当前会话需依赖此方法主动 patch，避免列表仍显示原消息内容。
 */
function patchConversationLastMessageOnRecall(
  stores: RootStores,
  conversationId: string,
  conversationType: ConversationTypeValue,
  messageId: string,
) {
  const msgs = stores.message.getMessages(conversationId)
  const index = msgs.findIndex(
    m => m.msgServerId === messageId || m.msgLocalId === messageId,
  )
  if (index === -1)
    return
  // 仅当被撤回消息是会话已加载消息中的最后一条时才更新摘要
  if (index !== msgs.length - 1)
    return

  const recalledMsg = msgs[index]
  const cvs = stores.conversation.conversationList.find(c => c.id === conversationId)
  if (!cvs)
    return
  // 若会话有更新的最后消息时间（存在未加载的新消息），则不覆盖
  if (cvs.lastMessageTime && recalledMsg.timestamp < cvs.lastMessageTime - 1000)
    return

  const isGroup = conversationType === CONVERSATION_TYPE.GROUPCHAT
  const senderName = isGroup ? resolveSenderDisplayName(stores, recalledMsg) : undefined
  stores.conversation.updateConversation(conversationId, {
    lastMessageText: formatConversationPreview(
      conversationType,
      senderName,
      t('message.recalledPreview'),
    ),
  })
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
export function createChatHandlers(
  client: ManagerHost,
  stores: RootStores,
  features?: UIKitFeatures,
): ChatEventHandlerMap {
  // 群聊会话摘要发送者显示名解析：优先联系人备注，其次用户资料昵称
  const resolveSenderName = (userId: string) => resolveUserDisplayName(stores, userId)

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
            const incoming = toUiConversations(rawItems, { resolveSenderName })
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
      const incoming = toUiConversations(payload.items, { resolveSenderName })
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
      // 仅处理 typing 相关 cmd，其余忽略。
      if (sdkMsg.type === MESSAGE_TYPE.CMD) {
        const action = (sdkMsg.body as { action?: string }).action
        // 保留 CMD 接收日志，用于观察对端（如 iOS）频繁触发情况。
        chatLog.info('[CMD received]', {
          conversationId: sdkMsg.conversationId,
          from: sdkMsg.from,
          action,
          ext: sdkMsg.ext,
        })
        // 仅单聊处理对方正在输入；群聊 typing 二期再做。
        if (
          action === 'TypingBegin'
          && features?.enableTyping !== false
          && sdkMsg.conversationType === CONVERSATION_TYPE.SINGLECHAT
          && normalizeUserId(sdkMsg.from) !== normalizeUserId(stores.client.currentUser)
        ) {
          stores.conversation.setTyping(sdkMsg.conversationId, sdkMsg.from)
        }
        return
      }
      chatLog.info('onMessage', { conversationId: sdkMsg.conversationId, from: sdkMsg.from, type: sdkMsg.type })
      const uiMsg = toUiMessage(sdkMsg, stores.client.currentUser)
      // 流式丢片补偿：离线/断连期间错过分片后，服务端同步到达的完整消息
      // 覆盖 store 中未完成的流式副本（msgServerId 相同），避免气泡残留半截内容。
      const existingStreamMsg = stores.message.getMessages(sdkMsg.conversationId)
        .find(m => m.msgServerId === sdkMsg.msgServerId)
      if (existingStreamMsg?.stream && isStreamActive(existingStreamMsg.stream.status)) {
        stores.message.replaceMessageById(sdkMsg.msgServerId, uiMsg)
      }
      else {
        stores.message.addMessage(uiMsg)
      }

      // 当前会话收到新消息时自动标记已读，避免刷新/重新同步后服务端未读数再次浮现。
      // 仅在页面可见时标记已读；页面隐藏时用户实际未看到，保持未读。
      const currentCvsId = stores.conversation.currentConversationId
      const isPageVisible = typeof document === 'undefined' || document.visibilityState === 'visible'
      if (
        currentCvsId
        && sdkMsg.conversationId === currentCvsId
        && normalizeUserId(sdkMsg.from) !== normalizeUserId(stores.client.currentUser)
        && isPageVisible
      ) {
        void client.chatManager.clearConversationUnreadMessageCount({
          conversationId: sdkMsg.conversationId,
          conversationType: sdkMsg.conversationType as ConversationTypeValue,
        }).catch((err: unknown) => {
          chatLog.warn('[UIKit] auto clearConversationUnreadMessageCount failed:', formatSdkError(err))
        })
        // 单聊/群聊还需向对方发送消息已读回执（clearConversationUnreadMessageCount 仅同步自己多设备）；
        // 与清未读共用“当前会话”判定，回执按 microtask 合并批量发送
        if (sdkMsg.conversationType === CONVERSATION_TYPE.SINGLECHAT || sdkMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT) {
          queueMessageReadReceipt(client, sdkMsg.conversationType, sdkMsg.conversationId, sdkMsg.msgServerId)
        }
      }

      // 更新@我状态（受全局 enableAtMe 开关控制）
      if (
        features?.enableAtMe !== false
        && sdkMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT
        && normalizeUserId(sdkMsg.from) !== normalizeUserId(stores.client.currentUser)
      ) {
        const atList = sdkMsg.ext?.em_at_list
        if (Array.isArray(atList) && atList.includes(stores.client.currentUser)) {
          stores.conversation.setAtMe(sdkMsg.conversationId, true)
          stores.message.addAtMeMessage(sdkMsg.conversationId, uiMsg.msgServerId || uiMsg.msgLocalId)
        }
      }

      // 消息通知：非当前会话 + 页面隐藏（background 模式）时触发浏览器/页内通知
      notifyOnNewMessage(stores, sdkMsg)
    },

    /**
     * 流式消息（边生成边下发，典型 AI 对话）分片合并。
     * - 按 `msgServerId` 定位同一条 TEXT 消息，`body.content` 以 `stream.fullText`
     *   （服务端排序合并后的累计全文）幂等覆盖，不依赖分片到达顺序 / deltaText 增量；
     * - 先到（onMessage 全量或首个分片）则只覆盖更新，未到则插入新消息（首个分片建气泡）；
     * - `stream` 状态整体挂载到消息上，供渲染层展示传输中光标 / 终态收敛 / 异常提示，
     *   也供插件插槽按 `customType` 接管（markdown 等富类型）。
     */
    onStreamMessage: (sdkMsg) => {
      const stream = sdkMsg.stream
      if (!stream)
        return
      chatLog.info('onStreamMessage', {
        conversationId: sdkMsg.conversationId,
        from: sdkMsg.from,
        msgServerId: sdkMsg.msgServerId,
        seq: stream.seq,
        status: stream.status,
        customType: stream.customType,
      })
      const msgId = sdkMsg.msgServerId || sdkMsg.msgLocalId
      if (!msgId)
        return

      const exists = stores.message.getMessages(sdkMsg.conversationId).some(
        m =>
          m.msgServerId === sdkMsg.msgServerId
          || (sdkMsg.msgLocalId !== undefined && m.msgLocalId === sdkMsg.msgLocalId),
      )
      if (!exists) {
        // 首个分片（或先于 onMessage 到达）：创建气泡，stream 字段随 toUiMessage 展开保留
        stores.message.addMessage(toUiMessage(sdkMsg, stores.client.currentUser))
        return
      }

      // 已有同一条消息：幂等覆盖全文与流式状态，不产生新气泡
      stores.message.updateMessageById(msgId, {
        body: { ...sdkMsg.body, content: stream.fullText },
        stream: { ...stream },
      })
    },

    onMessageRecalled: (payload) => {
      chatLog.info('onMessageRecalled', { messageId: payload.messageId })
      stores.message.recallMessage(payload.messageId, stores.client.currentUser)
      // 同步刷新会话列表最后一条消息摘要（当前会话由 chat.vue watch 处理，
      // 非当前会话需在这里主动 patch，避免列表仍显示被撤回的原消息内容）。
      patchConversationLastMessageOnRecall(
        stores,
        payload.conversationId,
        payload.conversationType as ConversationTypeValue,
        payload.messageId,
      )
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
