import { computed, ref } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '../constants'
import type { ConversationTypeValue } from '../constants'
import type { UiMessage } from '../sdk/types'
import { isTextBody, isVoiceBody } from '../sdk/types'
import { useLocale } from '../locale'
import { formatSdkError } from '../utils/sdk-error'
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
    // type 判别优先：排除 UiNoticeMessage（其 body 结构上兼容 TextMessageBody，仅守卫无法排除）
    if (message.type !== MESSAGE_TYPE.TEXT)
      return
    if (!isTextBody(message.body))
      return
    const text = message.body.content
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
      // 已排除 UiNoticeMessage，窄化为 SDK 文本消息
      const result = await domains.message.translateMessage(message as SdkMessage, [lang])
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

  /** 语音消息转文字 */
  async function transcribeVoiceMessage(message: UiMessage) {
    // type 判别优先：排除 UiNoticeMessage，再以守卫校验 body 结构
    if (message.type !== MESSAGE_TYPE.VOICE)
      return
    if (!isVoiceBody(message.body))
      return
    if (!message.body.url)
      return

    const msgId = message.msgServerId || message.msgLocalId

    // 已转写完成：切换显示/隐藏
    if (message.voiceText?.text) {
      messageStore.toggleVoiceText(msgId)
      return
    }

    messageStore.setVoiceTranscribing(msgId, true)
    try {
      // 已排除 UiNoticeMessage，窄化为 SDK 语音消息
      const result = await domains.message.transcribeVoiceMessage(message as SdkMessage)
      const text = result?.text
      if (typeof text === 'string' && text.length > 0) {
        messageStore.setVoiceText(msgId, { text })
      }
      else {
        messageStore.setVoiceTranscribing(msgId, false)
      }
    }
    catch (e) {
      messageStore.setVoiceTranscribing(msgId, false)
      console.warn('[UIKit] voiceMessageToText raw error:', {
        code: (e as { code?: number | string }).code,
        message: e instanceof Error ? e.message : String(e),
        details: (e as { details?: unknown }).details,
        raw: formatSdkError(e),
      })
      throw e
    }
  }

  function toggleVoiceText(msgId: string) {
    messageStore.toggleVoiceText(msgId)
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
  async function refreshPinnedMessages(cvsId: string, cvsType: ConversationTypeValue) {
    try {
      await domains.message.getPinnedMessages(cvsId, cvsType)
    }
    catch (err) {
      console.warn('[UIKit] refresh pinned messages failed:', formatSdkError(err))
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
    transcribeVoiceMessage,
    toggleVoiceText,
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

/** 根据 SDK 语音转文字错误提取友好提示文案 */
export function resolveVoiceToTextErrorMessage(
  e: unknown,
  t: (key: string) => string,
): string {
  const code = (e as { code?: number | string })?.code
  if (code === 505 || code === '505')
    return t('message.voiceToText.noPermission') || '语音转文字服务未开通，请联系管理员开通'
  if (code === 408 || code === '408')
    return t('message.voiceToText.durationTooLong') || '语音时长超过限制'
  if (code === 411 || code === '411')
    return t('message.voiceToText.fileTooLarge') || '语音文件过大'
  if (code === 407 || code === '407')
    return t('message.voiceToText.fileInvalid') || '语音文件无效或已过期'
  if (code === 410 || code === '410')
    return t('message.voiceToText.uploadFailed') || '语音文件上传失败'
  return t('message.voiceToText.failed') || '语音转文字失败，请稍后重试'
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
