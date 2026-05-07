import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import { MESSAGE_STATUS } from '../constants'

export function useMessage() {
  const { stores } = useUIKit()
  const messageStore = stores.message

  function getMessages(conversationId: string) {
    return computed(() => messageStore.getMessages(conversationId))
  }

  function deleteMessage(msgId: string) {
    messageStore.deleteMessage(msgId)
  }

  function recallMessage(msgId: string) {
    messageStore.updateMessageStatus(msgId, MESSAGE_STATUS.FAILED)
    // TODO: call SDK recall
  }

  return {
    getMessages,
    deleteMessage,
    recallMessage,
  }
}
