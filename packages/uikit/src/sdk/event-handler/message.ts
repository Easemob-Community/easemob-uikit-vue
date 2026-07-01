import type { EventPayloadMap } from 'easemob-websdk'
import type { RootStores } from './index'
import { MESSAGE_STATUS } from '../../constants'
import type { Message } from '../../store/message'
import { getClient } from '../client'
import {
  type SdkMsgBase,
  convertSdkMessageToUiMessage,
  resolveConversationId,
  getLastMessageText,
  isAtMe,
} from './utils'

/**
 * 创建消息相关事件处理器
 */
export function createMessageHandler(stores: RootStores) {
  /**
   * 公共处理逻辑：将 SDK 消息写入 messageStore 并更新会话列表
   */
  function handleIncomingMessage(sdkMsg: SdkMsgBase) {
    const currentUser = stores.client.currentUser
    const isGroup = sdkMsg.conversationType === 'groupChat' || sdkMsg.chatType === 'groupChat'
    const conversationId = resolveConversationId(sdkMsg, currentUser)
    const lastMessageText = getLastMessageText(sdkMsg)

    const uiMsg = convertSdkMessageToUiMessage(sdkMsg, currentUser)

    stores.message.addMessage(uiMsg)

    // 更新会话列表
    stores.conversation.addConversation({
      id: conversationId,
      name: isGroup ? (sdkMsg.to || '') : (sdkMsg.from || ''),
      lastMessage: lastMessageText,
      lastMessageTime: sdkMsg.timestamp || sdkMsg.time || Date.now(),
      lastMessageType: (sdkMsg.type || 'text') as import('../../constants').ConversationTypeValue,
      lastMessageSender: sdkMsg.from || '',
      type: uiMsg.conversationType,
    })

    // 检测是否@我（仅群聊场景，且非自己发送的消息）
    if (isGroup && sdkMsg.from !== currentUser && isAtMe(sdkMsg, currentUser)) {
      stores.conversation.setAtMe(conversationId, true)
      stores.message.addAtMeMessage(conversationId, uiMsg.id)
    }

    // 非当前会话的消息增加未读数
    const currentCvsId = stores.conversation.currentConversation?.id
    if (conversationId !== currentCvsId) {
      const cvs = stores.conversation.conversationList.find((c: { id: string; unreadCount?: number }) => c.id === conversationId)
      if (cvs) {
        stores.conversation.updateUnreadCount(conversationId, (cvs.unreadCount || 0) + 1)
      }
    } else {
      // 当前会话的消息：自动发送已读回执
      const clientInstance = getClient()
      if (clientInstance) {
        // SDK5 使用 markMessageRead 统一处理单聊/群聊已读回执，
        // 需要传入完整 Message 对象。事件处理层只有 UI 消息，不直接调用，
        // 由业务层在消息可见时通过 message store 里的 SDK message 触发。
        void clientInstance
      }
    }
  }

  const handler = {
    /** 统一消息接收 */
    onMessage: (messages: EventPayloadMap['onMessage']) => {
      if (!Array.isArray(messages)) {
        handleIncomingMessage(messages as unknown as SdkMsgBase)
        return
      }
      for (const msg of messages) {
        handleIncomingMessage(msg as unknown as SdkMsgBase)
      }
    },

    /** 消息撤回 */
    onMessageRecalled: (payload: EventPayloadMap['onMessageRecalled']) => {
      if (payload.messageId) {
        stores.message.recallMessage(payload.messageId, '')
      }
    },

    /** 送达回执 */
    onMessageDelivered: (payload: EventPayloadMap['onMessageDelivered']) => {
      if (payload.messageId) {
        stores.message.updateMessageStatus(payload.messageId, MESSAGE_STATUS.DELIVERED)
      }
    },

    /** 消息已读回执 */
    onMessageRead: (payload: EventPayloadMap['onMessageRead']) => {
      for (const item of payload) {
        if (!item.messageId) continue

        // 群已读回执
        if (item.conversationType === 'groupChat' && item.ackContent) {
          try {
            const parsed = JSON.parse(item.ackContent)
            const groupReadCount = parsed?.count
            if (typeof groupReadCount === 'number') {
              stores.message.updateMessageById(item.messageId, { groupReadCount })
            }
          } catch {
            // ackContent 不是 JSON，忽略
          }
          continue
        }

        // 单聊已读回执
        stores.message.updateMessageStatus(item.messageId, MESSAGE_STATUS.READ)
      }
    },

    /** 会话已读回执 */
    onConversationRead: (payload: EventPayloadMap['onConversationRead']) => {
      if (payload.conversationId) {
        stores.conversation.updateUnreadCount(payload.conversationId, 0)
      }
    },

    /** 消息被编辑 */
    onMessageUpdated: (payload: EventPayloadMap['onMessageUpdated']) => {
      const currentUser = stores.client.currentUser
      const uiMsg = convertSdkMessageToUiMessage(payload.message as unknown as SdkMsgBase, currentUser)
      stores.message.applyModifiedMessage(uiMsg)
    },

    /** 消息置顶/取消置顶事件 */
    onPinnedMessageChanged: (payload: EventPayloadMap['onPinnedMessageChanged']) => {
      if (!payload || !payload.messageId) return
      if (payload.operation === 'pin') {
        stores.message.setMessagePinned(payload.messageId, {
          operatorId: payload.operatorId || '',
          pinTime: payload.pinTime || Date.now(),
        })
      } else if (payload.operation === 'unpin') {
        stores.message.setMessageUnpinned(payload.messageId)
      }
    },
  }

  return handler
}
