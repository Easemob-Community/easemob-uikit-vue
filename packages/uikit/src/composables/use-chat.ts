import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import type { Message } from '../store/message'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '../constants'

// ===== 多选模式状态（模块级单例，确保同一页面内多处调用共享同一份状态） =====
const isMultiSelectMode = ref(false)
const selectedMessageIds = ref<Set<string>>(new Set())

function enterMultiSelectMode() {
  isMultiSelectMode.value = true
  selectedMessageIds.value.clear()
}

function exitMultiSelectMode() {
  isMultiSelectMode.value = false
  selectedMessageIds.value.clear()
}

function toggleMessageSelection(msgId: string) {
  if (selectedMessageIds.value.has(msgId)) {
    selectedMessageIds.value.delete(msgId)
  } else {
    selectedMessageIds.value.add(msgId)
  }
}

function isMessageSelected(msgId: string): boolean {
  return selectedMessageIds.value.has(msgId)
}

export function useChat() {
  const { stores } = useUIKit()
  const messageStore = stores.message
  const conversationStore = stores.conversation

  const messages = computed(() => {
    const cvsId = conversationStore.currentConversation?.id
    return cvsId ? messageStore.getMessages(cvsId) : []
  })

  const currentConversation = computed(() => conversationStore.currentConversation)

  const selectedMessages = computed(() =>
    messages.value.filter((msg) => selectedMessageIds.value.has(msg.id))
  )

  function sendMessage(body: Record<string, any>, type: Message['type'] = MESSAGE_TYPE.TXT) {
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
      status: MESSAGE_STATUS.SENDING,
      isSelf: true,
    }

    messageStore.addMessage(msg)
    // TODO: call SDK client.sendMessage
  }

  return {
    messages,
    currentConversation,
    sendMessage,
    // 多选相关
    isMultiSelectMode,
    selectedMessages,
    selectedMessageIds,
    enterMultiSelectMode,
    exitMultiSelectMode,
    toggleMessageSelection,
    isMessageSelected,
  }
}
