import { computed, ref } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import type { CustomMessageBody, FileMessageBody, ImageMessageBody, LocationMessageBody, TextMessageBody, UiConversation, UiMessage, VideoMessageBody, VoiceMessageBody } from '../sdk/types'
import { extractLastMessageText } from '../sdk/adapter/message-adapter'
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
    const { id, type } = target
    switch (message.type) {
      case 'text':
        return domains.message.sendText(id, type, (message.body as TextMessageBody).content || '', message.ext)
      case 'image': {
        const url = (message.body as ImageMessageBody).originalImageUrl
          || (message.body as ImageMessageBody).bigImageUrl
          || (message.body as ImageMessageBody).thumbnailUrl
          || (message.body as ImageMessageBody).localUrl
        if (!url) {
          console.warn('[useChat] forwardMessage: image url not found')
          return
        }
        return domains.message.sendImage(id, type, url, message.ext)
      }
      case 'file': {
        const url = (message.body as FileMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: file url not found')
          return
        }
        return domains.message.sendFile(id, type, url, message.ext)
      }
      case 'voice': {
        const url = (message.body as VoiceMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: voice url not found')
          return
        }
        return domains.message.sendVoice(id, type, url, (message.body as VoiceMessageBody).duration || 0, message.ext)
      }
      case 'video': {
        const url = (message.body as VideoMessageBody).url
          || (message.body as VideoMessageBody).thumbnailUrl
        if (!url) {
          console.warn('[useChat] forwardMessage: video url not found')
          return
        }
        return domains.message.sendVideo(id, type, url, (message.body as VideoMessageBody).duration || 0, message.ext)
      }
      case 'location':
        return domains.message.sendLocation(
          id,
          type,
          (message.body as LocationMessageBody).latitude,
          (message.body as LocationMessageBody).longitude,
          (message.body as LocationMessageBody).address,
          message.ext,
        )
      case 'custom':
        return domains.message.sendCustom(
          id,
          type,
          (message.body as CustomMessageBody).event || '',
          (message.body as CustomMessageBody).params,
          message.ext,
        )
      case 'combine':
        // 合并消息逐条转发：作为单个合并消息重新发送
        return forwardCombineMessages([message], target)
      default:
        console.warn('[useChat] forwardMessage: unsupported type', message.type)
    }
  }

  /**
   * 解析消息发送者的显示名称。
   * 优先级：联系人备注 > 用户资料昵称 > ext 快照昵称 > userId。
   */
  function resolveSenderName(m: UiMessage): string {
    const from = m.from || ''
    // 1. 联系人备注
    const contact = stores.contact.getContact(from)
    if (contact?.remark)
      return contact.remark
    // 2. 用户资料昵称
    const userInfo = stores.userInfo.getUserInfo(from)
    if (userInfo?.nickname)
      return userInfo.nickname
    // 3. 消息 ext 中携带的 UIKit 用户信息快照
    const extInfo = m.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
    if (extInfo?.nickname)
      return extInfo.nickname
    if (extInfo?.remark)
      return extInfo.remark
    // 4. userId 兜底
    return from
  }

  /** 合并转发 */
  async function forwardCombineMessages(messages: UiMessage[], target: UiConversation) {
    if (messages.length === 0)
      return
    const { id, type } = target
    const title = type === 'groupChat' ? (target.name || id) : '聊天记录'
    const summary = messages.map(m => `${resolveSenderName(m)}: ${extractLastMessageText(m)}`).join('\n')
    const compatibleText = '[聊天记录]'
    return domains.message.sendCombine(
      id,
      type,
      title,
      summary,
      compatibleText,
      messages as unknown as SdkMessage[],
    )
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
