import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import type { Message } from '../store/message'

export function useChat() {
  const { stores } = useUIKit()
  const messageStore = stores.message
  const conversationStore = stores.conversation

  const messages = computed(() => {
    const cvsId = conversationStore.currentConversation?.id
    return cvsId ? messageStore.getMessages(cvsId) : []
  })

  const currentConversation = computed(() => conversationStore.currentConversation)

  function sendMessage(body: Record<string, any>, type: Message['type'] = 'text') {
    const cvs = conversationStore.currentConversation
    if (!cvs) return

    const msg: Message = {
      id: Date.now().toString(),
      conversationId: cvs.id,
      from: stores.client.currentUser,
      to: cvs.id,
      type,
      body,
      timestamp: Date.now(),
      status: 'sending',
      isSelf: true,
    }

    messageStore.addMessage(msg)
    // TODO: call SDK client.sendMessage
  }

  return {
    messages,
    currentConversation,
    sendMessage,
  }
}
