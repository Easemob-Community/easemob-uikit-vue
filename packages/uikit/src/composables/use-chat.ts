import { computed, ref } from 'vue'
import type { TextMessageBody, UiConversation, UiMessage } from '../sdk/types'
import { useMessageSend } from './use-message-send'
import { useMessageHistory } from './use-message-history'
import { useMessageActions } from './use-message-actions'
import { useUIKit } from './use-uikit'

const TYPING_DURATION = 5000

/**
 * useChat 是消息相关能力的薄聚合层。
 * 具体实现拆分到 useMessageSend / useMessageHistory / useMessageActions。
 */
export function useChat() {
  const { stores, domains } = useUIKit()
  const send = useMessageSend()
  const history = useMessageHistory()
  const actions = useMessageActions()

  const currentConversation = computed(() => stores.conversation.currentConversation)
  const editingMessage = ref<UiMessage | null>(null)

  function enterEditMode(message: UiMessage) {
    editingMessage.value = message
  }

  function exitEditMode() {
    editingMessage.value = null
  }

  /** 修改文本消息 */
  async function modifyTextMessage(message: UiMessage, text: string) {
    const cvs = currentConversation.value
    if (!cvs)
      return
    const msgId = message.msgServerId || message.msgLocalId
    await domains.message.modifyText(cvs.id, cvs.type, msgId, text)
    exitEditMode()
  }

  /** 发送输入状态命令 */
  async function sendTypingCmd() {
    // 输入状态通过 CMD 消息实现，本期先占位
  }

  /** 标记某条消息已读 */
  async function sendReadAckForMessage(message: UiMessage) {
    const cvs = currentConversation.value
    if (!cvs)
      return
    await domains.message.markRead(cvs.id, cvs.type, message.msgServerId || message.msgLocalId)
  }

  /** 获取群已读详情 */
  async function fetchGroupReadDetail(msgId: string, groupId: string) {
    return domains.message.fetchGroupReadDetail(groupId, msgId)
  }

  /** 逐条转发 */
  async function forwardMessage(message: UiMessage, target: UiConversation) {
    switch (message.type) {
      case 'text':
        return domains.message.sendText(target.id, target.type, (message.body as TextMessageBody).content || '', message.ext)
      case 'custom':
        return // TODO
      default:
        console.warn('[useChat] forwardMessage: unsupported type', message.type)
    }
  }

  /** 合并转发 */
  async function forwardCombineMessages(messages: UiMessage[], target: UiConversation) {
    // TODO: 接入 createCombineMessage
    console.warn('[useChat] forwardCombineMessages not implemented', messages.length, target.id)
  }

  function setTyping() {
    // 占位：实际通过 timer 控制
  }

  return {
    // 当前会话
    currentConversation,

    // 来自 useMessageHistory
    messages: history.messages,
    loadingHistory: history.loading,
    fetchHistoryMessages: history.fetchHistoryMessages,
    getHistoryCursor: history.getHistoryCursor,
    clearHistoryCursor: history.clearHistoryCursor,

    // 来自 useMessageSend
    sendTextMessage: send.sendTextMessage,
    sendImageMessage: send.sendImageMessage,
    sendFileMessage: send.sendFileMessage,
    sendAudioMessage: send.sendAudioMessage,
    sendVideoMessage: send.sendVideoMessage,
    sendLocationMessage: send.sendLocationMessage,
    sendCustomMessage: send.sendCustomMessage,
    sendCmdMessage: send.sendCmdMessage,
    resendMessage: send.resendMessage,

    // 编辑/输入状态/转发
    editingMessage,
    enterEditMode,
    exitEditMode,
    modifyTextMessage,
    sendTypingCmd,
    sendReadAckForMessage,
    fetchGroupReadDetail,
    forwardMessage,
    forwardCombineMessages,
    setTyping,
    TYPING_DURATION,

    // 来自 useMessageActions
    isMultiSelectMode: actions.isMultiSelectMode,
    selectedMessageIds: actions.selectedMessageIds,
    selectedMessages: actions.selectedMessages,
    enterMultiSelectMode: actions.enterMultiSelectMode,
    exitMultiSelectMode: actions.exitMultiSelectMode,
    toggleMessageSelection: actions.toggleMessageSelection,
    isMessageSelected: actions.isMessageSelected,
    selectAllMessages: actions.selectAllMessages,
    deselectAllMessages: actions.deselectAllMessages,
    recallMessage: actions.recallMessage,
    deleteMessage: actions.deleteMessage,
    deleteMessages: actions.deleteMessages,
    translateTextMessage: actions.translateTextMessage,
    toggleTranslation: actions.toggleTranslation,
    pinMessage: actions.pinMessage,
    unpinMessage: actions.unpinMessage,
    fetchPinnedMessages: actions.fetchPinnedMessages,
  }
}
