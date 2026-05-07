import type { ChatClient, ChatEventHandler, ChatMessage } from './types'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'

export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  client: ReturnType<typeof useClientStore>
  conversation: ReturnType<typeof useConversationStore>
}

export function createEventHandler(client: ChatClient, stores: RootStores) {
  const handler: ChatEventHandler = {
    onTextMessage: (msg: ChatMessage) => {
      stores.message.addMessage({
        id: msg.id,
        conversationId: msg.to,
        from: msg.from,
        to: msg.to,
        type: 'text',
        body: msg.body,
        timestamp: msg.timestamp,
        status: 'sent',
        isSelf: false,
      })
      stores.conversation.addConversation({
        id: msg.to,
        name: msg.from,
        lastMessage: msg.body.msg || '',
        lastMessageTime: msg.timestamp,
        type: 'single',
      })
    },
    onConnected: () => {
      stores.client.setConnected(true)
    },
    onDisconnected: () => {
      stores.client.setConnected(false)
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
