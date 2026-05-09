import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import type { Message } from '../store/message'
import { MESSAGE_STATUS } from '../constants'
import type { ConversationTypeValue } from '../constants'
import { getClient } from '../sdk/client'
import type { UIKitClient } from '../sdk/client'
import type { EasemobChat } from 'easemob-websdk'

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

  /**
   * 获取 UIKitClient 实例，若未初始化则抛出错误
   */
  function _getClient(): UIKitClient {
    const client = getClient()
    if (!client) throw new Error('[useChat] UIKitClient not initialized. Call init() first.')
    return client
  }

  /**
   * 将浏览器原生 File/Blob 转为 SDK 要求的 FileObj 格式
   */
  function _toFileObj(file: File | Blob, filename?: string): EasemobChat.FileObj {
    return {
      data: file as File,
      filename: filename || (file instanceof File ? file.name : 'file'),
      filetype: file.type || 'application/octet-stream',
      url: '',
    }
  }

  /**
   * 本地插入一条发送中的消息，直接展开 SDK 消息的所有原生字段 + 追加 UI 扩展字段
   */
  function _insertSendingMessage(
    sdkMsg: EasemobChat.MessageBody,
    to: string,
    chatType: ConversationTypeValue,
  ): void {
    const msg: Message = {
      ...sdkMsg,
      conversationId: to,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      timestamp: Date.now(),
    } as Message
    messageStore.addMessage(msg)
  }

  /**
   * 发送成功/失败后更新本地消息状态
   */
  function _onSendResult(msgId: string, error?: unknown) {
    if (error) {
      messageStore.updateMessageStatus(msgId, MESSAGE_STATUS.FAILED)
    } else {
      messageStore.updateMessageStatus(msgId, MESSAGE_STATUS.SENT)
    }
  }

  /** 发送文本消息 */
  async function sendTextMessage(text: string, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const sdkMsg = client.createMessage({
      type: 'txt',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      msg: text,
      ext,
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type)
    try {
      await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送图片消息 */
  async function sendImageMessage(file: File) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const sdkMsg = client.createMessage({
      type: 'img',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type)
    try {
      await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送文件消息 */
  async function sendFileMessage(file: File) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const sdkMsg = client.createMessage({
      type: 'file',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type)
    try {
      await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送语音消息 */
  async function sendAudioMessage(file: File | Blob, duration: number) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const sdkMsg = client.createMessage({
      type: 'audio',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file, file instanceof File ? file.name : 'audio.amr'),
      filename: file instanceof File ? file.name : 'audio.amr',
      length: duration,
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type)
    try {
      await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送视频消息 */
  async function sendVideoMessage(file: File) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const sdkMsg = client.createMessage({
      type: 'video',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file, file.name),
      filename: file.name,
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type)
    try {
      await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /**
   * 通用发送方法（兼容旧接口）
   */
  function sendMessage(body: Record<string, any>, _type?: string) {
    // 通用方法仅支持文本，其他类型请使用专用方法
    sendTextMessage(body.msg || '')
  }

  /**
   * 获取历史消息
   */
  async function fetchHistoryMessages(cursor?: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return { messages: [] as Message[], cursor: '', isLast: true }
    try {
      const result = await _getClient().getHistoryMessages({
        targetId: cvs.id,
        chatType: cvs.type,
        pageSize: 20,
        cursor: cursor ?? '',
      })
      const rawMsgs = (result.messages || []).filter(
        (m): m is EasemobChat.ExcludeAckMessageBody => m.type !== 'read' && m.type !== 'delivery' && m.type !== 'channel',
      )
      const currentUser = stores.client.currentUser
      const historyMsgs: Message[] = rawMsgs.map((m) => {
        const isGroup = m.chatType === 'groupChat'
        const conversationId = isGroup ? m.to : (m.from === currentUser ? m.to : m.from)
        return {
          ...m,
          conversationId: conversationId || cvs.id,
          isSelf: m.from === currentUser,
          status: MESSAGE_STATUS.SENT,
          timestamp: m.time || Date.now(),
        } as Message
      })
      messageStore.prependMessages(cvs.id, historyMsgs)
      return {
        messages: historyMsgs,
        cursor: result.cursor || '',
        isLast: result.isLast,
      }
    } catch (e) {
      console.error('[useChat] fetchHistoryMessages failed:', e)
      return { messages: [] as Message[], cursor: '', isLast: true }
    }
  }

  return {
    messages,
    currentConversation,
    sendMessage,
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendAudioMessage,
    sendVideoMessage,
    fetchHistoryMessages,
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
