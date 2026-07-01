import { ref, computed } from 'vue'
import { useUIKit } from './use-uikit'
import { MESSAGE_STATUS } from '../constants'
import type { UiMessage, TextMessageBody } from '../sdk/types'

export function useMessageActions() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const messageStore = stores.message

  // 多选状态（模块级单例）
  const isMultiSelectMode = ref(false)
  const selectedMessageIds = ref<Set<string>>(new Set())

  const selectedMessages = computed(() => {
    const cvsId = conversationStore.currentConversationId
    if (!cvsId) return []
    const msgs = messageStore.getMessages(cvsId)
    return msgs.filter(msg => selectedMessageIds.value.has(msg.msgServerId || msg.msgLocalId))
  })

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

  function selectAllMessages(messages: UiMessage[]) {
    const validIds = messages
      .filter(m => m.status === MESSAGE_STATUS.SENT && !m.recalled)
      .map(m => m.msgServerId || m.msgLocalId)
    selectedMessageIds.value = new Set(validIds)
  }

  function deselectAllMessages() {
    selectedMessageIds.value.clear()
  }

  /** 撤回消息 */
  async function recallMessage(msgId: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    await domains.message.recall(cvs.id, cvs.type, msgId)
  }

  /** 删除本地消息 */
  function deleteMessage(msgId: string) {
    messageStore.deleteMessage(msgId)
  }

  /** 批量删除本地消息 */
  function deleteMessages(msgIds: string[]) {
    messageStore.deleteMessages(msgIds)
  }

  /** 翻译文本消息 */
  async function translateTextMessage(message: UiMessage, targetLang?: string) {
    if (message.type !== 'text') return
    const text = (message.body as TextMessageBody).content
    if (!text) return

    const lang = resolveTranslateLang(targetLang)
    const msgId = message.msgServerId || message.msgLocalId

    if (message.translation?.to === lang) {
      messageStore.toggleTranslation(msgId)
      return
    }

    messageStore.setTranslating(msgId, true)
    try {
      const result = await domains.message.translateMessage(message, [lang])
      const translation = result.translations[0]
      if (translation) {
        messageStore.setTranslation(msgId, translation)
      } else {
        messageStore.setTranslating(msgId, false)
      }
    } catch (e) {
      messageStore.setTranslating(msgId, false)
      throw e
    }
  }

  function toggleTranslation(msgId: string) {
    messageStore.toggleTranslation(msgId)
  }

  /** 置顶消息 */
  async function pinMessage(message: UiMessage) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message) return
    const msgId = message.msgServerId || message.msgLocalId
    await domains.message.pinMessage(cvs.id, cvs.type, msgId)
    messageStore.setMessagePinned(msgId, {
      operatorId: stores.client.currentUser || '',
      pinTime: Date.now(),
    })
  }

  /** 取消置顶 */
  async function unpinMessage(message: UiMessage) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message) return
    const msgId = message.msgServerId || message.msgLocalId
    await domains.message.unpinMessage(cvs.id, cvs.type, msgId)
    messageStore.setMessageUnpinned(msgId)
  }

  /** 获取置顶消息列表 */
  async function fetchPinnedMessages() {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    return domains.message.getPinnedMessages(cvs.id, cvs.type)
  }

  return {
    isMultiSelectMode,
    selectedMessageIds,
    selectedMessages,
    enterMultiSelectMode,
    exitMultiSelectMode,
    toggleMessageSelection,
    isMessageSelected,
    selectAllMessages,
    deselectAllMessages,
    recallMessage,
    deleteMessage,
    deleteMessages,
    translateTextMessage,
    toggleTranslation,
    pinMessage,
    unpinMessage,
    fetchPinnedMessages,
  }
}

function resolveTranslateLang(targetLang?: string): string {
  if (targetLang?.trim()) return targetLang.trim()
  return 'en'
}
