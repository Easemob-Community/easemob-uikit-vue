import type { UIKitClient } from './client'
import type { EasemobChat } from 'easemob-websdk'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'
import { MESSAGE_TYPE, MESSAGE_STATUS, CONVERSATION_TYPE } from '../constants'

export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  client: ReturnType<typeof useClientStore>
  conversation: ReturnType<typeof useConversationStore>
}

export function createEventHandler(client: UIKitClient, stores: RootStores) {
  const handler: EasemobChat.EventHandlerType = {
    onTextMessage: (msg: EasemobChat.TextMsgBody) => {
      stores.message.addMessage({
        id: msg.id,
        conversationId: msg.to,
        from: msg.from || '',
        to: msg.to,
        type: MESSAGE_TYPE.TXT,
        body: { msg: msg.msg },
        timestamp: msg.time || Date.now(),
        status: MESSAGE_STATUS.SENT,
        isSelf: false,
      })
      stores.conversation.addConversation({
        id: msg.to,
        name: msg.from || '',
        lastMessage: msg.msg || '',
        lastMessageTime: msg.time || Date.now(),
        type: CONVERSATION_TYPE.SINGLECHAT,
      })
    },
    onImageMessage: (msg: EasemobChat.ImgMsgBody) => {
      stores.message.addMessage({
        id: msg.id,
        conversationId: msg.to,
        from: msg.from || '',
        to: msg.to,
        type: MESSAGE_TYPE.IMG,
        body: { url: msg.url, thumb: msg.thumb },
        timestamp: msg.time || Date.now(),
        status: MESSAGE_STATUS.SENT,
        isSelf: false,
      })
    },
    /** 会话已读回执：对方已读，将本地对应会话未读数置为 0 */
    onChannelMessage: (msg: any) => {
      const conversationId = msg.from
      if (conversationId) {
        stores.conversation.updateUnreadCount(conversationId, 0)
      }
    },
    /** 多设备事件同步：置顶/取消置顶/删除会话 */
    onMultiDeviceEvent: (event: any) => {
      const { operation, conversationId, conversationType } = event
      if (operation === 'pinnedConversation') {
        stores.conversation.togglePin(conversationId, true, event.timestamp)
      } else if (operation === 'unpinnedConversation') {
        stores.conversation.togglePin(conversationId, false)
      } else if (operation === 'deleteConversation') {
        stores.conversation.deleteConversation(conversationId)
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
