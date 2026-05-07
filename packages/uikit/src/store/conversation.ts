import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: number
  unreadCount?: number
  type: 'single' | 'group'
}

export const useConversationStore = defineStore('conversation', () => {
  const conversationList = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)

  function addConversation(cvs: Conversation) {
    const index = conversationList.value.findIndex((item: Conversation) => item.id === cvs.id)
    if (index > -1) {
      conversationList.value[index] = { ...conversationList.value[index], ...cvs }
    } else {
      conversationList.value.unshift(cvs)
    }
  }

  function deleteConversation(id: string) {
    conversationList.value = conversationList.value.filter((item: Conversation) => item.id !== id)
    if (currentConversation.value?.id === id) {
      currentConversation.value = null
    }
  }

  function setCurrentConversation(cvs: Conversation | null) {
    currentConversation.value = cvs
  }

  function updateUnreadCount(id: string, count: number) {
    const cvs = conversationList.value.find((item: Conversation) => item.id === id)
    if (cvs) {
      cvs.unreadCount = count
    }
  }

  function clearConversationList() {
    conversationList.value = []
    currentConversation.value = null
  }

  return {
    conversationList,
    currentConversation,
    addConversation,
    deleteConversation,
    setCurrentConversation,
    updateUnreadCount,
    clearConversationList,
  }
})
