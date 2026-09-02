import { computed, ref } from 'vue'
import { MESSAGE_TYPE } from '@easemob/uikit-core'
import { useUIKit } from './use-uikit'
// 游标存储抽为独立模块：message store 的会话淘汰需直接清游标，
// 经 use-message-history 引用会形成 store → composable → use-uikit → store 循环
import { clearHistoryCursor, getHistoryCursor, setHistoryCursor } from './message-history-cursor'

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
        messages: result.list,
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
