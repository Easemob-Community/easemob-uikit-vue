import type { UIKitClient } from './client'
import type { EasemobChat } from 'easemob-websdk'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'
import { MESSAGE_STATUS, CONVERSATION_TYPE } from '../constants'
import type { Message } from '../store/message'
import type { ConversationTypeValue } from '../constants'

export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  client: ReturnType<typeof useClientStore>
  conversation: ReturnType<typeof useConversationStore>
}

/**
 * SDK 内容消息共有的基础字段（用于 resolveConversationId）
 * 等价于 ExcludeAckMessageBody 各变体的公共字段
 */
interface SdkMsgBase {
  id: string
  from?: string
  to?: string
  time?: number
  chatType?: EasemobChat.ChatType
  ext?: { [key: string]: any }
}

/**
 * 从 SDK 消息中计算 conversationId
 * - 群聊：msg.to 即群 ID
 * - 单聊：取对方 ID（msg.from === 当前用户 ? msg.to : msg.from）
 */
function resolveConversationId(msg: SdkMsgBase, currentUser: string): string {
  const isGroup = msg.chatType === 'groupChat'
  return (isGroup ? msg.to : (msg.from === currentUser ? msg.to : msg.from)) || ''
}

export function createEventHandler(client: UIKitClient, stores: RootStores) {
  /**
   * 公共处理逻辑：将 SDK 消息写入 messageStore 并更新会话列表
   * 直接展开 SDK 消息的所有原生字段 + 追加 UI 扩展字段，不做 body 映射
   */
  function handleIncomingMessage(
    msg: EasemobChat.ExcludeAckMessageBody,
    lastMessageText: string,
  ) {
    const currentUser = stores.client.currentUser
    const isGroup = msg.chatType === 'groupChat'
    const chatType: ConversationTypeValue = isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT
    const conversationId = resolveConversationId(msg, currentUser)

    // 直接展开 SDK 原生字段，追加 UI 扩展字段
    const uiMsg: Message = {
      ...msg,
      conversationId,
      isSelf: false,
      status: MESSAGE_STATUS.SENT,
      timestamp: msg.time || Date.now(),
    } as Message

    stores.message.addMessage(uiMsg)

    // 更新会话列表
    stores.conversation.addConversation({
      id: conversationId,
      name: isGroup ? (msg.to || '') : (msg.from || ''),
      lastMessage: lastMessageText,
      lastMessageTime: msg.time || Date.now(),
      lastMessageType: msg.type as ConversationTypeValue,
      lastMessageSender: msg.from || '',
      type: chatType,
    })

    // 非当前会话的消息增加未读数
    const currentCvsId = stores.conversation.currentConversation?.id
    if (conversationId !== currentCvsId) {
      const cvs = stores.conversation.conversationList.find((c) => c.id === conversationId)
      if (cvs) {
        stores.conversation.updateUnreadCount(conversationId, (cvs.unreadCount || 0) + 1)
      }
    }
  }

  const handler: EasemobChat.EventHandlerType = {
    onTextMessage: (msg: EasemobChat.TextMsgBody) => {
      handleIncomingMessage(msg, msg.msg || '')
    },

    onImageMessage: (msg: EasemobChat.ImgMsgBody) => {
      handleIncomingMessage(msg, '[图片]')
    },

    onAudioMessage: (msg: EasemobChat.AudioMsgBody) => {
      handleIncomingMessage(msg, '[语音]')
    },

    onVideoMessage: (msg: EasemobChat.VideoMsgBody) => {
      handleIncomingMessage(msg, '[视频]')
    },

    onFileMessage: (msg: EasemobChat.FileMsgBody) => {
      handleIncomingMessage(msg, '[文件]')
    },

    /** 送达回执：对方已收到消息，更新本地消息状态为 delivered */
    onDeliveredMessage: (msg: EasemobChat.DeliveryMsgBody) => {
      const msgId = msg.ackId || msg.mid || msg.id
      if (msgId) {
        stores.message.updateMessageStatus(msgId, MESSAGE_STATUS.DELIVERED)
      }
    },

    /** 会话已读回执：对方已读，将本地对应会话未读数置为 0 */
    onChannelMessage: (msg: EasemobChat.ChannelMsgBody) => {
      const conversationId = msg.from || msg.to
      if (conversationId) {
        stores.conversation.updateUnreadCount(conversationId, 0)
      }
    },

    /** 多设备事件同步：置顶/取消置顶/删除会话 */
    onMultiDeviceEvent: (event: EasemobChat.MultiDeviceEvent) => {
      if ('operation' in event && 'conversationId' in event) {
        const info = event as EasemobChat.ConversationChangedInfo
        if (info.operation === 'pinnedConversation') {
          stores.conversation.togglePin(info.conversationId, true, info.timestamp)
        } else if (info.operation === 'unpinnedConversation') {
          stores.conversation.togglePin(info.conversationId, false)
        } else if (info.operation === 'deleteConversation') {
          stores.conversation.deleteConversation(info.conversationId)
        }
      }
    },

    onConnected: () => {
      stores.client.setConnected(true)
    },
    onDisconnected: () => {
      stores.client.setConnected(false)
      stores.client.setCurrentUser('')
    },
    onError: (error) => {
      console.error('[UIKit SDK Error]', error)
    },
  }

  client.addEventHandler('uikit', handler)

  return {
    dispose: () => client.removeEventHandler('uikit'),
  }
}
