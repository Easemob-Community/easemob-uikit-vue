import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { useLocale } from '../locale'
import type { Message, MessageStoreOptions } from '../store/message'
import type { Conversation } from '../store/conversation'
import { MESSAGE_STATUS, MESSAGE_TYPE, CONVERSATION_TYPE } from '../constants'
import type { ConversationTypeValue } from '../constants'
import type { SdkMessage } from '../sdk/client'
import { getClient } from '../sdk/client'
import type { UIKitClient } from '../sdk/client'
import type {
  MessageHistoryPage,
  MessageTranslationResult,
  PinnedMessageListResult,
  PinnedMessageSummary,
} from 'easemob-websdk'

/** Typing 命令消息 action 常量 */
const TYPING_ACTION = {
  BEGIN: 'TypingBegin',
} as const

/** Typing 状态持续时间（毫秒） */
const TYPING_DURATION = 5000

// ===== 多选模式状态（模块级单例，确保同一页面内多处调用共享同一份状态） =====
const isMultiSelectMode = ref(false)
const selectedMessageIds = ref<Set<string>>(new Set())

// ===== 编辑模式状态（模块级单例） =====
const editingMessage = ref<Message | null>(null)
/** SDK 限制：单条消息最多可被修改 5 次 */
const MODIFY_LIMIT = 5

// ===== 历史消息加载游标（会话维度，模块级单例） =====
const historyCursorMap = ref<Record<string, { cursor: string; isLast: boolean }>>({})

function getHistoryCursor(conversationId: string) {
  return historyCursorMap.value[conversationId] || { cursor: '', isLast: false }
}

function setHistoryCursor(conversationId: string, cursor: string, isLast: boolean) {
  historyCursorMap.value[conversationId] = { cursor, isLast }
}

function clearHistoryCursor(conversationId: string) {
  delete historyCursorMap.value[conversationId]
}

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

/** 全选当前会话所有可转发的消息（过滤掉已撤回、发送中的消息） */
function selectAllMessages(messages: Message[]) {
  const validIds = messages
    .filter(m => m.status === MESSAGE_STATUS.SENT && !m.recalled)
    .map(m => m.id)
  selectedMessageIds.value = new Set(validIds)
}

/** 取消全选 */
function deselectAllMessages() {
  selectedMessageIds.value.clear()
}

function enterEditMode(message: Message) {
  editingMessage.value = message
}

function exitEditMode() {
  editingMessage.value = null
}

/** useChat 配置选项 */
export interface UseChatOptions {
  /** 消息 store 配置 */
  messageStoreOptions?: MessageStoreOptions
}

export function useChat(options?: UseChatOptions) {
  const { stores } = useUIKit()
  const { locale, t } = useLocale()
  const messageStore = stores.message
  const conversationStore = stores.conversation

  // 初始化消息 store 配置（只执行一次）
  if (options?.messageStoreOptions) {
    messageStore.setOptions(options.messageStoreOptions)
  }

  const messages = computed(() => {
    const cvsId = conversationStore.currentConversation?.id
    return cvsId ? messageStore.getMessages(cvsId) : []
  })

  const currentConversation = computed(() => conversationStore.currentConversation)

  const selectedMessages = computed(() =>
    messages.value.filter((msg) => selectedMessageIds.value.has(msg.id))
  )

  /**
   * 判断是否应启用群已读回执
   */
  function _shouldEnableGroupAck(
    chatType: ConversationTypeValue,
    groupId: string,
    enabled?: boolean,
    maxGroupSize?: number,
  ): boolean {
    if (!enabled || chatType !== CONVERSATION_TYPE.GROUPCHAT) return false
    const memberCount = stores.group.getGroupById?.(groupId)?.memberCount || 0
    const limit = maxGroupSize && maxGroupSize > 0 ? maxGroupSize : 200
    return memberCount > 0 && memberCount <= limit
  }

  /**
   * 获取 UIKitClient 实例，若未初始化则抛出错误
   */
  function _getClient(): UIKitClient {
    const client = getClient()
    if (!client) throw new Error('[useChat] UIKitClient not initialized. Call init() first.')
    return client
  }

  /**
   * 根据消息类型格式化会话列表最后一条消息摘要文本
   */
  function _formatLastMessageText(sdkMsg: { type?: string; content?: string }): string {
    switch (sdkMsg.type) {
      case MESSAGE_TYPE.TEXT:
        return sdkMsg.content || ''
      case MESSAGE_TYPE.IMAGE:
        return '[图片]'
      case MESSAGE_TYPE.VOICE:
        return '[语音]'
      case MESSAGE_TYPE.VIDEO:
        return '[视频]'
      case MESSAGE_TYPE.FILE:
        return '[文件]'
      case MESSAGE_TYPE.CMD:
        return '[命令消息]'
      case MESSAGE_TYPE.CUSTOM:
        return '[自定义消息]'
      case MESSAGE_TYPE.LOCATION:
        return '[位置]'
      default:
        return '[消息]'
    }
  }

  /**
   * 本地插入一条发送中的消息
   */
  function _insertSendingMessage(
    sdkMsg: Message,
    to: string,
    chatType: ConversationTypeValue,
    groupReadReceiptEnabled?: boolean,
  ): void {
    const isGroup = chatType === CONVERSATION_TYPE.GROUPCHAT
    const requireGroupAck = !!(groupReadReceiptEnabled && isGroup)
    const currentUser = stores.client.currentUser
    const msg: Message = {
      ...sdkMsg,
      from: sdkMsg.from || currentUser || '',
      conversationId: to,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      timestamp: Date.now(),
      requireGroupAck: requireGroupAck || undefined,
    }
    messageStore.addMessage(msg)

    // 同步更新会话列表最新消息
    const lastMessageText = _formatLastMessageText(sdkMsg)
    const patch: Partial<Conversation> = {
      lastMessage: lastMessageText,
      lastMessageTime: msg.timestamp,
      lastMessageType: sdkMsg.type as string,
      lastMessageSender: isGroup ? currentUser : '',
    }
    conversationStore.updateConversation(to, patch)
  }

  /**
   * 发送成功/失败后更新本地消息状态
   */
  function _onSendResult(msgId: string, error?: unknown, serverMsg?: Message) {
    if (error) {
      const reason = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error))
      console.error(`[useChat] sendMessage failed (msgId=${msgId}):`, error)
      messageStore.updateMessageById(msgId, { status: MESSAGE_STATUS.FAILED, failReason: reason })
    } else {
      if (serverMsg) {
        messageStore.replaceMessageById(msgId, serverMsg)
      } else {
        messageStore.updateMessageStatus(msgId, MESSAGE_STATUS.SENT)
      }
    }
  }

  /** 发送文本消息 */
  async function sendTextMessage(text: string, ext?: Record<string, unknown>, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.chatManager.createTextMessage({
      conversationId: cvs.id,
      conversationType: cvs.type,
      content: text,
      ext,
    })
    // 构造 UI Message
    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: cvs.id,
      conversationType: cvs.type,
      timestamp: Date.now(),
      type: 'text',
      content: text,
      ext,
      conversationId: cvs.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      requireGroupAck: enableGroupAck || undefined,
    }
    _insertSendingMessage(uiMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
    } catch (e) {
      _onSendResult(uiMsg.id, e)
    }
  }

  /**
   * 读取图片文件的原始宽高
   */
  function _readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }

  /** 发送图片消息 */
  async function sendImageMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, unknown>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)

    const { width, height } = await _readImageDimensions(file)
    const localPreviewUrl = URL.createObjectURL(file)

    const sdkMsg = client.chatManager.createImageMessage({
      conversationId: cvs.id,
      conversationType: cvs.type,
      data: file,
      ext,
    })

    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: cvs.id,
      conversationType: cvs.type,
      timestamp: Date.now(),
      type: 'image',
      url: localPreviewUrl,
      filename: file.name,
      width,
      height,
      ext,
      conversationId: cvs.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      requireGroupAck: enableGroupAck || undefined,
    }

    _insertSendingMessage(uiMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
    } catch (e) {
      _onSendResult(uiMsg.id, e)
    } finally {
      URL.revokeObjectURL(localPreviewUrl)
    }
  }

  /** 发送文件消息 */
  async function sendFileMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, unknown>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)

    const sdkMsg = client.chatManager.createFileMessage({
      conversationId: cvs.id,
      conversationType: cvs.type,
      data: file,
      ext,
    })

    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: cvs.id,
      conversationType: cvs.type,
      timestamp: Date.now(),
      type: 'file',
      filename: file.name,
      ext,
      conversationId: cvs.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      requireGroupAck: enableGroupAck || undefined,
    }

    _insertSendingMessage(uiMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
    } catch (e) {
      _onSendResult(uiMsg.id, e)
    }
  }

  /** 发送语音消息 */
  async function sendAudioMessage(file: File | Blob, duration: number, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, unknown>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)

    const sdkMsg = client.chatManager.createVoiceMessage({
      conversationId: cvs.id,
      conversationType: cvs.type,
      data: file as File,
      duration,
      ext,
    })

    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: cvs.id,
      conversationType: cvs.type,
      timestamp: Date.now(),
      type: 'voice',
      filename: file instanceof File ? file.name : 'audio.amr',
      duration,
      ext,
      conversationId: cvs.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      requireGroupAck: enableGroupAck || undefined,
    }

    _insertSendingMessage(uiMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
    } catch (e) {
      _onSendResult(uiMsg.id, e)
    }
  }

  /** 发送视频消息 */
  async function sendVideoMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, unknown>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)

    const sdkMsg = client.chatManager.createVideoMessage({
      conversationId: cvs.id,
      conversationType: cvs.type,
      data: file,
      duration: 0,
      ext,
    })

    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: cvs.id,
      conversationType: cvs.type,
      timestamp: Date.now(),
      type: 'video',
      filename: file.name,
      ext,
      conversationId: cvs.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      requireGroupAck: enableGroupAck || undefined,
    }

    _insertSendingMessage(uiMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
    } catch (e) {
      _onSendResult(uiMsg.id, e)
    }
  }

  /**
   * 通用发送方法（兼容旧接口）
   */
  function sendMessage(body: Record<string, unknown>, _type?: string) {
    sendTextMessage(body.msg as string || '')
  }

  /**
   * 获取历史消息
   */
  async function fetchHistoryMessages(cursor?: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return { messages: [] as Message[], cursor: '', isLast: true }

    const cached = getHistoryCursor(cvs.id)
    const actualCursor = cursor ?? cached.cursor

    try {
      const result = await _getClient().conversation.getHistoryMessages({
        targetId: cvs.id,
        conversationType: cvs.type,
        pageSize: 20,
        cursor: actualCursor,
      }) as MessageHistoryPage
      const rawMsgs = result?.items || []
      const currentUser = stores.client.currentUser
      const historyMsgs: Message[] = rawMsgs.map((m) => {
        const isGroup = m.conversationType === 'groupChat' || (m as any).chatType === 'groupChat'
        const conversationId = isGroup ? m.to : (m.from === currentUser ? m.to : m.from)
        const body = m.body || {} as Record<string, any>
        return {
          id: m.msgServerId || '',
          serverId: m.msgServerId || '',
          from: m.from || '',
          to: m.to || '',
          conversationType: (m.conversationType || 'singleChat') as ConversationTypeValue,
          timestamp: m.timestamp || Date.now(),
          type: (m.type || 'text') as Message['type'],
          ext: m.ext as Record<string, unknown> | undefined,
          content: (body as any).content,
          url: (body as any).url || (body as any).originalImageUrl,
          thumbnailUrl: (body as any).thumbnailUrl,
          secret: (body as any).secret,
          filename: (body as any).filename,
          fileSize: (body as any).fileSize,
          duration: (body as any).duration,
          width: (body as any).width,
          height: (body as any).height,
          latitude: (body as any).latitude,
          longitude: (body as any).longitude,
          address: (body as any).address,
          customEvent: (body as any).customEvent,
          customExts: (body as any).customExts,
          title: (body as any).title,
          summary: (body as any).summary,
          compatibleText: (body as any).compatibleText,
          messageList: (body as any).messageList,
          action: (body as any).action,
          conversationId: conversationId || cvs.id,
          isSelf: m.from === currentUser,
          status: MESSAGE_STATUS.SENT,
        } as Message
      })
      messageStore.prependMessages(cvs.id, historyMsgs)

      const rawCursor = result?.cursor
      const newCursor = (rawCursor && rawCursor !== 'undefined' && rawCursor !== 'null') ? rawCursor : ''
      const isLast = !result?.hasMore || historyMsgs.length === 0 || !newCursor
      setHistoryCursor(cvs.id, newCursor, isLast)

      return {
        messages: historyMsgs,
        cursor: newCursor,
        isLast,
      }
    } catch (e) {
      console.error('[useChat] fetchHistoryMessages failed:', e)
      return { messages: [] as Message[], cursor: '', isLast: true }
    }
  }

  /** 对指定消息发送已读回执（单聊）
   * @deprecated SDK5 使用 markMessageRead，需要原始 SDK Message 对象。
   * UIKit 不保留 SDK Message，业务层如需消息级已读回执请自行调用 client.chatManager.markMessageRead。
   */
  async function sendReadAckForMessage(_msgId: string) {
    console.warn('[useChat] sendReadAckForMessage is deprecated in SDK5; use markMessageRead with SDK Message.')
  }

  /** 获取群消息已读用户详情 */
  async function fetchGroupReadDetail(msgId: string, groupId: string) {
    return _getClient().message.getGroupMessageReadUsers({ messageId: msgId, groupId })
  }

  /** 获取翻译目标语言 */
  function _resolveTranslateLang(targetLang?: string): string {
    if (targetLang && targetLang.trim()) return targetLang.trim()
    const cur = locale.value
    if (cur === 'zh-CN' || cur === 'zh' || cur === 'zh-Hans') return 'zh-Hans'
    if (cur === 'en' || cur?.startsWith('en-')) return 'en'
    return 'en'
  }

  /**
   * 修改文本消息
   */
  async function modifyTextMessage(message: Message, newText: string) {
    if (!message || message.type !== 'text') return
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const trimmed = (newText ?? '').trim()
    if (!trimmed) return
    const originalText = message.content || ''
    if (trimmed === originalText) {
      exitEditMode()
      return
    }
    const client = _getClient()
    const messageId = message.serverId || message.id
    try {
      /**
       * @see SDK_DEFICIENCY: modifyMessage 返回的 Message 类型不包含 modifiedInfo 字段，
       * 无法在编译期获取已修改次数等信息。
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await client.message.modifyMessage({
        conversationId: cvs.id,
        conversationType: cvs.type,
        messageId,
        message: { type: 'text' as const, body: { content: trimmed }, ext: message.ext || {} },
      }) as any
      const info = result?.modifiedInfo
      const fallback: Message = {
        ...message,
        content: trimmed,
        modified: true,
        modifiedInfo: info || {
          operatorId: stores.client.currentUser || '',
          operationCount: (message.modifiedInfo?.operationCount ?? 0) + 1,
          operationTime: Date.now(),
        },
      }
      messageStore.applyModifiedMessage(fallback)
      exitEditMode()
    } catch (e) {
      console.warn('[useChat] updateMessage failed:', e)
      throw e
    }
  }

  /** 置顶消息 */
  async function pinMessage(message: Message) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message) return
    const client = _getClient()
    const messageId = message.serverId || message.id
    try {
      await client.message.pinMessage({
        conversationId: cvs.id,
        conversationType: cvs.type,
        messageId,
      })
      messageStore.setMessagePinned(messageId, {
        operatorId: stores.client.currentUser || '',
        pinTime: Date.now(),
      })
    } catch (e) {
      console.warn('[useChat] pinMessage failed:', e)
      throw e
    }
  }

  /** 取消置顶消息 */
  async function unpinMessage(message: Message) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message) return
    const client = _getClient()
    const messageId = message.serverId || message.id
    try {
      await client.message.unpinMessage({
        conversationId: cvs.id,
        conversationType: cvs.type,
        messageId,
      })
      messageStore.setMessageUnpinned(messageId)
    } catch (e) {
      console.warn('[useChat] unpinMessage failed:', e)
      throw e
    }
  }

  /**
   * 拉取当前会话的服务端置顶消息列表
   */
  async function fetchPinnedMessages() {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    try {
      const result = await _getClient().message.getPinnedMessageList({
        conversationId: cvs.id,
        conversationType: cvs.type,
        pageSize: 20,
        cursor: '',
      }) as PinnedMessageListResult
      /**
       * @see SDK_DEFICIENCY: PinnedMessageSummary 不包含 message 字段，
       * 无法直接从置顶消息列表中获取完整消息对象。
       * 此处仅记录 messageId，实际消息需另行拉取。
       */
      const list = result?.items || []
      const currentUser = stores.client.currentUser
      const mapped: Message[] = list.map((info: PinnedMessageSummary) => {
        // PinnedMessageSummary only has messageId, no full message object
        return {
          id: info.messageId,
          serverId: info.messageId,
          from: '',
          to: '',
          conversationType: cvs.type,
          timestamp: info.pinnedAt || Date.now(),
          type: 'text' as Message['type'],
          conversationId: cvs.id,
          isSelf: false,
          status: MESSAGE_STATUS.SENT,
          pinned: true,
          pinTime: info.pinnedAt,
          pinOperatorId: info.operatorId,
        } as Message
      })
      messageStore.setPinnedMessages(cvs.id, mapped)
    } catch (e) {
      console.warn('[useChat] fetchPinnedMessages failed:', e)
    }
  }

  /**
   * 翻译文本消息
   */
  async function translateTextMessage(message: Message, targetLang?: string) {
    if (!message || message.type !== 'text') return
    const text = message.content || ''
    if (!text) return
    const lang = _resolveTranslateLang(targetLang)
    const msgId = message.id
    if (message.translation && message.translation.to === lang) {
      messageStore.toggleTranslation(msgId)
      return
    }
    messageStore.setTranslating(msgId, true)
    try {
      const result = await _getClient().message.translateMessage({ text, languages: [lang] }) as MessageTranslationResult
      console.log('[useChat] translateMessage raw result:', JSON.stringify(result))
      const translation = result?.translations?.[0]
      if (translation) {
        messageStore.setTranslation(msgId, { text: translation.text, to: translation.to })
      } else {
        messageStore.setTranslating(msgId, false)
        console.warn('[useChat] translateMessage: no translation in response, data:', result)
      }
    } catch (e) {
      messageStore.setTranslating(msgId, false)
      console.warn('[useChat] translateMessage failed:', e)
      throw e
    }
  }

  /** 切换译文/原文展示 */
  function toggleTranslation(msgId: string) {
    messageStore.toggleTranslation(msgId)
  }

  /** 撤回消息 */
  async function recallMessage(msgId: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    try {
      await client.message.recallMessage({
        messageId: msgId,
        conversationId: cvs.id,
        conversationType: cvs.type,
      })
      messageStore.recallMessage(msgId, stores.client.currentUser || '')
    } catch (e) {
      console.warn('[useChat] recallMessage failed:', e)
      throw e
    }
  }

  /** 删除单条消息（仅从本地 store 移除） */
  function deleteMessage(msgId: string) {
    messageStore.deleteMessage(msgId)
  }

  /** 批量删除消息（多选模式） */
  function deleteMessages(msgIds: string[]) {
    messageStore.deleteMessages(msgIds)
  }

  /**
   * 更新目标会话的最后一条消息（用于转发后同步会话列表）
   */
  function _updateTargetConversation(targetId: string, targetType: ConversationTypeValue, lastMessageText: string, timestamp: number, lastMessageType?: string) {
    const isGroup = targetType === CONVERSATION_TYPE.GROUPCHAT
    const patch: Partial<Conversation> = {
      lastMessage: lastMessageText,
      lastMessageTime: timestamp,
      lastMessageType: lastMessageType || 'combine',
      lastMessageSender: isGroup ? (stores.client.currentUser || '') : '',
    }
    conversationStore.updateConversation(targetId, patch)
  }

  /**
   * 将 SDK 消息体转换为 UI Message 并插入目标会话的消息列表
   */
  function _insertForwardedMessage(sdkMsg: Message, targetId: string, targetType: ConversationTypeValue) {
    const currentUser = stores.client.currentUser
    const uiMsg: Message = {
      ...sdkMsg,
      from: sdkMsg.from || currentUser || '',
      conversationId: targetId,
      isSelf: true,
      status: MESSAGE_STATUS.SENT,
      timestamp: Date.now(),
    }
    messageStore.addMessage(uiMsg)
  }

  /**
   * 单条转发消息到指定会话
   */
  async function forwardMessage(message: Message, targetConversation: Conversation) {
    const client = _getClient()

    if (message.type === 'text') {
      const text = message.content || ''
      const sdkMsg = client.chatManager.createTextMessage({
        conversationId: targetConversation.id,
        conversationType: targetConversation.type,
        content: text,
        ext: message.ext,
      })
      const uiMsg: Message = {
        id: sdkMsg.msgLocalId || '',
        serverId: '',
        from: stores.client.currentUser || '',
        to: targetConversation.id,
        conversationType: targetConversation.type,
        timestamp: Date.now(),
        type: 'text',
        content: text,
        ext: message.ext,
        conversationId: targetConversation.id,
        isSelf: true,
        status: MESSAGE_STATUS.SENDING,
      }
      try {
        const result = await client.chatManager.sendMessage(sdkMsg)
        _onSendResult(uiMsg.id, undefined, result as unknown as Message)
        _insertForwardedMessage(result as unknown as Message, targetConversation.id, targetConversation.type)
        _updateTargetConversation(targetConversation.id, targetConversation.type, text, Date.now(), 'text')
      } catch (e) {
        _onSendResult(uiMsg.id, e)
        throw e
      }
      return
    }

    // 非文本消息：降级为文本描述转发
    const typeMap: Record<string, string> = {
      image: '[图片]', voice: '[语音]', video: '[视频]',
      file: '[文件]', custom: '[自定义消息]', location: '[位置]',
    }
    const desc = typeMap[message.type] || '[消息]'
    const sdkMsg = client.chatManager.createTextMessage({
      conversationId: targetConversation.id,
      conversationType: targetConversation.type,
      content: desc,
      ext: { ...(message.ext || {}), uikitForward: { originalType: message.type, originalFrom: message.from, originalTime: message.timestamp } },
    })
    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: targetConversation.id,
      conversationType: targetConversation.type,
      timestamp: Date.now(),
      type: 'text',
      content: desc,
      ext: message.ext,
      conversationId: targetConversation.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
    }
    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
      _insertForwardedMessage(result as unknown as Message, targetConversation.id, targetConversation.type)
      _updateTargetConversation(targetConversation.id, targetConversation.type, desc, Date.now(), 'text')
    } catch (e) {
      _onSendResult(uiMsg.id, e)
      throw e
    }
  }

  /** 合并消息最大条数 */
  const COMBINE_MAX_COUNT = 300

  /**
   * 多选转发：使用环信合并消息 API
   */
  async function forwardCombineMessages(messages: Message[], targetConversation: Conversation) {
    const client = _getClient()

    const validMessages = messages.filter(m => m.status === MESSAGE_STATUS.SENT && !m.recalled)
    if (validMessages.length === 0) {
      throw new Error(t('message.forward.noValidMessages') || '没有可转发的消息')
    }
    if (validMessages.length > COMBINE_MAX_COUNT) {
      throw new Error(t('message.forward.tooMany').replace('{max}', String(COMBINE_MAX_COUNT)) || `最多支持 ${COMBINE_MAX_COUNT} 条消息`)
    }

    // 构建合并消息的 messageList
    const messageList = validMessages.map(m => {
      const sdkMsg: Record<string, unknown> = {}
      const uiKeys = new Set([
        'conversationId', 'isSelf', 'status', 'timestamp', 'groupReadCount',
        'groupMemberCount', 'requireGroupAck', 'recalled', 'recalledBy',
        'originalMsg', 'mid', 'modified', 'modifiedInfo', 'pinned',
        'pinTime', 'pinOperatorId', 'translation', 'showTranslation',
        'translating', 'failReason',
      ])
      const msgRecord = m as unknown as Record<string, unknown>
      for (const key in msgRecord) {
        if (!uiKeys.has(key)) {
          sdkMsg[key] = msgRecord[key]
        }
      }
      return sdkMsg
    })

    const summary = validMessages.slice(0, 3).map(m => {
      const sender = m.from || ''
      let content = ''
      switch (m.type) {
        case 'text': content = m.content || ''; break
        case 'image': content = '[图片]'; break
        case 'voice': content = '[语音]'; break
        case 'video': content = '[视频]'; break
        case 'file': content = '[文件]'; break
        case 'custom': content = '[自定义消息]'; break
        case 'location': content = '[位置]'; break
        default: content = '[消息]'
      }
      return `${sender}: ${content}`
    }).join('\n')

    const title = t('message.forward.combineTitle') || '聊天记录'
    const compatibleText = t('message.forward.combineCompatible') || '[该版本不支持合并消息，请升级]'

    const sdkMsg = client.chatManager.createCombineMessage({
      conversationId: targetConversation.id,
      conversationType: targetConversation.type,
      title,
      summary,
      compatibleText,
      messageList: messageList as unknown as ReadonlyArray<SdkMessage>,
    })

    const uiMsg: Message = {
      id: sdkMsg.msgLocalId || '',
      serverId: '',
      from: stores.client.currentUser || '',
      to: targetConversation.id,
      conversationType: targetConversation.type,
      timestamp: Date.now(),
      type: 'combine',
      title,
      summary,
      compatibleText,
      messageList: messageList as unknown as any[],
      conversationId: targetConversation.id,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
    }

    try {
      const result = await client.chatManager.sendMessage(sdkMsg)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
      _insertForwardedMessage(result as unknown as Message, targetConversation.id, targetConversation.type)
      _updateTargetConversation(targetConversation.id, targetConversation.type, '[聊天记录]', Date.now(), 'combine')
    } catch (e) {
      _onSendResult(uiMsg.id, e)
      throw e
    }
  }

  /**
   * 重发失败的消息
   */
  async function resendMessage(message: Message) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()

    messageStore.deleteMessage(message.id)

    let sdkMsg: unknown
    switch (message.type) {
      case 'text':
        sdkMsg = client.chatManager.createTextMessage({
          conversationId: cvs.id,
          conversationType: cvs.type,
          content: message.content || '',
          ext: message.ext,
        })
        break
      case 'image':
        // 重发图片需要原始 File，这里降级处理
        console.warn('[useChat] resendMessage: image resend requires original File')
        return
      case 'voice':
        console.warn('[useChat] resendMessage: voice resend requires original File')
        return
      case 'video':
        console.warn('[useChat] resendMessage: video resend requires original File')
        return
      case 'file':
        console.warn('[useChat] resendMessage: file resend requires original File')
        return
      case 'custom':
        sdkMsg = client.chatManager.createCustomMessage({
          conversationId: cvs.id,
          conversationType: cvs.type,
          event: message.customEvent || '',
          params: message.customExts || {},
          ext: message.ext,
        })
        break
      default:
        console.warn('[useChat] resendMessage: unsupported message type', message.type)
        return
    }

    const uiMsg: Message = {
      ...message,
      id: (sdkMsg as SdkMessage)?.msgLocalId || message.id,
      status: MESSAGE_STATUS.SENDING,
      timestamp: Date.now(),
    }

    _insertSendingMessage(uiMsg, cvs.id, cvs.type, message.requireGroupAck)
    try {
      const result = await client.chatManager.sendMessage(sdkMsg as SdkMessage)
      _onSendResult(uiMsg.id, undefined, result as unknown as Message)
      return uiMsg.id
    } catch (e) {
      _onSendResult(uiMsg.id, e)
      throw e
    }
  }

  /**
   * 发送输入状态命令消息（TypingBegin）
   */
  async function sendTypingCmd() {
    const cvs = conversationStore.currentConversation
    if (!cvs || cvs.type !== CONVERSATION_TYPE.SINGLECHAT) return
    const client = _getClient()
    try {
      const sdkMsg = client.chatManager.createCmdMessage({
        conversationId: cvs.id,
        conversationType: cvs.type,
        action: TYPING_ACTION.BEGIN,
      })
      await client.chatManager.sendMessage(sdkMsg)
    } catch (e) {
      console.warn('[useChat] sendTypingCmd failed:', e)
    }
  }

  /**
   * 设置指定会话的输入状态
   */
  function setTyping(conversationId: string, isTyping: boolean) {
    conversationStore.setTyping(conversationId, isTyping)
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
    sendReadAckForMessage,
    fetchGroupReadDetail,
    recallMessage,
    deleteMessage,
    deleteMessages,
    forwardMessage,
    forwardCombineMessages,
    resendMessage,
    // 多选相关
    isMultiSelectMode,
    selectedMessages,
    selectedMessageIds,
    enterMultiSelectMode,
    exitMultiSelectMode,
    toggleMessageSelection,
    isMessageSelected,
    selectAllMessages,
    deselectAllMessages,
    // 编辑/置顶/翻译
    editingMessage,
    enterEditMode,
    exitEditMode,
    modifyTextMessage,
    pinMessage,
    unpinMessage,
    fetchPinnedMessages,
    translateTextMessage,
    toggleTranslation,
    MODIFY_LIMIT,
    // 历史消息游标
    getHistoryCursor,
    clearHistoryCursor,
    // 输入状态
    sendTypingCmd,
    setTyping,
    TYPING_DURATION,
  }
}
