import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import { useMessageHistory } from './use-message-history'
import { useMessageActions } from './use-message-actions'

/**
 * useMessage 是消息查询与操作的聚合入口。
 * 新代码建议直接使用 useMessageHistory / useMessageActions。
 */
export function useMessage() {
  const { stores } = useUIKit()
  const history = useMessageHistory()
  const actions = useMessageActions()
  const messageStore = stores.message

  function getMessages(conversationId: string) {
    return computed(() => messageStore.getMessages(conversationId))
  }

  return {
    getMessages,
    messages: history.messages,
    fetchHistoryMessages: history.fetchHistoryMessages,
    deleteMessage: actions.deleteMessage,
    recallMessage: actions.recallMessage,
  }
}
