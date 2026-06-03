import type { EventPayloadMap } from 'im-sdk-web'
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
        // 单聊：自动发消息已读回执
        if (!isGroup && uiMsg.serverId) {
          clientInstance.conversation.sendMessageReadAck({
            conversationId,
            conversationType: uiMsg.conversationType,
            messageId: uiMsg.serverId,
          }).catch((e: unknown) => console.warn('[EventHandler] sendMessageReadAck failed:', e))
        }
        // 群已读回执：若消息携带 allowGroupAck，自动回复
        if (uiMsg.requireGroupAck && isGroup) {
          clientInstance.conversation.sendGroupMessageReadAck({
            groupId: sdkMsg.to || conversationId,
            messageId: uiMsg.serverId,
          }).catch((e: unknown) => console.warn('[EventHandler] sendGroupMessageReadAck failed:', e))
        }
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
      if (!payload.messageId) return

      // 群已读回执
      if (payload.isGroupAck) {
        const ackContent = payload.ackContent
        if (ackContent) {
          try {
            const parsed = JSON.parse(ackContent)
            const groupReadCount = parsed?.count
            if (typeof groupReadCount === 'number') {
              stores.message.updateMessageById(payload.messageId, { groupReadCount })
            }
          } catch {
            // ackContent 不是 JSON，忽略
          }
        }
        return
      }

      // 单聊已读回执
      stores.message.updateMessageStatus(payload.messageId, MESSAGE_STATUS.READ)
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
