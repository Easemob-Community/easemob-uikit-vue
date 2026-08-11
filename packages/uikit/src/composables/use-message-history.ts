import { computed, ref } from 'vue'
import { MESSAGE_TYPE } from '../constants'
import { useUIKit } from './use-uikit'

/** 历史消息游标（模块级单例，保证首屏拉取与上滑加载共享同一份游标） */
const historyCursorMap = ref<Record<string, { cursor: string, isLast: boolean }>>({})

export function useMessageHistory() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const messageStore = stores.message

  const loading = ref(false)

  const messages = computed(() => {
    const cvsId = conversationStore.currentConversationId
    const list = cvsId ? messageStore.getMessages(cvsId) : []
    // CMD 透传消息不做 UI 渲染，即使因异常进入 store 也在展示层兜底过滤
    return list.filter(msg => msg.type !== MESSAGE_TYPE.CMD)
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
    if (!cvs)
      return { messages: [], cursor: '', isLast: true }

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
    }
    finally {
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
