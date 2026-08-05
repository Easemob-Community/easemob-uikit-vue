import { computed, ref, toRaw } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '../constants'
import type { CombineMessageBody, CustomMessageBody, FileMessageBody, ImageMessageBody, LocationMessageBody, TextMessageBody, UiConversation, UiMessage, VideoMessageBody, VoiceMessageBody } from '../sdk/types'
import { extractLastMessageText } from '../sdk/adapter/message-adapter'
import { createLogger } from '../utils/logger'
import { resolveSenderDisplayName } from '../utils/resolve-last-message-text'
import { useLocale } from '../locale'
import { useToast } from './use-toast'
import { useMessageSend } from './use-message-send'
import { useMessageHistory } from './use-message-history'
import { useMessageActions } from './use-message-actions'
import { useUIKit } from './use-uikit'

const combineLogger = createLogger('Combine')

/**
 * 合并消息上限，与 SDK combine-message-constraints.ts 对齐
 *（MAX_COMBINE_MESSAGE_COUNT / MAX_COMBINE_LEVEL 未从 SDK 包公开导出，此处硬编码并注明来源）。
 */
const MAX_COMBINE_ITEMS = 300
const MAX_COMBINE_LEVEL = 10

/**
 * 将 UiMessage 转换为干净的 SDK Message 对象。
 * 剥离 UiMessage 扩展字段（isSelf / status / localId / recalled /
 * pinned / translation / progress 等），仅保留 SDK Message 接口定义的字段。
 * 通过 toRaw 解包 Vue reactive proxy，避免 SDK createCombineMessage
 * 编码合并载荷时把 Vue 内部属性也序列化进去。
 * 不剥离扩展字段会导致合并文件载荷异常偏大，
 * 服务端可能无法正确存储/检索该消息。
 * 嵌套的合并消息额外剥离 body.messageList：接收端通过 url/secret
 * 按需下载子消息，保留会导致载荷随嵌套转发轮次指数膨胀，
 * 同步编码与上传进度回调足以把页面主线程打满（表现为页面无响应）。
 */
function toCleanSdkMessage(msg: UiMessage): SdkMessage {
  // toRaw 解包 Vue reactive proxy
  const raw = toRaw(msg)
  // 解构剥离所有 UiMessage 扩展字段
  const {
    isSelf: _isSelf,
    status: _status,
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
  // 嵌套合并消息：剥离 messageList，仅保留 title/summary/url/secret/combineLevel 等索引字段
  if (sdkMsg.type === MESSAGE_TYPE.COMBINE && sdkMsg.body && 'messageList' in (sdkMsg.body as CombineMessageBody)) {
    const { messageList: _messageList, ...restBody } = sdkMsg.body as CombineMessageBody
    sdkMsg.body = restBody as typeof sdkMsg.body
  }
  return sdkMsg as unknown as SdkMessage
}

/** 编辑态消息（模块级单例，保证 chat.vue 与 message-input 跨组件共享同一份状态） */
const editingMessage = ref<UiMessage | null>(null)

/**
 * useChat 是消息相关能力的薄聚合层。
 * 具体实现拆分到 useMessageSend / useMessageHistory / useMessageActions。
 */
export function useChat() {
  const { stores, domains } = useUIKit()
  const { t } = useLocale()
  const { show: showToast } = useToast()
  const send = useMessageSend()
  const history = useMessageHistory()
  const actions = useMessageActions()

  const currentConversation = computed(() => stores.conversation.currentConversation)

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
      case MESSAGE_TYPE.TEXT:
        return domains.message.sendText(id, type, (message.body as TextMessageBody).content || '', ext)
      case MESSAGE_TYPE.IMAGE: {
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
      case MESSAGE_TYPE.FILE: {
        const url = (message.body as FileMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: file url not found')
          return
        }
        return domains.message.sendFile(id, type, url, ext)
      }
      case MESSAGE_TYPE.VOICE: {
        const url = (message.body as VoiceMessageBody).url
        if (!url) {
          console.warn('[useChat] forwardMessage: voice url not found')
          return
        }
        return domains.message.sendVoice(id, type, url, (message.body as VoiceMessageBody).duration || 0, ext)
      }
      case MESSAGE_TYPE.VIDEO: {
        const url = (message.body as VideoMessageBody).url
          || (message.body as VideoMessageBody).thumbnailUrl
        if (!url) {
          console.warn('[useChat] forwardMessage: video url not found')
          return
        }
        return domains.message.sendVideo(id, type, url, (message.body as VideoMessageBody).duration || 0, ext)
      }
      case MESSAGE_TYPE.LOCATION:
        return domains.message.sendLocation(
          id,
          type,
          (message.body as LocationMessageBody).latitude,
          (message.body as LocationMessageBody).longitude,
          (message.body as LocationMessageBody).address,
          ext,
        )
      case MESSAGE_TYPE.CUSTOM:
        return domains.message.sendCustom(
          id,
          type,
          (message.body as CustomMessageBody).event || '',
          (message.body as CustomMessageBody).params ? JSON.parse(JSON.stringify(toRaw((message.body as CustomMessageBody).params))) : undefined,
          ext,
        )
      case MESSAGE_TYPE.COMBINE:
        // 合并消息逐条转发：作为单个合并消息重新发送
        return forwardCombineMessages([message], target)
      default:
        console.warn('[useChat] forwardMessage: unsupported type', message.type)
    }
  }

  /**
   * 解析消息发送者的显示名称（复用共享链路：联系人备注 > 资料昵称 > ext 快照 > userId）。
   */
  function resolveSenderName(m: UiMessage): string {
    return resolveSenderDisplayName(stores, m)
  }

  /** 合并转发 */
  async function forwardCombineMessages(messages: UiMessage[], target: UiConversation) {
    if (messages.length === 0)
      return
    // 前置校验与 SDK 约束对齐（createCombineMessage 超限会直接抛 ValidationError），
    // 在 UI 层先拦截并给出明确提示，而不是让用户看到笼统的"转发失败"
    if (messages.length > MAX_COMBINE_ITEMS) {
      showToast(t('message.forward.tooMany', `最多支持 ${MAX_COMBINE_ITEMS} 条消息`).replace('{max}', String(MAX_COMBINE_ITEMS)), 'warning')
      return
    }
    // 嵌套合并层级：选中项中 combine 消息的最高 combineLevel + 1 超过 SDK 上限时拦截
    const maxNestedLevel = messages.reduce((acc, m) => {
      if (m.type !== MESSAGE_TYPE.COMBINE)
        return acc
      const level = (m.body as CombineMessageBody).combineLevel ?? 0
      return Math.max(acc, level)
    }, 0)
    if (maxNestedLevel + 1 > MAX_COMBINE_LEVEL) {
      showToast(t('message.forward.combineLevelExceeded', '聊天记录嵌套层级过高，无法合并转发'), 'warning')
      return
    }
    const { id, type } = target
    const title = type === CONVERSATION_TYPE.GROUPCHAT ? (target.name || id) : t('message.forward.combineTitle', '聊天记录')
    const summary = messages.map((m) => {
      // 本地通知消息不经过 SDK 适配器，直接取通知文案；其余走 SDK 摘要提取
      const text = m.type === MESSAGE_TYPE.NOTICE ? m.body.content : extractLastMessageText(m as SdkMessage)
      return `${resolveSenderName(m)}: ${text}`
    }).join('\n')
    // 旧版本客户端展示的兼容文案（SDK compatibleText sidecar）
    const compatibleText = t('message.forward.combineCompatible', '[聊天记录]')
    // 剥离 UiMessage 扩展字段并去 reactive proxy：
    // SDK createCombineMessage 期望纯净的 SDK Message 对象，
    // 包含 isSelf / localId / recalled 等扩展字段会导致合并载荷
    // 异常偏大，服务端可能无法正确存储/检索该消息
    const cleanMessages = messages.map(toCleanSdkMessage)
    // 埋点：载荷字节数（约等于 SDK 编码后上传的 combine 文件大小），
    // 用于判别"卡发送中"是载荷过大还是网络等待
    let payloadKB = -1
    try {
      payloadKB = Math.round(JSON.stringify(cleanMessages).length / 1024)
    }
    catch {
      payloadKB = -2 // 序列化失败（循环引用等）
    }
    combineLogger.info('forwardCombineMessages', {
      items: cleanMessages.length,
      payloadKB,
    })
    return domains.message.sendCombine(
      id,
      type,
      title,
      summary,
      compatibleText,
      cleanMessages,
    )
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

    // 编辑/转发
    editingMessage,
    enterEditMode,
    exitEditMode,
    modifyTextMessage,
    sendReadAckForMessage,
    fetchGroupReadDetail,
    forwardMessage,
    forwardCombineMessages,

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
    transcribeVoiceMessage: actions.transcribeVoiceMessage,
    toggleVoiceText: actions.toggleVoiceText,
    pinMessage: actions.pinMessage,
    unpinMessage: actions.unpinMessage,
    fetchPinnedMessages: actions.fetchPinnedMessages,
  }
}
