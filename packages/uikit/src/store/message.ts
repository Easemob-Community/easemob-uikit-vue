import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Message {
  id: string
  conversationId: string
  from: string
  to: string
  type: 'text' | 'image' | 'voice' | 'video' | 'file'
  body: Record<string, any>
  timestamp: number
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isSelf: boolean
}

export const useMessageStore = defineStore('message', () => {
  const messageMap = ref<Record<string, Message[]>>({})
  const sendingMessages = ref<Set<string>>(new Set())

  function getMessages(conversationId: string): Message[] {
    return messageMap.value[conversationId] || []
  }

  function addMessage(msg: Message) {
    const list = messageMap.value[msg.conversationId] || []
    const exists = list.find((m: Message) => m.id === msg.id)
    if (!exists) {
      list.push(msg)
      messageMap.value[msg.conversationId] = list
    }
  }

  function updateMessageStatus(msgId: string, status: Message['status']) {
    for (const key in messageMap.value) {
      const msg = messageMap.value[key].find((m: Message) => m.id === msgId)
      if (msg) {
        msg.status = status
        break
      }
    }
  }

  function deleteMessage(msgId: string) {
    for (const key in messageMap.value) {
      messageMap.value[key] = messageMap.value[key].filter((m: Message) => m.id !== msgId)
    }
  }

  function clearMessages(conversationId: string) {
    delete messageMap.value[conversationId]
  }

  return {
    messageMap,
    sendingMessages,
    getMessages,
    addMessage,
    updateMessageStatus,
    deleteMessage,
    clearMessages,
  }
})
