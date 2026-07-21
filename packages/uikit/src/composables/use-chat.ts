import { computed, ref, toRaw } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import type { CustomMessageBody, FileMessageBody, ImageMessageBody, LocationMessageBody, TextMessageBody, UiConversation, UiMessage, VideoMessageBody, VoiceMessageBody } from '../sdk/types'
import { extractLastMessageText } from '../sdk/adapter/message-adapter'
import { useMessageSend } from './use-message-send'
import { useMessageHistory } from './use-message-history'
import { useMessageActions } from './use-message-actions'
import { useUIKit } from './use-uikit'

/**
 * 将 UiMessage 转换为干净的 SDK Message 对象。
 * 剥离 UiMessage 扩展字段（isSelf / localId / recalled / pinned /
 * translation / progress 等），仅保留 SDK Message 接口定义的字段。
 * 通过 toRaw 解包 Vue reactive proxy，避免 SDK createCombineMessage
 * 编码合并载荷时把 Vue 内部属性也序列化进去。
 * 不剥离扩展字段会导致合并文件载荷异常偏大，
 * 服务端可能无法正确存储/检索该消息。
 */
function toCleanSdkMessage(msg: UiMessage): SdkMessage {
  // toRaw 解包 Vue reactive proxy
  const raw = toRaw(msg)
  // 解构剥离所有 UiMessage 扩展字段
  const {
    isSelf: _isSelf,
    localId: _localId,
    requireGroupAck: _requireGroupAck,
    groupMemberCount: _groupMemberCount,
    recalled: _recalled,
    recalledBy: _recalledBy,
    originalMsg: _originalMsg,
    pinned: _pinned,
    pinTime: _pinTime,
    pinOperatorId: _pinOperatorId,
    translation: _translation,
    showTranslation: _showTranslation,
    translating: _translating,
    failReason: _failReason,
    progress: _progress,
    modified: _modified,
    ...sdkMsg
  } = raw
  return sdkMsg as unknown as SdkMessage
}

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
    // 0.14.224 起 SDK 不再在当前操作设备伪造 onMessageUpdated，本地直接更新
    stores.message.applyModifiedMessage({
      ...message,
      body: { ...(message.body as TextMessageBody), content: text },
      modified: true,
      modifiedInfo: {
        operatorId: stores.client.currentUser || '',
        operationCount: (message.modifiedInfo?.operationCount ?? 0) + 1,
        operationTime: Date.now(),
      },
    })
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
    // 解包 ext 的 reactive proxy，避免 Vue 内部属性干扰 SDK 序列化
    const ext = message.ext ? JSON.parse(JSON.stringify(toRaw(message.ext))) : undefined
    switch (message.type) {
      case 'text':
        return domains.message.sendText(id, type, (message.body as TextMessageBody).content || '', ext)
      case 'image': {
        const url = (message.body as ImageMessageBody).originalImageUrl
          || (message.body as ImageMessageBody).bigImageUrl
          || (message.body as ImageMessageBody).thumbnailUrl
          || (message.body as ImageMessageBody).localUrl
        if (!url) {
          console.warn('[useChat] forwardMessage: image url not found')
          return
        }
        return domains.message.sendImage(id, type, url, ext)
      }
      case 'file': {
        const url = (message.body as FileMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: file url not found')
          return
        }
        return domains.message.sendFile(id, type, url, ext)
      }
      case 'voice': {
        const url = (message.body as VoiceMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: voice url not found')
          return
        }
        return domains.message.sendVoice(id, type, url, (message.body as VoiceMessageBody).duration || 0, ext)
      }
      case 'video': {
        const url = (message.body as VideoMessageBody).url
          || (message.body as VideoMessageBody).thumbnailUrl
        if (!url) {
          console.warn('[useChat] forwardMessage: video url not found')
          return
        }
        return domains.message.sendVideo(id, type, url, (message.body as VideoMessageBody).duration || 0, ext)
      }
      case 'location':
        return domains.message.sendLocation(
          id,
          type,
          (message.body as LocationMessageBody).latitude,
          (message.body as LocationMessageBody).longitude,
          (message.body as LocationMessageBody).address,
          ext,
        )
      case 'custom':
        return domains.message.sendCustom(
          id,
          type,
          (message.body as CustomMessageBody).event || '',
          (message.body as CustomMessageBody).params ? JSON.parse(JSON.stringify(toRaw((message.body as CustomMessageBody).params))) : undefined,
          ext,
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
    // 剥离 UiMessage 扩展字段并去 reactive proxy：
    // SDK createCombineMessage 期望纯净的 SDK Message 对象，
    // 包含 isSelf / localId / recalled 等扩展字段会导致合并载荷
    // 异常偏大，服务端可能无法正确存储/检索该消息
    const cleanMessages = messages.map(toCleanSdkMessage)
    return domains.message.sendCombine(
      id,
      type,
      title,
      summary,
      compatibleText,
      cleanMessages,
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
