import { computed, ref } from 'vue'
import { MESSAGE_STATUS } from '../constants'
import type { TextMessageBody, UiMessage } from '../sdk/types'
import { useLocale } from '../locale'
import { useToast } from './use-toast'
import { useUIKit } from './use-uikit'

/** 多选状态（模块级单例，保证跨组件共享） */
const isMultiSelectMode = ref(false)
const selectedMessageIds = ref<Set<string>>(new Set())

/** 重置多选状态（登出等全局清理场景使用） */
export function resetMultiSelectState() {
  isMultiSelectMode.value = false
  selectedMessageIds.value.clear()
}

export function useMessageActions() {
  const { domains, stores } = useUIKit()
  const { t } = useLocale()
  const toast = useToast()
  const conversationStore = stores.conversation
  const messageStore = stores.message

  const selectedMessages = computed(() => {
    const cvsId = conversationStore.currentConversationId
    if (!cvsId)
      return []
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
    }
    else {
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
    if (!cvs)
      return
    try {
      await domains.message.recall(cvs.id, cvs.type, msgId)
      // 0.14.224 起 SDK 不再在当前操作设备伪造 onMessageRecalled，本地直接更新
      messageStore.recallMessage(msgId, stores.client.currentUser)
    }
    catch (error) {
      const reason = extractErrorReason(error)
      showRecallErrorToast(reason, t, toast)
      throw error
    }
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
    if (message.type !== 'text')
      return
    const text = (message.body as TextMessageBody).content
    if (!text)
      return

    const lang = resolveTranslateLang(targetLang)
    const msgId = message.msgServerId || message.msgLocalId

    if (message.translation?.to === lang) {
      messageStore.toggleTranslation(msgId)
      return
    }

    messageStore.setTranslating(msgId, true)
    try {
      const result = await domains.message.translateMessage(message, [lang])
      const translation = result?.translations?.[0]
      if (translation) {
        messageStore.setTranslation(msgId, translation)
      }
      else {
        messageStore.setTranslating(msgId, false)
      }
    }
    catch (e) {
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
    if (!cvs || !message)
      return
    const msgId = message.msgServerId || message.msgLocalId
    await domains.message.pinMessage(cvs.id, cvs.type, msgId)
    messageStore.setMessagePinned(msgId, {
      operatorId: stores.client.currentUser || '',
      pinTime: Date.now(),
    })
    // 0.14.223 起 SDK 不再在当前操作设备伪造 onPinnedMessageChanged，本地刷新置顶列表
    await refreshPinnedMessages(cvs.id, cvs.type)
  }

  /** 取消置顶 */
  async function unpinMessage(message: UiMessage) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message)
      return
    const msgId = message.msgServerId || message.msgLocalId
    await domains.message.unpinMessage(cvs.id, cvs.type, msgId)
    messageStore.setMessageUnpinned(msgId)
    // 0.14.223 起 SDK 不再在当前操作设备伪造 onPinnedMessageChanged，本地刷新置顶列表
    await refreshPinnedMessages(cvs.id, cvs.type)
  }

  /** 刷新置顶列表；失败仅告警，不影响已完成的置顶操作 */
  async function refreshPinnedMessages(cvsId: string, cvsType: 'singleChat' | 'groupChat') {
    try {
      await domains.message.getPinnedMessages(cvsId, cvsType)
    }
    catch (err) {
      console.warn('[UIKit] refresh pinned messages failed:', err)
    }
  }

  /** 获取置顶消息列表 */
  async function fetchPinnedMessages() {
    const cvs = conversationStore.currentConversation
    if (!cvs)
      return
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
  if (targetLang?.trim())
    return targetLang.trim()
  return 'en'
}

function extractErrorReason(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  if (error && typeof error === 'object' && 'reason' in error && typeof error.reason === 'string')
    return error.reason
  return String(error)
}

function showRecallErrorToast(
  reason: string,
  t: (key: string) => string,
  toast: ReturnType<typeof useToast>,
): void {
  const lower = reason.toLowerCase()
  if (lower.includes('recall disabled') || lower.includes('disabled')) {
    toast.warning(t('message.recall.disabled'))
    return
  }
  if (lower.includes('time limit') || lower.includes('expired') || lower.includes('timeout')) {
    toast.warning(t('message.recall.timeLimit'))
    return
  }
  toast.error(t('message.recall.failed'))
}
