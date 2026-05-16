import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { useLocale } from '../locale'
import type { Message, MessageStoreOptions } from '../store/message'
import type { Conversation } from '../store/conversation'
import { MESSAGE_STATUS, MESSAGE_TYPE, CONVERSATION_TYPE } from '../constants'
import type { ConversationTypeValue } from '../constants'
import { getClient } from '../sdk/client'
import type { UIKitClient } from '../sdk/client'
import type { EasemobChat } from 'easemob-websdk'

/** Typing 命令消息 action 常量 */
const TYPING_ACTION = {
  BEGIN: 'TypingBegin',
} as const

/** Typing 状态持续时间（毫秒） */
const TYPING_DURATION = 5000

/** 消息类型到创建参数的映射（用于重发） */
interface CreateMsgOptions {
  type: string
  to: string
  chatType: EasemobChat.ChatType
  [key: string]: any
}

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
   * - 总开关未开启 → false
   * - 非群聊 → false
   * - 群成员数未知（<=0）→ false（保守策略，避免超发）
   * - 群成员数超过上限 → false
   */
  function _shouldEnableGroupAck(
    chatType: ConversationTypeValue,
    groupId: string,
    enabled?: boolean,
    maxGroupSize?: number,
  ): boolean {
    if (!enabled || chatType !== CONVERSATION_TYPE.GROUPCHAT) return false
    const memberCount = stores.group.getGroupById(groupId)?.memberCount || 0
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
   * 根据消息类型格式化会话列表最后一条消息摘要文本
   */
  function _formatLastMessageText(sdkMsg: EasemobChat.MessageBody): string {
    switch (sdkMsg.type) {
      case MESSAGE_TYPE.TXT:
        return (sdkMsg as EasemobChat.TextMsgBody).msg || ''
      case MESSAGE_TYPE.IMG:
        return '[图片]'
      case MESSAGE_TYPE.AUDIO:
        return '[语音]'
      case MESSAGE_TYPE.VIDEO:
        return '[视频]'
      case MESSAGE_TYPE.FILE:
        return '[文件]'
      case MESSAGE_TYPE.CMD:
        return '[命令消息]'
      case MESSAGE_TYPE.CUSTOM:
        return '[自定义消息]'
      case MESSAGE_TYPE.LOC:
        return '[位置]'
      default:
        return '[消息]'
    }
  }

  /**
   * 本地插入一条发送中的消息，直接展开 SDK 消息的所有原生字段 + 追加 UI 扩展字段
   * @param groupReadReceiptEnabled 是否启用群已读回执
   */
  function _insertSendingMessage(
    sdkMsg: EasemobChat.MessageBody,
    to: string,
    chatType: ConversationTypeValue,
    groupReadReceiptEnabled?: boolean,
  ): void {
    const isGroup = chatType === CONVERSATION_TYPE.GROUPCHAT
    const requireGroupAck = !!(groupReadReceiptEnabled && isGroup)
    const currentUser = stores.client.currentUser
    const msg: Message = {
      ...sdkMsg,
      // SDK createMessage 不会自动填充 from，显式以当前用户补齐，避免头像/名称出现空状态闪烁
      from: sdkMsg.from || currentUser || '',
      conversationId: to,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
      timestamp: Date.now(),
      requireGroupAck: requireGroupAck || undefined,
    } as Message
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
   * 若提供了 serverMsg，则用服务器返回的完整消息体替换本地消息
   */
  function _onSendResult(msgId: string, error?: unknown, serverMsg?: EasemobChat.ExcludeAckMessageBody) {
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
  async function sendTextMessage(text: string, ext?: Record<string, any>, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.createMessage({
      type: 'txt',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      msg: text,
      ext,
      ...(isGroup && enableGroupAck ? { msgConfig: { allowGroupAck: true } } : {}),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
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
  async function sendImageMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)

    // 读取图片宽高并生成本地预览 URL
    const { width, height } = await _readImageDimensions(file)
    const localPreviewUrl = URL.createObjectURL(file)

    const sdkMsg = client.createMessage({
      type: 'img',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file),
      ...(ext ? { ext } : {}),
      ...(isGroup && enableGroupAck ? { msgConfig: { allowGroupAck: true } } : {}),
    })

    // Patch 本地预览 URL 和宽高到消息对象，使己方消息可立即展示
    ;(sdkMsg as any).url = localPreviewUrl
    if (width > 0 && height > 0) {
      ;(sdkMsg as any).width = width
      ;(sdkMsg as any).height = height
    }

    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    } finally {
      // 服务器响应后释放本地 objectURL
      URL.revokeObjectURL(localPreviewUrl)
    }
  }

  /** 发送文件消息 */
  async function sendFileMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.createMessage({
      type: 'file',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file),
      ...(ext ? { ext } : {}),
      ...(isGroup && enableGroupAck ? { msgConfig: { allowGroupAck: true } } : {}),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送语音消息 */
  async function sendAudioMessage(file: File | Blob, duration: number, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.createMessage({
      type: 'audio',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file, file instanceof File ? file.name : 'audio.amr'),
      filename: file instanceof File ? file.name : 'audio.amr',
      length: duration,
      ...(ext ? { ext } : {}),
      ...(isGroup && enableGroupAck ? { msgConfig: { allowGroupAck: true } } : {}),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
    }
  }

  /** 发送视频消息 */
  async function sendVideoMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.createMessage({
      type: 'video',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      file: _toFileObj(file, file.name),
      filename: file.name,
      ...(ext ? { ext } : {}),
      ...(isGroup && enableGroupAck ? { msgConfig: { allowGroupAck: true } } : {}),
    })
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, enableGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
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
   *
   * ⚠️ 注意：此方法仅从服务端拉取历史消息并写入本地 store，
   * 不会触发任何已读回执（read ack / channel ack / group ack），
   * 也不会触发 event-handler 中的 handleIncomingMessage。
   * 后续维护时请勿在此处遍历发送 read ack，历史消息无需回执。
   */
  async function fetchHistoryMessages(cursor?: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return { messages: [] as Message[], cursor: '', isLast: true }

    // 如果没有传入 cursor，尝试从缓存获取
    const cached = getHistoryCursor(cvs.id)
    const actualCursor = cursor ?? cached.cursor

    try {
      const result = await _getClient().getHistoryMessages({
        targetId: cvs.id,
        chatType: cvs.type,
        pageSize: 20,
        cursor: actualCursor,
      })
      const rawMsgs = (result.messages || []).filter(
        (m): m is EasemobChat.ExcludeAckMessageBody => m.type !== 'read' && m.type !== 'delivery' && m.type !== 'channel',
      )
      const currentUser = stores.client.currentUser
      const historyMsgs: Message[] = rawMsgs.map((m) => {
        const isGroup = m.chatType === 'groupChat'
        const conversationId = isGroup ? m.to : (m.from === currentUser ? m.to : m.from)
        // 解析 allowGroupAck
        const msgConfigAllowGroupAck = (m as EasemobChat.ExcludeAckMessageBody & { msgConfig?: { allowGroupAck?: boolean } }).msgConfig?.allowGroupAck
        const extMsgConfigAllowGroupAck = m.ext
          && typeof m.ext === 'object'
          && m.ext.msgConfig
          && typeof m.ext.msgConfig === 'object'
          && (m.ext.msgConfig as Record<string, unknown>).allowGroupAck
        const requireGroupAck = !!(msgConfigAllowGroupAck || extMsgConfigAllowGroupAck)
        return {
          ...m,
          conversationId: conversationId || cvs.id,
          isSelf: m.from === currentUser,
          status: MESSAGE_STATUS.SENT,
          timestamp: m.time || Date.now(),
          requireGroupAck: requireGroupAck || undefined,
        } as Message
      })
      messageStore.prependMessages(cvs.id, historyMsgs)

      // 更新 cursor 缓存
      // SDK 在最后一页可能返回字符串字面量 'undefined'/'null'，需清洗为空串
      const rawCursor = result.cursor
      const newCursor = (rawCursor && rawCursor !== 'undefined' && rawCursor !== 'null') ? rawCursor : ''
      const isLast = result.isLast || historyMsgs.length === 0 || !newCursor
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

  /** 对指定消息发送已读回执（单聊） */
  async function sendReadAckForMessage(msgId: string) {
    const cvs = conversationStore.currentConversation
    if (!cvs || cvs.type !== CONVERSATION_TYPE.SINGLECHAT) return
    try {
      await _getClient().sendReadAck({
        chatType: cvs.type,
        to: cvs.id,
        msgId,
      })
    } catch (e) {
      console.warn('[useChat] sendReadAck failed:', e)
    }
  }

  /** 获取群消息已读用户详情 */
  async function fetchGroupReadDetail(msgId: string, groupId: string) {
    return _getClient().getGroupMsgReadUser({ msgId, groupId })
  }

  /** 获取翻译目标语言：优先 ChatConfig 传入，其次跟随 UIKIT 当前 locale */
  function _resolveTranslateLang(targetLang?: string): string {
    if (targetLang && targetLang.trim()) return targetLang.trim()
    const cur = locale.value
    if (cur === 'zh-CN' || cur === 'zh' || cur === 'zh-Hans') return 'zh-Hans'
    if (cur === 'en' || cur?.startsWith('en-')) return 'en'
    return 'en'
  }

  /**
   * 修改文本消息：调用 SDK modifyMessage，返回后应用到本地。
   * - 仅针对 type === 'txt' 的消息生效
   * - 对比 newText 与原文本，内容未变化时不发送请求
   * - 服务端返回超过 5 次会拋出 error，调用方需 catch
   */
  async function modifyTextMessage(message: Message, newText: string) {
    if (!message || message.type !== 'txt') return
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const trimmed = (newText ?? '').trim()
    if (!trimmed) return
    const originalText = (message as EasemobChat.TextMsgBody).msg || ''
    if (trimmed === originalText) {
      exitEditMode()
      return
    }
    const client = _getClient()
    const messageId = message.mid || message.id
    const modifiedMsg = client.createMessage({
      type: 'txt',
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
      msg: trimmed,
    }) as EasemobChat.ExcludeAckMessageBody
    try {
      const result = await client.modifyMessage({
        messageId,
        modifiedMessage: modifiedMsg,
      })
      const serverMsg = (result as unknown as { message?: EasemobChat.ExcludeAckMessageBody }).message
      const info = result?.modifiedInfo
      if (serverMsg) {
        messageStore.applyModifiedMessage(serverMsg, info && {
          operatorId: info.operatorId,
          operationCount: info.operationCount,
          operationTime: info.operationTime,
        })
      } else {
        // 部分 SDK 返回仅含 modifiedInfo：本地补全 msg 内容
        const fallback: EasemobChat.ExcludeAckMessageBody = {
          ...(message as unknown as EasemobChat.ExcludeAckMessageBody),
          msg: trimmed,
        } as EasemobChat.ExcludeAckMessageBody
        messageStore.applyModifiedMessage(fallback, info && {
          operatorId: info.operatorId,
          operationCount: info.operationCount,
          operationTime: info.operationTime,
        })
      }
      exitEditMode()
    } catch (e) {
      console.warn('[useChat] modifyMessage failed:', e)
      throw e
    }
  }

  /** 置顶消息 */
  async function pinMessage(message: Message) {
    const cvs = conversationStore.currentConversation
    if (!cvs || !message) return
    const client = _getClient()
    const messageId = message.mid || message.id
    try {
      await client.pinMessage({
        conversationId: cvs.id,
        conversationType: cvs.type,
        messageId,
      })
      // 主动置顶后本地立即标记（多端以 onMessagePinEvent 同步）
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
    const messageId = message.mid || message.id
    try {
      await client.unpinMessage({
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
   * 拉取当前会话的服务端置顶消息列表（仅拉首页，快递场景足够）
   */
  async function fetchPinnedMessages() {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    try {
      const result = await _getClient().getServerPinnedMessages({
        conversationId: cvs.id,
        conversationType: cvs.type,
        pageSize: 20,
        cursor: '',
      })
      const list = result?.data?.list || []
      const currentUser = stores.client.currentUser
      const mapped: Message[] = list.map((info) => {
        const m = info.message as EasemobChat.ExcludeAckMessageBody
        return {
          ...m,
          conversationId: cvs.id,
          isSelf: m.from === currentUser,
          status: MESSAGE_STATUS.SENT,
          timestamp: m.time || info.pinTime || Date.now(),
          mid: m.id,
          pinned: true,
          pinTime: info.pinTime,
          pinOperatorId: info.operatorId,
        } as Message
      })
      messageStore.setPinnedMessages(cvs.id, mapped)
    } catch (e) {
      console.warn('[useChat] fetchPinnedMessages failed:', e)
    }
  }

  /**
   * 翻译文本消息：仅 type === 'txt'
   * - 已有译文与目标语一致 → 仅切换 showTranslation
   * - 否则调用 SDK translateMessage 拉取译文
   */
  async function translateTextMessage(message: Message, targetLang?: string) {
    if (!message || message.type !== 'txt') return
    const text = (message as EasemobChat.TextMsgBody).msg || ''
    if (!text) return
    const lang = _resolveTranslateLang(targetLang)
    const msgId = message.id
    // 复用已有译文
    if (message.translation && message.translation.to === lang) {
      messageStore.toggleTranslation(msgId)
      return
    }
    messageStore.setTranslating(msgId, true)
    try {
      const result = await _getClient().translateMessage({ text, languages: [lang] })
      console.log('[useChat] translateMessage raw result:', JSON.stringify(result))
      // SDK AsyncResult<TranslationResult> — data 可能为对象或数组，兼容处理
      const data = result?.data
      const translationResult = Array.isArray(data) ? data[0] : data
      const translation = translationResult?.translations?.[0]
      if (translation) {
        messageStore.setTranslation(msgId, { text: translation.text, to: translation.to })
      } else {
        messageStore.setTranslating(msgId, false)
        console.warn('[useChat] translateMessage: no translation in response, data:', data)
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
      await client.recallMessage({
        mid: msgId,
        to: cvs.id,
        chatType: cvs.type,
      })
      // 发起方：SDK 调用成功后立即本地标记撤回（不需要等 onRecallMessage，那是给被撤回方用的）
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
   * 用于转发后让目标会话立即显示新消息，无需刷新页面
   */
  function _insertForwardedMessage(sdkMsg: EasemobChat.MessageBody, targetId: string, targetType: ConversationTypeValue) {
    const currentUser = stores.client.currentUser
    const isGroup = targetType === CONVERSATION_TYPE.GROUPCHAT
    const uiMsg: Message = {
      ...sdkMsg,
      from: sdkMsg.from || currentUser || '',
      conversationId: targetId,
      isSelf: true,
      status: MESSAGE_STATUS.SENT,
      timestamp: Date.now(),
    } as Message
    messageStore.addMessage(uiMsg)
  }

  /**
   * 单条转发消息到指定会话
   * - 文本消息：直接创建新文本消息发送
   * - 其他类型：提取原消息文件信息，创建同类型消息发送（真正转发原文件）
   */
  async function forwardMessage(message: Message, targetConversation: Conversation) {
    const client = _getClient()

    if (message.type === 'txt') {
      const text = (message as unknown as { msg?: string }).msg || ''
      const sdkMsg = client.createMessage({
        type: 'txt',
        to: targetConversation.id,
        chatType: targetConversation.type as EasemobChat.ChatType,
        msg: text,
        ext: message.ext,
      })
      try {
        const result = await client.sendCreatedMessage(sdkMsg)
        _onSendResult(sdkMsg.id, undefined, result.message)
        _insertForwardedMessage(result.message || sdkMsg, targetConversation.id, targetConversation.type)
        _updateTargetConversation(targetConversation.id, targetConversation.type, text, Date.now(), 'txt')
      } catch (e) {
        _onSendResult(sdkMsg.id, e)
        throw e
      }
      return
    }

    // 非文本消息：提取原消息文件信息，创建同类型消息真正转发
    const baseOptions = {
      type: message.type,
      to: targetConversation.id,
      chatType: targetConversation.type as EasemobChat.ChatType,
      ext: message.ext,
    } as Record<string, any>

    switch (message.type) {
      case 'img': {
        const imgMsg = message as unknown as { url?: string; secret?: string; filename?: string; file_length?: number; width?: number; height?: number; thumb?: string; thumb_secret?: string }
        baseOptions.url = imgMsg.url
        baseOptions.secret = imgMsg.secret
        baseOptions.filename = imgMsg.filename || 'image.jpg'
        baseOptions.file_length = imgMsg.file_length || 0
        if (imgMsg.width) baseOptions.width = imgMsg.width
        if (imgMsg.height) baseOptions.height = imgMsg.height
        if (imgMsg.thumb) baseOptions.thumb = imgMsg.thumb
        if (imgMsg.thumb_secret) baseOptions.thumb_secret = imgMsg.thumb_secret
        break
      }
      case 'audio': {
        const audioMsg = message as unknown as { url?: string; secret?: string; filename?: string; file_length?: number; length?: number }
        baseOptions.url = audioMsg.url
        baseOptions.secret = audioMsg.secret
        baseOptions.filename = audioMsg.filename || 'audio.amr'
        baseOptions.file_length = audioMsg.file_length || 0
        baseOptions.length = audioMsg.length || 0
        break
      }
      case 'video': {
        const videoMsg = message as unknown as { url?: string; secret?: string; filename?: string; file_length?: number; length?: number; thumb?: string; thumb_secret?: string }
        baseOptions.url = videoMsg.url
        baseOptions.secret = videoMsg.secret
        baseOptions.filename = videoMsg.filename || 'video.mp4'
        baseOptions.file_length = videoMsg.file_length || 0
        baseOptions.length = videoMsg.length || 0
        if (videoMsg.thumb) baseOptions.thumb = videoMsg.thumb
        if (videoMsg.thumb_secret) baseOptions.thumb_secret = videoMsg.thumb_secret
        break
      }
      case 'file': {
        const fileMsg = message as unknown as { url?: string; secret?: string; filename?: string; file_length?: number }
        baseOptions.url = fileMsg.url
        baseOptions.secret = fileMsg.secret
        baseOptions.filename = fileMsg.filename || 'file'
        baseOptions.file_length = fileMsg.file_length || 0
        break
      }
      case 'loc': {
        const locMsg = message as unknown as { lat?: number; lng?: number; addr?: string }
        baseOptions.lat = locMsg.lat || 0
        baseOptions.lng = locMsg.lng || 0
        baseOptions.addr = locMsg.addr || ''
        break
      }
      case 'custom': {
        const customMsg = message as unknown as { customEvent?: string; customExts?: Record<string, any> }
        baseOptions.customEvent = customMsg.customEvent || ''
        baseOptions.customExts = customMsg.customExts || {}
        break
      }
      default: {
        // 不支持的类型降级为文本描述
        const typeMap: Record<string, string> = {
          img: '[图片]', audio: '[语音]', video: '[视频]',
          file: '[文件]', custom: '[自定义消息]', loc: '[位置]',
        }
        const desc = typeMap[message.type] || '[消息]'
        const sdkMsg = client.createMessage({
          type: 'txt',
          to: targetConversation.id,
          chatType: targetConversation.type as EasemobChat.ChatType,
          msg: desc,
          ext: { ...(message.ext || {}), uikitForward: { originalType: message.type, originalFrom: message.from, originalTime: message.timestamp } },
        })
        try {
          const result = await client.sendCreatedMessage(sdkMsg)
          _onSendResult(sdkMsg.id, undefined, result.message)
          _insertForwardedMessage(result.message || sdkMsg, targetConversation.id, targetConversation.type)
          _updateTargetConversation(targetConversation.id, targetConversation.type, desc, Date.now(), 'txt')
        } catch (e) {
          _onSendResult(sdkMsg.id, e)
          throw e
        }
        return
      }
    }

    const sdkMsg = client.createMessage(baseOptions as any)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
      _insertForwardedMessage(result.message || sdkMsg, targetConversation.id, targetConversation.type)
      _updateTargetConversation(targetConversation.id, targetConversation.type, `[${message.type}]`, Date.now(), message.type)
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
      throw e
    }
  }

  /** 合并消息最大条数 */
  const COMBINE_MAX_COUNT = 300

  /**
   * 多选转发：使用环信合并消息 API（Combine.create）
   * - 仅允许转发成功发送/接收的消息（status === SENT）
   * - 最多 300 条消息
   * - 支持嵌套，最多 10 层（由 SDK 控制）
   */
  async function forwardCombineMessages(messages: Message[], targetConversation: Conversation) {
    const client = _getClient()

    // 过滤：只有成功发送或接收的消息才能合并转发
    const validMessages = messages.filter(m => m.status === MESSAGE_STATUS.SENT && !m.recalled)
    if (validMessages.length === 0) {
      throw new Error(t('message.forward.noValidMessages') || '没有可转发的消息')
    }
    if (validMessages.length > COMBINE_MAX_COUNT) {
      throw new Error(t('message.forward.tooMany').replace('{max}', String(COMBINE_MAX_COUNT)) || `最多支持 ${COMBINE_MAX_COUNT} 条消息`)
    }

    // 构建合并消息的 messageList（需要 SDK 原始消息格式）
    const messageList: EasemobChat.CombineMsgList = validMessages.map(m => {
      // 将 UI Message 转换回 SDK 消息格式（排除 UI 扩展字段）
      const sdkMsg: Record<string, any> = {}
      const uiKeys = new Set([
        'conversationId', 'isSelf', 'status', 'timestamp', 'groupReadCount',
        'groupMemberCount', 'requireGroupAck', 'recalled', 'recalledBy',
        'originalMsg', 'mid', 'modified', 'modifiedInfo', 'pinned',
        'pinTime', 'pinOperatorId', 'translation', 'showTranslation',
        'translating', 'failReason',
      ])
      for (const key in m) {
        if (!uiKeys.has(key)) {
          sdkMsg[key] = (m as Record<string, any>)[key]
        }
      }
      return sdkMsg as EasemobChat.CombineMsgList[number]
    })

    // 构建摘要
    const summary = validMessages.slice(0, 3).map(m => {
      const sender = m.from || ''
      let content = ''
      switch (m.type) {
        case 'txt': content = (m as unknown as { msg?: string }).msg || ''; break
        case 'img': content = '[图片]'; break
        case 'audio': content = '[语音]'; break
        case 'video': content = '[视频]'; break
        case 'file': content = '[文件]'; break
        case 'custom': content = '[自定义消息]'; break
        case 'loc': content = '[位置]'; break
        default: content = '[消息]'
      }
      return `${sender}: ${content}`
    }).join('\n')

    const title = t('message.forward.combineTitle') || '聊天记录'
    const compatibleText = t('message.forward.combineCompatible') || '[该版本不支持合并消息，请升级]'

    const sdkMsg = client.createMessage({
      type: 'combine',
      to: targetConversation.id,
      chatType: targetConversation.type as EasemobChat.ChatType,
      title,
      summary,
      compatibleText,
      messageList,
      onFileUploadComplete: (data: { url: string; secret: string }) => {
        // 文件上传完成后补全 url 和 secret，否则无法下载解析
        messageStore.updateMessageById(sdkMsg.id, {
          url: data.url,
          secret: data.secret,
        } as Partial<Message>)
      },
    } as EasemobChat.CreateCombineMsgParameters)

    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
      _insertForwardedMessage(result.message || sdkMsg, targetConversation.id, targetConversation.type)
      _updateTargetConversation(targetConversation.id, targetConversation.type, '[聊天记录]', Date.now(), 'combine')
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
      throw e
    }
  }

  /**
   * 重发失败的消息
   * - 先删除旧消息，再重新创建并发送
   * - 返回新消息的 id
   */
  async function resendMessage(message: Message) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()

    // 删除旧失败消息
    messageStore.deleteMessage(message.id)

    const options: CreateMsgOptions = {
      type: message.type,
      to: cvs.id,
      chatType: cvs.type as EasemobChat.ChatType,
    }

    // 根据消息类型重建参数
    switch (message.type) {
      case 'txt':
        options.msg = (message as unknown as { msg?: string }).msg || ''
        break
      case 'img':
      case 'audio':
      case 'video':
      case 'file': {
        const fileMsg = message as unknown as { file?: EasemobChat.FileObj; filename?: string; length?: number; width?: number; height?: number }
        if (fileMsg.file) {
          options.file = fileMsg.file
        }
        if (fileMsg.filename) options.filename = fileMsg.filename
        if (fileMsg.length) options.length = fileMsg.length
        if (fileMsg.width) options.width = fileMsg.width
        if (fileMsg.height) options.height = fileMsg.height
        break
      }
      case 'custom': {
        const customMsg = message as unknown as { customEvent?: string; customExts?: Record<string, any> }
        if (customMsg.customEvent) options.customEvent = customMsg.customEvent
        if (customMsg.customExts) options.customExts = customMsg.customExts
        break
      }
      default:
        console.warn('[useChat] resendMessage: unsupported message type', message.type)
        return
    }

    if (message.ext) {
      options.ext = message.ext
    }

    const sdkMsg = client.createMessage(options as EasemobChat.CreateMsgType)
    _insertSendingMessage(sdkMsg, cvs.id, cvs.type, message.requireGroupAck)
    try {
      const result = await client.sendCreatedMessage(sdkMsg)
      _onSendResult(sdkMsg.id, undefined, result.message)
      return sdkMsg.id
    } catch (e) {
      _onSendResult(sdkMsg.id, e)
      throw e
    }
  }

  /**
   * 发送输入状态命令消息（TypingBegin）
   * - 仅单聊有效
   * - 通过 CMD 消息发送，对端收到后显示"对方正在输入..."
   */
  async function sendTypingCmd() {
    const cvs = conversationStore.currentConversation
    if (!cvs || cvs.type !== CONVERSATION_TYPE.SINGLECHAT) return
    const client = _getClient()
    try {
      const sdkMsg = client.createMessage({
        type: 'cmd',
        to: cvs.id,
        chatType: cvs.type as EasemobChat.ChatType,
        action: TYPING_ACTION.BEGIN,
      } as EasemobChat.CreateCmdMsgParameters)
      await client.sendCreatedMessage(sdkMsg)
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
