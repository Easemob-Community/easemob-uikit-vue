import { computed } from 'vue'
import { useUIKit } from './use-uikit'

export function useConversation() {
  const { stores } = useUIKit()
  const conversationStore = stores.conversation

  const conversationList = computed(() => conversationStore.conversationList)
  const currentConversation = computed(() => conversationStore.currentConversation)

  function selectConversation(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (cvs) {
      conversationStore.setCurrentConversation(cvs)
    }
  }

  function deleteConversation(id: string) {
    conversationStore.deleteConversation(id)
  }

  return {
    conversationList,
    currentConversation,
    selectConversation,
    deleteConversation,
  }
}
