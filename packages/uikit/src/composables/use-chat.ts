import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { useLocale } from '../locale'
import type { Message } from '../store/message'
import type { Conversation } from '../store/conversation'
import { MESSAGE_STATUS, MESSAGE_TYPE, CONVERSATION_TYPE } from '../constants'
import type { ConversationTypeValue } from '../constants'
import { getClient } from '../sdk/client'
import type { UIKitClient } from '../sdk/client'
import type { EasemobChat } from 'easemob-websdk'

// ===== 多选模式状态（模块级单例，确保同一页面内多处调用共享同一份状态） =====
const isMultiSelectMode = ref(false)
const selectedMessageIds = ref<Set<string>>(new Set())

// ===== 编辑模式状态（模块级单例） =====
const editingMessage = ref<Message | null>(null)
/** SDK 限制：单条消息最多可被修改 5 次 */
const MODIFY_LIMIT = 5

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

function enterEditMode(message: Message) {
  editingMessage.value = message
}

function exitEditMode() {
  editingMessage.value = null
}

export function useChat() {
  const { stores } = useUIKit()
  const { locale } = useLocale()
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
      messageStore.updateMessageStatus(msgId, MESSAGE_STATUS.FAILED)
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

  /** 发送图片消息 */
  async function sendImageMessage(file: File, groupReadReceiptConfig?: { enabled?: boolean; maxGroupSize?: number }, ext?: Record<string, any>) {
    const cvs = conversationStore.currentConversation
    if (!cvs) return
    const client = _getClient()
    const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
    const enableGroupAck = _shouldEnableGroupAck(cvs.type, cvs.id, groupReadReceiptConfig?.enabled, groupReadReceiptConfig?.maxGroupSize)
    const sdkMsg = client.createMessage({
      type: 'img',
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
      const translation = result?.data?.translations?.[0]
      if (translation) {
        messageStore.setTranslation(msgId, { text: translation.text, to: translation.to })
      } else {
        messageStore.setTranslating(msgId, false)
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
    // 多选相关
    isMultiSelectMode,
    selectedMessages,
    selectedMessageIds,
    enterMultiSelectMode,
    exitMultiSelectMode,
    toggleMessageSelection,
    isMessageSelected,
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
  }
}
