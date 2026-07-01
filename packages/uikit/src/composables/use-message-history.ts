import { ref, computed } from 'vue'
import { useUIKit } from './use-uikit'

export function useMessageHistory() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const messageStore = stores.message

  const loading = ref(false)
  const historyCursorMap = ref<Record<string, { cursor: string; isLast: boolean }>>({})

  const messages = computed(() => {
    const cvsId = conversationStore.currentConversationId
    return cvsId ? messageStore.getMessages(cvsId) : []
  })

  function getHistoryCursor(conversationId: string) {
    return historyCursorMap.value[conversationId] || { cursor: '', isLast: false }
  }

  function setHistoryCursor(conversationId: string, cursor: string, isLast: boolean) {
    historyCursorMap.value[conversationId] = { cursor, isLast }
  }

  function clearHistoryCursor(conversationId: string) {
    delete historyCursorMap.value[conversationId]
  }

  /** 拉取历史消息 */
  async function fetchHistoryMessages(cursor?: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return { messages: [], cursor: '', isLast: true }

    const cached = getHistoryCursor(cvs.id)
    const actualCursor = cursor ?? cached.cursor

    loading.value = true
    try {
      const result = await domains.message.fetchHistory(cvs.id, cvs.type, actualCursor)
      const newCursor = result.cursor || ''
      const isLast = !result.hasMore
      setHistoryCursor(cvs.id, newCursor, isLast)
      return {
        messages: result.items,
        cursor: newCursor,
        isLast,
      }
    } finally {
      loading.value = false
    }
  }

  return {
    messages,
    loading,
    fetchHistoryMessages,
    getHistoryCursor,
    setHistoryCursor,
    clearHistoryCursor,
  }
}
