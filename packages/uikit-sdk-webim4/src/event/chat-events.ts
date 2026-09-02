import WebIM from 'easemob-websdk-4'
import type { EasemobChat } from 'easemob-websdk-4'
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  createLogger,
  formatConversationPreview,
  isStreamActive,
  normalizeUserId,
} from '@easemob/uikit-sdk-contract'
import type { ConversationTypeValue, UIKitFeatures } from '@easemob/uikit-sdk-contract'
import { toUiMessage } from '../adapter/message-adapter'
import { deriveConversationUpsertFromMessage } from '../adapter/conversation-adapter'
import { markReadReceiptSent } from '../domain/message-domain'
import { notifyOnNewMessage } from '../notification-engine'
import type { Webim4Client } from '../client'
import { getEventHandlerDeps } from './deps'
import type { EventStores } from './types'

const chatLog = createLogger('UIKit:Webim4ChatEvents')

/** 4.x 消息体判别联合（剔除 read/delivery/channel 回执体） */
type MessagesType = EasemobChat.ExcludeAckMessageBody

/** 待发送已读回执的消息 ID 队列（按会话分组，同一 microtask 内合并 flush） */
const pendingReadReceipts = new Map<string, string[]>()
let readReceiptFlushScheduled = false

/** 清空 chat-events 模块级缓存状态，登出或重新注册事件时调用 */
export function resetChatEventState() {
  pendingReadReceipts.clear()
  readReceiptFlushScheduled = false
}

/**
 * 消息已读回执入队：同一 microtask 内到达的多条消息合并 flush。
 * 4.x 回执即消息（无 5.x sendMessageReadReceipts 批量 API），flush 时逐条发送
 * type:'read' 消息；单聊标记对方已读，群聊计入群已读人数。
 */
function queueMessageReadReceipt(
  client: Webim4Client,
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
        const conn = client.connection
        if (!conn) {
          chatLog.warn('queueMessageReadReceipt: connection 尚未初始化，跳过')
          continue
        }
        for (const messageId of messageIds) {
          try {
            const body = WebIM.message.create({
              type: 'read',
              chatType: conversationType,
              id: messageId,
              to: conversationId,
            } as EasemobChat.CreateReadMsgParameters) as EasemobChat.ReadMsgBody
            await conn.send(body)
            // 发送成功记录去重，进入会话时不再重复补发该批消息
            markReadReceiptSent([messageId])
          }
          catch (err) {
            chatLog.warn('send read receipt failed:', err)
          }
        }
      }
    }
  })
}

/** 群聊会话摘要发送者显示名解析：优先联系人备注，其次用户资料昵称（webim4 侧内联实现） */
function resolveSenderName(stores: EventStores, userId: string): string | undefined {
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  return contact?.remark || contact?.name || userInfo?.nickname || undefined
}

/**
 * 4.x 撤回事件（RecallMsgBody）不带 chatType/conversationId，从会话列表反查：
 * - to 命中会话列表 → 以该会话的类型为准（群聊撤回 to=群 ID；单聊自己撤回 to=对端）；
 * - 否则按单聊处理：对端撤回时会话 ID 取 from，自己多端撤回取 to。
 */
function resolveRecallConversation(
  stores: EventStores,
  msg: EasemobChat.RecallMsgBody,
  currentUserId: string,
): { conversationId: string, conversationType: ConversationTypeValue } {
  const cvsTo = stores.conversation.conversationList.find(c => c.id === msg.to)
  if (cvsTo)
    return { conversationId: msg.to, conversationType: cvsTo.type }
  const selfRecalled = normalizeUserId(msg.from || '') === normalizeUserId(currentUserId)
  return {
    conversationId: selfRecalled ? msg.to : msg.from,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
  }
}

/**
 * 消息被撤回时，若被撤回的是会话最后一条消息，同步更新会话列表摘要。
 * 当前会话由 chat.vue 的 lastMessageSummary watch 自动刷新；
 * 非当前会话需依赖此方法主动 patch，避免列表仍显示原消息内容。
 */
function patchConversationLastMessageOnRecall(
  stores: EventStores,
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
  const senderName = isGroup ? resolveSenderName(stores, recalledMsg.from) : undefined
  const { t } = getEventHandlerDeps()
  stores.conversation.updateConversation(conversationId, {
    lastMessageText: formatConversationPreview(
      conversationType,
      senderName,
      t('message.recalledPreview'),
    ),
  })
}

/**
 * 拉取会话置顶消息全量列表并写入 store（4.x getServerPinnedMessages 分页，自动翻页聚合）。
 * onMessagePinEvent 后调用，保证顶部 PinnedBar 与消息气泡状态一致。
 */
async function refreshPinnedMessages(
  client: Webim4Client,
  stores: EventStores,
  conversationId: string,
  conversationType: ConversationTypeValue,
) {
  const conn = client.connection
  if (!conn)
    return
  try {
    const all: EasemobChat.PinnedMessageInfo[] = []
    let cursor = ''
    do {
      const result = await conn.getServerPinnedMessages({
        conversationId,
        conversationType,
        pageSize: 50,
        cursor,
      })
      const data = result.data
      if (!data)
        break
      all.push(...(data.list || []))
      cursor = data.cursor || ''
    } while (cursor)
    const uiMsgs = all.map((item) => {
      const uiMsg = toUiMessage(item.message as MessagesType, stores.client.currentUser)
      uiMsg.pinned = true
      uiMsg.pinTime = item.pinTime
      uiMsg.pinOperatorId = item.operatorId
      return uiMsg
    })
    stores.message.setPinnedMessages(conversationId, uiMsgs)
  }
  catch (err) {
    chatLog.warn('refresh pinned messages failed:', err)
  }
}

/**
 * 创建 4.x 消息事件处理器。
 * 注册到 `connection.addEventHandler(id, handlers)`。
 *
 * 4.x 事件模型（主计划 8.2）：
 * - `onMessage` 是**批量数组回调**，且不含 read/delivery/channel/cmd（走独立回调），逐条展开处理；
 * - 回执：`onReadMessage` / `onDeliveredMessage` / `onChannelMessage`；
 * - 撤回 `onRecallMessage`；编辑 `onModifiedMessage`；置顶 `onMessagePinEvent`；流式 `onStreamMessage`。
 */
export function createChatHandlers(
  client: Webim4Client,
  stores: EventStores,
  features?: UIKitFeatures,
): Partial<EasemobChat.EventHandlerType> {
  return {
    onMessage: (sdkMsgs) => {
      for (const sdkMsg of sdkMsgs) {
        // 聊天室消息由 chatroom 场景包处理（两包同装隔离，对齐 websdk5）
        if (sdkMsg.chatType === 'chatRoom')
          continue
        // cmd 已被 onMessage 的 payload 类型排除（4.x 走独立 onCmdMessage 回调）
        chatLog.info('onMessage', { to: sdkMsg.to, from: sdkMsg.from, type: sdkMsg.type })
        const uiMsg = toUiMessage(sdkMsg, stores.client.currentUser)
        // 流式丢片补偿：离线/断连期间错过分片后，同步到达的完整消息覆盖未完成的流式副本
        const existingStreamMsg = stores.message.getMessages(uiMsg.conversationId)
          .find(m => m.msgServerId === uiMsg.msgServerId)
        if (existingStreamMsg?.stream && isStreamActive(existingStreamMsg.stream.status)) {
          stores.message.replaceMessageById(uiMsg.msgServerId, uiMsg)
        }
        else {
          stores.message.addMessage(uiMsg)
        }

        // 当前会话收到新消息时自动向对方发送已读回执（仅页面可见时；
        // 4.x 无 clearConversationUnreadMessageCount，会话清未读由 ConversationDomain 的 channel/read 回执负责）
        const currentCvsId = stores.conversation.currentConversationId
        const isPageVisible = typeof document === 'undefined' || document.visibilityState === 'visible'
        if (
          currentCvsId
          && uiMsg.conversationId === currentCvsId
          && normalizeUserId(sdkMsg.from || '') !== normalizeUserId(stores.client.currentUser)
          && isPageVisible
        ) {
          queueMessageReadReceipt(client, uiMsg.conversationType as ConversationTypeValue, uiMsg.conversationId, uiMsg.msgServerId)
        }

        // 4.x 无 onConversationListUpdate 对等事件（websdk5 由 SDK 会话事件承担），
        // 收消息时手动 upsert 会话：更新 lastMessage 摘要、累计未读角标、未知会话新建浮现。
        {
          const readOnArrive = !!currentCvsId && uiMsg.conversationId === currentCvsId && isPageVisible
          const { patch, unreadIncrement } = deriveConversationUpsertFromMessage(uiMsg, {
            readOnArrive,
            resolveSenderName: userId => resolveSenderName(stores, userId),
          })
          const existingCvs = stores.conversation.conversationList.find(c => c.id === uiMsg.conversationId)
          if (existingCvs) {
            stores.conversation.updateConversation(uiMsg.conversationId, {
              ...patch,
              ...(unreadIncrement ? { unreadCount: existingCvs.unreadCount + unreadIncrement } : {}),
            })
          }
          else {
            // 新会话名称先以 ID 兜底，资料（昵称/头像）由 ConversationDomain refresh 时批量补全
            chatLog.info('onMessage 新会话浮现', { conversationId: uiMsg.conversationId, type: uiMsg.conversationType })
            stores.conversation.addConversation({
              id: uiMsg.conversationId,
              name: uiMsg.conversationId,
              type: uiMsg.conversationType as ConversationTypeValue,
              unreadCount: unreadIncrement,
              lastMessageText: patch.lastMessageText || '',
              lastMessageFrom: patch.lastMessageFrom,
              lastMessageTime: patch.lastMessageTime,
              isPinned: false,
              isMuted: false,
              marks: [],
            })
          }
        }

        // 更新@我状态（受全局 enableAtMe 开关控制；4.x @标记同样在 ext.em_at_list）
        if (
          features?.enableAtMe !== false
          && sdkMsg.chatType === CONVERSATION_TYPE.GROUPCHAT
          && normalizeUserId(sdkMsg.from || '') !== normalizeUserId(stores.client.currentUser)
        ) {
          const atList = sdkMsg.ext?.em_at_list
          if (Array.isArray(atList) && atList.includes(stores.client.currentUser)) {
            stores.conversation.setAtMe(uiMsg.conversationId, true)
            stores.message.addAtMeMessage(uiMsg.conversationId, uiMsg.msgServerId || uiMsg.msgLocalId)
          }
        }

        // 消息通知：非当前会话 + 页面隐藏（background 模式）时触发浏览器/页内通知（对齐 websdk5，入参为已转换的中立消息）
        notifyOnNewMessage(stores, uiMsg)
      }
    },

    onCmdMessage: (sdkMsg) => {
      // cmd 透传消息不进消息流（否则会被渲染成 "[命令]" 气泡）；仅处理 typing 相关 cmd
      chatLog.info('[CMD received]', {
        to: sdkMsg.to,
        from: sdkMsg.from,
        action: sdkMsg.action,
        ext: sdkMsg.ext,
      })
      // 仅单聊处理对方正在输入；群聊 typing 二期再做（与 websdk5 对齐）
      if (
        sdkMsg.action === 'TypingBegin'
        && features?.enableTyping !== false
        && sdkMsg.chatType === CONVERSATION_TYPE.SINGLECHAT
        && normalizeUserId(sdkMsg.from || '') !== normalizeUserId(stores.client.currentUser)
      ) {
        stores.conversation.setTyping(sdkMsg.from || '', sdkMsg.from || '')
      }
    },

    /**
     * 流式消息（边生成边下发，典型 AI 对话）分片合并。
     * - 4.x `stream.text` 为增量且回调分片无 `seq`：toUiMessage 内 adapter 自增 seq；
     *   fullText 优先取 SDK 回调 `msg` 字段（handleStreamMsg 已按 seq 合并的累计全量），
     *   `msg` 缺失时 adapter 自累计兜底，最终以 fullText 覆盖 body.content（幂等，不依赖分片到达顺序）；
     * - 先到则只覆盖更新，未到则插入新消息（首个分片建气泡）。
     */
    onStreamMessage: (sdkMsg) => {
      if (sdkMsg.chatType === 'chatRoom')
        return
      const stream = sdkMsg.stream
      if (!stream)
        return
      const uiMsg = toUiMessage(sdkMsg, stores.client.currentUser)
      const meta = uiMsg.stream
      if (!meta)
        return
      chatLog.info('onStreamMessage', {
        conversationId: uiMsg.conversationId,
        from: sdkMsg.from,
        msgServerId: uiMsg.msgServerId,
        seq: meta.seq,
        status: meta.status,
        customType: meta.customType,
      })
      const msgId = uiMsg.msgServerId || uiMsg.msgLocalId
      if (!msgId)
        return

      const exists = stores.message.getMessages(uiMsg.conversationId).some(
        m => m.msgServerId === uiMsg.msgServerId || m.msgLocalId === uiMsg.msgLocalId,
      )
      if (!exists) {
        // 首个分片（或先于 onMessage 到达）：创建气泡，stream 字段随 toUiMessage 展开保留
        stores.message.addMessage(uiMsg)
        return
      }

      // 已有同一条消息：幂等覆盖全文与流式状态，不产生新气泡
      stores.message.updateMessageById(msgId, {
        body: uiMsg.body,
        stream: { ...meta },
      })
    },

    onRecallMessage: (msg) => {
      chatLog.info('onRecallMessage', { mid: msg.mid, from: msg.from })
      // 4.x RecallMsgBody：mid = 被撤回消息 ID，from = 撤回操作者（不存在时 SDK 兜底 'admin'）
      stores.message.recallMessage(msg.mid, msg.from)
      // 同步刷新会话列表最后一条消息摘要（当前会话由 chat.vue watch 处理）
      const { conversationId, conversationType } = resolveRecallConversation(stores, msg, stores.client.currentUser)
      patchConversationLastMessageOnRecall(stores, conversationId, conversationType, msg.mid)
    },

    onReadMessage: (msg) => {
      // 4.x ReadMsgBody：mid/ackId = 被读消息 ID；
      // 群聊已读回执携带 groupReadCount（{ [messageId]: 已读人数 }），单聊不带
      if (msg.groupReadCount) {
        chatLog.info('onReadMessage(group)', { groupReadCount: msg.groupReadCount })
        for (const [messageId, count] of Object.entries(msg.groupReadCount)) {
          stores.message.updateMessageById(messageId, { groupReadCount: count })
        }
        return
      }
      const messageId = msg.mid || msg.ackId
      chatLog.info('onReadMessage(single)', { messageId })
      if (!messageId)
        return
      stores.message.updateMessageStatus(messageId, MESSAGE_STATUS.READ)
      stores.message.updateMessageById(messageId, { isPeerRead: true })
    },

    onDeliveredMessage: (msg) => {
      const messageId = msg.mid || msg.ackId
      chatLog.info('onDeliveredMessage', { messageId })
      if (!messageId)
        return
      stores.message.updateMessageStatus(messageId, MESSAGE_STATUS.DELIVERED)
      stores.message.updateMessageById(messageId, { isPeerDelivered: true })
    },

    onChannelMessage: (msg) => {
      // 4.x 会话级已读回执：对端（msg.from）读了「我发给 TA 的」整个会话，
      // 将该会话内己方发送的消息全部置为已读（5.x 无对等事件，由会话已读回执覆盖）
      const conversationId = msg.from
      chatLog.info('onChannelMessage', { from: msg.from, mid: msg.mid })
      if (!conversationId)
        return
      const msgs = stores.message.getMessages(conversationId)
      for (const m of msgs) {
        if (m.isSelf && m.status !== MESSAGE_STATUS.READ) {
          const id = m.msgServerId || m.msgLocalId
          if (id) {
            stores.message.updateMessageStatus(id, MESSAGE_STATUS.READ)
            stores.message.updateMessageById(id, { isPeerRead: true })
          }
        }
      }
    },

    onModifiedMessage: (msg) => {
      if (msg.chatType === 'chatRoom')
        return
      chatLog.info('onModifiedMessage', { id: msg.id, type: msg.type })
      // 4.x ModifiedEventMessage 是完整消息体（带 modifiedInfo），
      // 用中立映射后的 body/ext/modifiedInfo patch 并标记已编辑
      const uiMsg = toUiMessage(msg, stores.client.currentUser)
      stores.message.updateMessageById(msg.id, {
        body: uiMsg.body,
        ext: uiMsg.ext,
        modifiedInfo: uiMsg.modifiedInfo,
        modified: true,
      })
    },

    onMessagePinEvent: (eventData) => {
      if (eventData.conversationType === 'chatRoom')
        return
      chatLog.info('onMessagePinEvent', { conversationId: eventData.conversationId, operation: eventData.operation })
      if (!eventData.messageId)
        return
      if (eventData.operation === 'pin') {
        stores.message.setMessagePinned(eventData.messageId, {
          operatorId: eventData.operatorId || '',
          pinTime: eventData.time || Date.now(),
        })
      }
      else if (eventData.operation === 'unpin') {
        stores.message.setMessageUnpinned(eventData.messageId)
      }

      // 同步置顶消息列表，保证顶部 PinnedBar 与消息气泡状态一致
      if (eventData.conversationId && eventData.conversationType) {
        void refreshPinnedMessages(
          client,
          stores,
          eventData.conversationId,
          eventData.conversationType as ConversationTypeValue,
        )
      }
    },
  }
}
