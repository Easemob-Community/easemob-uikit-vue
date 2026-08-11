import type { GroupMessageReadUser, GroupMessageReadUsersResult, Message as SdkMessage, VoiceMessageSource, VoiceParams } from 'easemob-websdk'
import type { MessageStatus, UiMessage } from '../types'
import type { ConversationTypeValue } from '../../constants'
import type { ManagerHost } from '../client'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '../../constants'
import { toUiMessage } from '../adapter/message-adapter'
import { isVoiceBody } from '../types/message'
import { createLogger } from '../../utils/logger'
import { formatSdkError } from '../../utils/sdk-error'

const combineLogger = createLogger('Combine')
const historyLogger = createLogger('History')
const messageLogger = createLogger('MessageDomain')

/** 上传进度回调写入 store 的最小间隔（ms），避免 XHR progress 事件高频触发整列表重渲染 */
const PROGRESS_FLUSH_INTERVAL = 150

/**
 * 已发送过已读回执的消息 ID 集合（模块级去重）。
 * 实时回执路径（chat-events）与进入会话补发路径共享，避免重复发送。
 */
const sentReadReceiptIds = new Set<string>()
/** 去重集合上限，超出后淘汰最早记录（Set 按插入序迭代） */
const MAX_SENT_READ_RECEIPT_IDS = 5000

/** 记录已发送过已读回执的消息 ID（供实时回执与补发路径共享去重） */
export function markReadReceiptSent(messageIds: string[]) {
  for (const id of messageIds) {
    sentReadReceiptIds.add(id)
    if (sentReadReceiptIds.size > MAX_SENT_READ_RECEIPT_IDS) {
      const oldest = sentReadReceiptIds.values().next().value
      if (oldest !== undefined)
        sentReadReceiptIds.delete(oldest)
    }
  }
}

/**
 * MessageStore 需要暴露给 Domain 的最小接口。
 * 具体实现由 store/message.ts 提供。
 */
export interface MessageStoreLike {
  getMessages: (conversationId: string) => UiMessage[]
  addMessage: (msg: UiMessage) => void
  addSendingMessage: (localId: string, sdkMsg: SdkMessage) => void
  replaceWithSent: (localId: string, msg: UiMessage) => void
  updateUploadProgress: (localId: string, percent: number) => void
  markFailed: (localId: string, reason: string) => void
  prependMessages: (conversationId: string, msgs: UiMessage[]) => void
  updateStatusByServerId: (serverId: string, status: MessageStatus) => void
  recallMessage: (serverId: string, operatorId?: string) => void
  updateMessage: (serverId: string, msg: UiMessage) => void
  setPinnedMessages: (conversationId: string, msgs: UiMessage[]) => void
  setTranslation: (msgId: string, translation: { text: string, to: string }) => void
  setTranslating: (msgId: string, translating: boolean) => void
  setVoiceText: (msgId: string, voiceText: { text: string }) => void
  setVoiceTranscribing: (msgId: string, transcribing: boolean) => void
  clearConversationMessages: (conversationId: string) => void
  updateMessageById: (msgId: string, patch: Partial<UiMessage>) => void
}

/**
 * 消息业务域：封装 SDK ChatManager 的消息相关能力。
 */
export class MessageDomain {
  constructor(
    private client: ManagerHost,
    private store: MessageStoreLike,
  ) {}

  // ===== 发送消息 =====

  async sendText(
    conversationId: string,
    conversationType: ConversationTypeValue,
    content: string,
    ext?: Record<string, unknown>,
    /** 是否请求消息已读回执（单聊/群聊均可，SDK CreateMessageBaseParams.needReadReceipt） */
    needReadReceipt?: boolean,
  ) {
    const sdkMsg = this.client.chatManager.createTextMessage({
      conversationId,
      conversationType,
      content,
      ext,
      needReadReceipt,
    })
    return this._send(sdkMsg)
  }

  async sendImage(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    /** 是否请求消息已读回执（仅群聊生效） */
    needReadReceipt?: boolean,
  ) {
    const sdkMsg = this.client.chatManager.createImageMessage({
      conversationId,
      conversationType,
      ext,
      needReadReceipt,
      ...(typeof data === 'string' ? { originalUrl: data } : { data }),
    })
    return this._send(sdkMsg)
  }

  async sendFile(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    /** 是否请求消息已读回执（仅群聊生效） */
    needReadReceipt?: boolean,
  ) {
    const sdkMsg = this.client.chatManager.createFileMessage({
      conversationId,
      conversationType,
      ext,
      needReadReceipt,
      ...(typeof data === 'string' ? { originalUrl: data } : { data }),
    })
    return this._send(sdkMsg)
  }

  async sendVoice(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    /** 是否请求消息已读回执（仅群聊生效） */
    needReadReceipt?: boolean,
  ) {
    const sdkMsg = this.client.chatManager.createVoiceMessage({
      conversationId,
      conversationType,
      duration,
      ext,
      needReadReceipt,
      ...(typeof data === 'string' ? { originalUrl: data } : { data }),
    })
    return this._send(sdkMsg)
  }

  async sendVideo(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    /** 是否请求消息已读回执（仅群聊生效） */
    needReadReceipt?: boolean,
  ) {
    const sdkMsg = this.client.chatManager.createVideoMessage({
      conversationId,
      conversationType,
      duration,
      ext,
      needReadReceipt,
      ...(typeof data === 'string' ? { originalUrl: data } : { data }),
    })
    return this._send(sdkMsg)
  }

  async sendLocation(
    conversationId: string,
    conversationType: ConversationTypeValue,
    latitude: number,
    longitude: number,
    address?: string,
    ext?: Record<string, unknown>,
  ) {
    const sdkMsg = this.client.chatManager.createLocationMessage({
      conversationId,
      conversationType,
      latitude,
      longitude,
      address,
      ext,
    })
    return this._send(sdkMsg)
  }

  async sendCustom(
    conversationId: string,
    conversationType: ConversationTypeValue,
    event: string,
    params?: Record<string, string>,
    ext?: Record<string, unknown>,
  ) {
    const sdkMsg = this.client.chatManager.createCustomMessage({
      conversationId,
      conversationType,
      event,
      params,
      ext,
    })
    return this._send(sdkMsg)
  }

  async sendCmd(
    conversationId: string,
    conversationType: ConversationTypeValue,
    action: string,
    ext?: Record<string, unknown>,
  ) {
    const sdkMsg = this.client.chatManager.createCmdMessage({
      conversationId,
      conversationType,
      action,
      ext,
      // CMD 消息（如 typing）只投递给在线用户，不存离线队列。
      deliverOnlineOnly: true,
    })
    return this._send(sdkMsg)
  }

  async sendCombine(
    conversationId: string,
    conversationType: ConversationTypeValue,
    title: string,
    summary: string,
    compatibleText: string,
    messageList: readonly SdkMessage[],
    ext?: Record<string, unknown>,
  ) {
    // 分段计时埋点：定位合并转发"卡发送中/页面无响应"的真实耗时段
    const t0 = performance.now()
    const sdkMsg = this.client.chatManager.createCombineMessage({
      conversationId,
      conversationType,
      title,
      summary,
      compatibleText,
      messageList,
      ext,
    })
    combineLogger.info('createCombineMessage done', {
      items: messageList.length,
      elapsedMs: Math.round(performance.now() - t0),
    })
    return this._send(sdkMsg)
  }

  /** 通用发送流程 */
  private async _send(sdkMsg: SdkMessage): Promise<SdkMessage> {
    const localId = sdkMsg.msgLocalId
    const isCombine = sdkMsg.type === MESSAGE_TYPE.COMBINE

    // CMD 消息为透传命令，不应进入消息 store 上屏渲染（如 typing 指令）。
    // 直接投递给 SDK，不跟踪发送状态/进度/失败原因。
    if (sdkMsg.type === MESSAGE_TYPE.CMD) {
      return this.client.chatManager.sendMessage(sdkMsg)
    }

    this.store.addSendingMessage(localId, sdkMsg)

    // 进度回调统计与节流：XHR progress 事件可能高频触发，
    // 每次原样写 store 会替换整个消息数组引用并驱动整列表重渲染
    let progressEvents = 0
    let lastProgressFlush = 0
    const sendStart = performance.now()

    try {
      const sent = await this.client.chatManager.sendMessage(sdkMsg, {
        onFileUploadProgress: (progress) => {
          progressEvents += 1
          const percent = progress.percent ?? 0
          const now = performance.now()
          if (percent < 100 && now - lastProgressFlush < PROGRESS_FLUSH_INTERVAL)
            return
          lastProgressFlush = now
          this.store.updateUploadProgress(localId, percent)
        },
      })

      if (isCombine) {
        combineLogger.info('sendMessage done', {
          elapsedMs: Math.round(performance.now() - sendStart),
          progressEvents,
        })
      }
      const uiMsg = toUiMessage(sent, this.currentUserId)
      this.store.replaceWithSent(localId, uiMsg)
      return sent
    }
    catch (error) {
      if (isCombine) {
        combineLogger.warn('sendMessage failed', {
          elapsedMs: Math.round(performance.now() - sendStart),
          progressEvents,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      const reason = error instanceof Error ? error.message : String(error)
      this.store.markFailed(localId, reason)
      throw error
    }
  }

  // ===== 历史消息 =====

  async fetchHistory(
    conversationId: string,
    conversationType: ConversationTypeValue,
    cursor?: string,
    pageSize = 20,
  ) {
    const page = await this.client.chatManager.getHistoryMessages({
      conversationId,
      conversationType,
      pageSize,
      cursor,
      searchDirection: 'up',
    })

    // 调试：打印获取历史消息接口的原始返回数据
    historyLogger.info('fetchHistory raw response', {
      conversationId,
      conversationType,
      cursor,
      pageSize,
      raw: page,
    })

    // CMD 消息为透传命令，不应上屏渲染；历史消息入口也主动过滤。
    const uiMsgs = page.items
      .filter(msg => msg.type !== MESSAGE_TYPE.CMD)
      .map(msg => toUiMessage(msg, this.currentUserId))
    this.store.prependMessages(conversationId, uiMsgs)

    // 群聊历史消息（刷新首屏与上滑翻页共用此路径）：getHistoryMessages 返回的
    // 离线消息不带群已读数（groupReadCount），需调用 getGroupMessageReadReceipts
    // 批量补全，异步执行不阻塞历史消息返回与渲染。
    if (conversationType === CONVERSATION_TYPE.GROUPCHAT)
      void this.fillGroupReadCounts(uiMsgs, conversationId)

    return {
      items: uiMsgs,
      cursor: page.cursor,
      hasMore: page.hasMore,
    }
  }

  /**
   * 补全群聊历史消息的已读数：对已读数缺失的己方消息，调用
   * getGroupMessageReadReceipts 批量获取 count 并写入 store
   * （服务端单次最多 20 条，超过自动分批）；失败仅告警，不影响整体。
   *
   * 注意：不做 needReadReceipt 筛选——该字段是发送时的创建参数，历史消息
   * 返回时通常不携带；已读数只对发送者有意义，且 SDK 已带 groupReadCount
   * 的消息会被过滤，不会重复请求。
   */
  private async fillGroupReadCounts(uiMsgs: UiMessage[], groupId: string) {
    const candidates = uiMsgs.filter(m => m.isSelf && !(m.groupReadCount ?? 0))
    const serverIds = candidates
      .map(m => m.msgServerId)
      .filter((id): id is string => !!id)
    // 无论目标是否为空都打印，便于确认筛选结果
    historyLogger.info('fillGroupReadCounts scan', {
      groupId,
      total: uiMsgs.length,
      selfMissingCount: candidates.length,
      targets: serverIds.length,
    })
    if (serverIds.length === 0)
      return
    // 服务端限制单次最多 20 条消息 ID，按 20 条分批请求
    const BATCH_SIZE = 20
    for (let i = 0; i < serverIds.length; i += BATCH_SIZE) {
      const batch = serverIds.slice(i, i + BATCH_SIZE)
      try {
        const receipts = await this.client.chatManager.getGroupMessageReadReceipts({
          groupId,
          messageIds: batch,
        })
        historyLogger.info('fillGroupReadCounts result', { groupId, batch, receipts })
        for (const receipt of receipts) {
          if (receipt.count > 0)
            this.store.updateMessageById(receipt.messageId, { groupReadCount: receipt.count })
        }
      }
      catch (error) {
        messageLogger.warn('[MessageDomain.fillGroupReadCounts] failed:', batch, formatSdkError(error))
      }
    }
  }

  // ===== 消息操作 =====

  async recall(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) {
    await this.client.chatManager.recallMessage({
      conversationId,
      conversationType,
      messageId,
    })
  }

  /** 批量发送消息已读回执（统一 API，支持单聊/群聊） */
  async markMessagesRead(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageIds: string[],
  ) {
    if (messageIds.length === 0)
      return
    // SDK 单次最多允许 50 个 messageId，超过需分批发送。
    const BATCH_SIZE = 50
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE)
      await this.client.chatManager.sendMessageReadReceipts({
        conversationId,
        conversationType,
        messageIds: batch,
      })
    }
  }

  /**
   * 补发当前会话中尚未发送过已读回执的接收消息（批量）。
   *
   * 场景：接收方登录时收到群内/单聊离线消息，onMessage 阶段当前会话可能
   * 尚未打开而无法即时发送回执（群聊发送方气泡的已读数量因此不更新）；
   * 点击会话进入后统一批量补发，使发送方能及时看到已读状态/人数。
   * 已发送过的消息经 sentReadReceiptIds 去重，不会重复请求；
   * 失败仅 warn 不阻塞进入会话（先标记后发送，失败回滚以便下次重试）。
   */
  async sendPendingReadReceipts(
    conversationId: string,
    conversationType: ConversationTypeValue,
  ) {
    const messages = this.store.getMessages(conversationId)
    const pendingIds = messages
      .filter(m => !m.isSelf && !sentReadReceiptIds.has(m.msgServerId))
      .map(m => m.msgServerId)
      .filter((id): id is string => !!id)
    if (pendingIds.length === 0)
      return
    // 先标记再发送：并发进入会话不会重复请求
    for (const id of pendingIds)
      sentReadReceiptIds.add(id)
    try {
      await this.markMessagesRead(conversationId, conversationType, pendingIds)
    }
    catch (error) {
      for (const id of pendingIds)
        sentReadReceiptIds.delete(id)
      messageLogger.warn('[MessageDomain.sendPendingReadReceipts] failed:', conversationId, formatSdkError(error))
    }
  }

  /** 置顶消息 */
  async pinMessage(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) {
    await this.client.chatManager.pinMessage({ conversationId, conversationType, messageId })
  }

  /** 取消置顶 */
  async unpinMessage(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) {
    await this.client.chatManager.unpinMessage({ conversationId, conversationType, messageId })
  }

  /** 获取会话内置顶消息列表（最多 20 条） */
  async getPinnedMessages(conversationId: string, conversationType: ConversationTypeValue) {
    const result = await this.client.chatManager.getPinnedMessageList({
      conversationId,
      conversationType,
    })
    const uiMsgs = result.items.map(item => toUiMessage(item.message, this.currentUserId))
    this.store.setPinnedMessages(conversationId, uiMsgs)
    return uiMsgs
  }

  /** 翻译文本消息 */
  async translateMessage(message: SdkMessage, targetLanguages: string[]) {
    try {
      const result = await this.client.chatManager.translateMessage({
        message,
        targetLanguages,
      })
      return result
    }
    catch (error) {
      // 打印原始报错，便于业务方定位未开通/参数/网络等问题
      messageLogger.error('[MessageDomain.translateMessage] raw SDK error:', formatSdkError(error))
      throw error
    }
  }

  /** 语音消息转文字 */
  async transcribeVoiceMessage(
    message: SdkMessage,
    voiceParams?: VoiceParams,
  ) {
    // SDK 要求传入语音消息体（VoiceMessageBody），且需要能从 url 解析出 fileId；
    // 类型守卫收窄 body 后，用 SDK 的 VoiceMessageSource 补上 type 字段，
    // 兼容部分历史消息 body 缺少 type 的情况（SDK 签名仅认 VoiceMessageBody，
    // VoiceMessageSource 是其超集，可直接传入）。
    if (!isVoiceBody(message.body)) {
      messageLogger.warn('[MessageDomain.transcribeVoiceMessage] not a voice message:', message)
      throw new Error('not a voice message')
    }
    const body: VoiceMessageSource = {
      ...message.body,
      type: MESSAGE_TYPE.VOICE,
    }
    // 打印转入语音转文字的原始入参，便于定位 url/fileId/format 等参数问题
    messageLogger.info('voiceMessageToText raw input:', { message, body, voiceParams })
    const result = await this.client.chatManager.voiceMessageToText(body, voiceParams)
    return result
  }

  /** 下载并解析合并消息 */
  async downloadCombineMessage(message: SdkMessage) {
    return this.client.chatManager.downloadAndParseCombineMessage({ message })
  }

  /** 获取群消息已读用户列表 */
  async getGroupMessageReadUsers(
    groupId: string,
    messageId: string,
    cursor?: string,
    pageSize = 20,
  ) {
    return this.client.chatManager.getGroupMessageReadUsers({
      groupId,
      messageId,
      cursor,
      pageSize,
    })
  }

  private get currentUserId() {
    return this.client.currentUserId || ''
  }

  /** 发送单条消息已读回执 */
  async markRead(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) {
    await this.client.chatManager.sendMessageReadReceipts({
      conversationId,
      conversationType,
      messageIds: [messageId],
    })
  }

  /** 获取群消息已读详情（自动翻页聚合全部已读成员） */
  async fetchGroupReadDetail(
    groupId: string,
    messageId: string,
    pageSize = 100,
  ): Promise<GroupMessageReadUsersResult> {
    let cursor: string | undefined
    const users: GroupMessageReadUser[] = []
    let count = 0
    do {
      const page = await this.client.chatManager.getGroupMessageReadUsers({
        groupId,
        messageId,
        cursor,
        pageSize,
      })
      users.push(...page.users)
      count = page.count
      cursor = page.cursor || undefined
    } while (cursor)
    return {
      groupId,
      messageId,
      users,
      count,
      cursor: '',
      hasMore: false,
    }
  }

  /** 修改文本消息 */
  async modifyText(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
    text: string,
  ) {
    await this.client.chatManager.modifyMessage({
      conversationId,
      conversationType,
      messageId,
      message: {
        type: MESSAGE_TYPE.TEXT,
        body: { content: text },
        ext: {},
      },
    })
  }
}
