import type { UIKitClient } from './client'
import type { EasemobChat } from 'easemob-websdk'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'

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
        type: 'text',
        body: { msg: msg.msg },
        timestamp: msg.time || Date.now(),
        status: 'sent',
        isSelf: false,
      })
      stores.conversation.addConversation({
        id: msg.to,
        name: msg.from || '',
        lastMessage: msg.msg || '',
        lastMessageTime: msg.time || Date.now(),
        type: 'single',
      })
    },
    onImageMessage: (msg: EasemobChat.ImgMsgBody) => {
      stores.message.addMessage({
        id: msg.id,
        conversationId: msg.to,
        from: msg.from || '',
        to: msg.to,
        type: 'image',
        body: { url: msg.url, thumb: msg.thumb },
        timestamp: msg.time || Date.now(),
        status: 'sent',
        isSelf: false,
      })
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
