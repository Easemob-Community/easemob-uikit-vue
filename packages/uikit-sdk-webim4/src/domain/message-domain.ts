import WebIM from 'easemob-websdk-4'
import type { EasemobChat } from 'easemob-websdk-4'
import type {
  ConversationTypeValue,
  MessagePersistenceHooks,
  MessageRepository,
  SdkMessage,
  UiMessage,
} from '@easemob/uikit-sdk-contract'
import {
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  createLogger,
  isCombineBody,
  isTextBody,
  isVoiceBody,
  normalizeUserId,
  toMessageRecord,
} from '@easemob/uikit-sdk-contract'
import { toUiMessage, toWebim4MessageBody } from '../adapter/message-adapter'
import type { Webim4Client } from '../client'
import type { MessageStoreLike } from '../event/types'
import { firePersistenceHook } from '../persistence'

const messageLogger = createLogger('UIKit:Webim4MessageDomain')
const historyLogger = createLogger('UIKit:Webim4History')

/** 4.x 消息体判别联合（剔除 read/delivery/channel 回执体） */
type MessagesType = EasemobChat.ExcludeAckMessageBody

/** 上传进度回调写入 store 的最小间隔（ms），对齐 websdk5，避免高频 progress 事件驱动整列表重渲染 */
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

/** 清空已读回执去重集合（登出/重新登录时调用，防止跨会话残留） */
export function resetReadReceiptState() {
  sentReadReceiptIds.clear()
}

/**
 * File | string → 4.x FileObj 创建参数。
 * - File：SDK 内部走上传（data 必填）；
 * - string（URL 直发）：按 url 透传，data 以 undefined 兜底——
 *   4.x FileObj.data 类型必填，URL 直发时 SDK 不读 data（服务端可拉取的已上传地址场景）。
 */
function toFileObj(data: File | string, filename = '', filetype = ''): EasemobChat.FileObj {
  if (typeof data === 'string') {
    return { url: data, filename, filetype, data: undefined as unknown as File }
  }
  return { url: '', filename: data.name, filetype: data.type, data }
}

/** 4.x 群已读回执开关：needReadReceipt=true 时透传 msgConfig.allowGroupAck（仅群聊生效） */
function toMsgConfig(needReadReceipt: boolean | undefined): { allowGroupAck: boolean } | undefined {
  return needReadReceipt ? { allowGroupAck: true } : undefined
}

/** MessageDomain 装配选项 */
export interface MessageDomainOptions {
  /**
   * 消息数据入口接管注入（Phase 3.1 留口子）：当前仅消费 `loadMessages`
   * （fetchHistory 委托），其余方法为后续 DB 阶段预留。
   * Message repository override (Phase 3.1 seam): only `loadMessages`
   * is consumed (fetchHistory delegation) for now.
   */
  messageRepository?: Partial<MessageRepository>
  /**
   * 旁路持久化钩子（Electron 本地库 SQLite 留口子，对齐 websdk5）：
   * - 发送成功后 `saveMessage`（发送失败不入库）；
   * - 漫游历史回流（SDK 路径）批量 `saveMessages`；
   *   注入 repository 路径（数据来自 DB）不写回；
   * - 全部 fire-and-forget，钩子异常只告警不阻塞消息链路。
   */
  messagePersistence?: MessagePersistenceHooks
}

/**
 * 中立 SdkMessage → UiMessage（注入 repository 路径用）：
 * 注入方返回的是中立形状，补 UI 派生字段（isSelf/localId/status），
 * 推导规则与 adapter/message-adapter 的 toUiMessage 保持一致（对齐 websdk5）。
 */
function hydrateUiMessage(msg: SdkMessage, currentUserId: string): UiMessage {
  const isSelf = normalizeUserId(msg.from) === normalizeUserId(currentUserId)
  return {
    ...msg,
    isSelf,
    localId: msg.msgLocalId,
    status: isSelf && msg.isPeerRead === true
      ? MESSAGE_STATUS.READ
      : (msg.sendStatus ?? MESSAGE_STATUS.SENT),
  }
}

/**
 * 消息业务域（4.x）：`WebIM.message.create` + `connection.send` 发送，
 * `connection.getHistoryMessages` 拉历史，`connection.recallMessage` 撤回，
 * 已读回执走 4.x 的 read 消息模型（回执即消息，无 5.x 的 sendMessageReadReceipts API）。
 */
export class MessageDomain {
  constructor(
    private client: Webim4Client,
    private store: MessageStoreLike,
    private options: MessageDomainOptions = {},
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4MessageDomain] connection 尚未初始化')
    return conn
  }

  private get currentUserId() {
    return this.client.currentUserId || ''
  }

  // ===== 发送消息 =====

  async sendText(
    conversationId: string,
    conversationType: ConversationTypeValue,
    content: string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    const body = WebIM.message.create({
      type: 'txt',
      chatType: conversationType,
      to: conversationId,
      msg: content,
      ext,
      msgConfig: toMsgConfig(needReadReceipt),
    } as EasemobChat.CreateTextMsgParameters) as EasemobChat.TextMsgBody
    return this._send(body)
  }

  async sendImage(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    // GIF 判定与 websdk5 对齐：4.x 需显式传 isGif，否则服务端按静态图处理
    const isGif = typeof data === 'string'
      ? /\.gif(?:$|\?)/i.test(data)
      : data.type === 'image/gif' || /\.gif$/i.test(data.name)
    const body = WebIM.message.create({
      type: 'img',
      chatType: conversationType,
      to: conversationId,
      ...(typeof data === 'string'
        ? { url: data, file_length: 0 }
        : { file: toFileObj(data), file_length: data.size }),
      ext,
      msgConfig: toMsgConfig(needReadReceipt),
      ...(isGif ? { isGif: true } : {}),
    } as EasemobChat.CreateImgMsgParameters) as EasemobChat.ImgMsgBody
    return this._send(body)
  }

  async sendFile(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    const body = WebIM.message.create({
      type: 'file',
      chatType: conversationType,
      to: conversationId,
      file: toFileObj(data),
      filename: typeof data === 'string' ? '' : data.name,
      ext,
      msgConfig: toMsgConfig(needReadReceipt),
    } as EasemobChat.CreateFileMsgParameters) as EasemobChat.FileMsgBody
    return this._send(body)
  }

  async sendVoice(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    const body = WebIM.message.create({
      type: 'audio',
      chatType: conversationType,
      to: conversationId,
      file: toFileObj(data),
      filename: typeof data === 'string' ? '' : data.name,
      length: Math.round(duration),
      file_length: typeof data === 'string' ? 0 : data.size,
      ext,
      msgConfig: toMsgConfig(needReadReceipt),
    } as EasemobChat.CreateAudioMsgParameters) as EasemobChat.AudioMsgBody
    return this._send(body)
  }

  async sendVideo(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    const body = WebIM.message.create({
      type: 'video',
      chatType: conversationType,
      to: conversationId,
      file: toFileObj(data),
      filename: typeof data === 'string' ? '' : data.name,
      length: Math.round(duration),
      file_length: typeof data === 'string' ? 0 : data.size,
      ext,
      msgConfig: toMsgConfig(needReadReceipt),
    } as EasemobChat.CreateVideoMsgParameters) as EasemobChat.VideoMsgBody
    return this._send(body)
  }

  async sendLocation(
    conversationId: string,
    conversationType: ConversationTypeValue,
    latitude: number,
    longitude: number,
    address?: string,
    ext?: Record<string, unknown>,
  ) {
    const body = WebIM.message.create({
      type: 'loc',
      chatType: conversationType,
      to: conversationId,
      lat: latitude,
      lng: longitude,
      addr: address || '',
      buildingName: '',
      ext,
    } as EasemobChat.CreateLocationMsgParameters) as EasemobChat.LocationMsgBody
    return this._send(body)
  }

  async sendCustom(
    conversationId: string,
    conversationType: ConversationTypeValue,
    event: string,
    params?: Record<string, string>,
    ext?: Record<string, unknown>,
  ) {
    const body = WebIM.message.create({
      type: 'custom',
      chatType: conversationType,
      to: conversationId,
      customEvent: event,
      customExts: params || {},
      ext,
    } as EasemobChat.CreateCustomMsgParameters) as EasemobChat.CustomMsgBody
    return this._send(body)
  }

  async sendCmd(
    conversationId: string,
    conversationType: ConversationTypeValue,
    action: string,
    ext?: Record<string, unknown>,
  ) {
    const body = WebIM.message.create({
      type: 'cmd',
      chatType: conversationType,
      to: conversationId,
      action,
      ext,
      // CMD 消息（如 typing）只投递给在线用户，不存离线队列
      deliverOnlineOnly: true,
    } as EasemobChat.CreateCmdMsgParameters) as EasemobChat.CmdMsgBody
    return this._send(body)
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
    // 中立 SdkMessage → 4.x 创建参数形状（cmd/notice 等不可合并类型在此过滤）
    const webim4List = messageList
      .map(msg => toWebim4MessageBody(msg))
      .filter((m): m is EasemobChat.CombineMsgList[number] => m !== null)
    const body = WebIM.message.create({
      type: 'combine',
      chatType: conversationType,
      to: conversationId,
      title,
      summary,
      compatibleText,
      messageList: webim4List,
      ext,
    } as EasemobChat.CreateCombineMsgParameters) as EasemobChat.CombineMsgBody
    return this._send(body)
  }

  /**
   * 通用发送流程（4.x）：addSendingMessage → connection.send → replaceWithSent / markFailed。
   * 4.x 的上传进度回调挂在消息体上（onFileUploadProgress 是创建参数），
   * 发送前补挂到 body 上，经节流后写入 store。
   */
  private async _send(body: MessagesType): Promise<SdkMessage> {
    const localId = body.id

    // CMD 透传命令不进消息 store 上屏渲染，直接投递给 SDK
    if (body.type === 'cmd') {
      await this.connection.send(body)
      return toUiMessage(body, this.currentUserId) as SdkMessage
    }

    const sendingMsg: UiMessage = {
      ...toUiMessage(body, this.currentUserId),
      msgLocalId: localId,
      status: 'sending',
      isSelf: true,
    }
    this.store.addSendingMessage(localId, sendingMsg as unknown as SdkMessage)

    let lastProgressFlush = 0
    // 附件消息补挂上传进度回调（4.x 无 send 级 options，回调在 body 上）
    if ('onFileUploadProgress' in body) {
      body.onFileUploadProgress = (event: ProgressEvent) => {
        const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0
        const now = Date.now()
        if (percent < 100 && now - lastProgressFlush < PROGRESS_FLUSH_INTERVAL)
          return
        lastProgressFlush = now
        this.store.updateUploadProgress(localId, percent)
      }
    }

    try {
      const result = await this.connection.send(body)
      const sent = toUiMessage((result.message || body) as MessagesType, this.currentUserId)
      // SendMsgResult 携带双 ID：localMsgId/serverMsgId（4.x body.id 只是本地 ID）
      sent.msgLocalId = result.localMsgId || localId
      sent.msgServerId = result.serverMsgId || sent.msgServerId
      this.store.replaceWithSent(localId, sent)
      // 旁路持久化：发送成功落库（发送失败 markFailed 分支不入库，对齐 websdk5）
      firePersistenceHook(
        messageLogger,
        'saveMessage',
        this.options.messagePersistence?.saveMessage,
        toMessageRecord(sent as SdkMessage),
      )
      return sent as SdkMessage
    }
    catch (error) {
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
    // 数据入口接管（Phase 3.1）：注入 loadMessages 时走注入实现，不触 SDK；
    // store 写入等副作用与 SDK 默认路径完全对齐（对齐 websdk5 委托语义）。
    const loadMessages = this.options.messageRepository?.loadMessages
    if (loadMessages) {
      const page = await loadMessages(conversationId, conversationType, cursor, pageSize)
      // CMD 为透传命令不上屏，注入路径同样过滤
      const injectedMsgs = page.list
        .filter(msg => msg.type !== MESSAGE_TYPE.CMD)
        .map(msg => hydrateUiMessage(msg, this.currentUserId))
      this.store.prependMessages(conversationId, injectedMsgs)
      return {
        list: injectedMsgs,
        cursor: page.cursor,
        hasMore: page.hasMore,
      }
    }

    // cursor 缺省必须给 -1（从最新漫游消息拉起）：4.x SDK 仅在 cursor === undefined 时
    // 应用默认值 -1，传空串会被原样发给服务端（start: ''），漫游接口返回异常消息窗口，
    // 可能带回 SDK pb schema 无法解码的旧消息（invalid wire type at offset N）。
    const page = await this.connection.getHistoryMessages({
      targetId: conversationId,
      chatType: conversationType,
      pageSize,
      cursor: cursor || -1,
      searchDirection: 'up',
    })

    // 调试：历史消息摘要（与 websdk5 对齐：逐条压缩为 id|type|from->to|time）
    // page.messages 声明为 MessageBody[]（含 ReadMsgBody），与下方 list 同样收窄为 ExcludeAckMessageBody
    const historyMsgs = (page.messages || []) as MessagesType[]
    historyLogger.info('fetchHistory response', {
      conversationId,
      conversationType,
      cursor,
      pageSize,
      count: historyMsgs.length,
      isLast: page.isLast,
      items: historyMsgs.map(m => `${m.id}|${m.type}|${m.from}->${m.to}|${m.time}`),
    })

    // CMD 为透传命令不上屏；历史入口主动过滤（与 websdk5 对齐）
    const list = (page.messages || []) as MessagesType[]
    const uiMsgs = list
      .filter(msg => msg.type !== 'cmd')
      .map(msg => toUiMessage(msg, this.currentUserId))
    this.store.prependMessages(conversationId, uiMsgs)
    // 旁路持久化：漫游历史回流批量落库（仅 SDK 路径；注入 repository 路径数据来自 DB，不写回）
    firePersistenceHook(
      historyLogger,
      'saveMessages',
      this.options.messagePersistence?.saveMessages,
      uiMsgs.map(msg => toMessageRecord(msg as SdkMessage)),
    )

    return {
      list: uiMsgs,
      cursor: page.cursor ? String(page.cursor) : undefined,
      hasMore: page.isLast === false,
    }
  }

  // ===== 消息操作 =====

  async recall(conversationId: string, conversationType: ConversationTypeValue, messageId: string) {
    await this.connection.recallMessage({
      mid: messageId,
      to: conversationId,
      chatType: conversationType,
    })
    // 旁路持久化：本端主动撤回成功后立即落墓碑
    // （4.x onRecallMessage 仅 msync 回推通道派发，回推路径在 chat-events 另有落库，upsert 幂等）
    firePersistenceHook(
      messageLogger,
      'markMessageRecalled',
      this.options.messagePersistence?.markMessageRecalled,
      messageId,
      this.currentUserId,
    )
  }

  /**
   * 删除消息：4.x 无单条删除服务端漫游历史的公开 API，降级为本地删除语义——
   * 仅落删除墓碑（注入持久化时），UI 侧本地移除；刷新后服务端漫游仍会拉回，
   * 与旧版行为一致。
   */
  async removeMessages(
    _conversationId: string,
    _conversationType: ConversationTypeValue,
    messageIds: string[],
  ) {
    if (messageIds.length === 0)
      return
    firePersistenceHook(
      messageLogger,
      'deleteMessages',
      this.options.messagePersistence?.deleteMessages,
      [...messageIds],
    )
  }

  /** 发送单条消息已读回执（4.x：发 type:'read' 消息，群聊即群已读回执） */
  async markRead(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
  ) {
    await this.markMessagesRead(conversationId, conversationType, [messageId])
  }

  /**
   * 批量发送消息已读回执（4.x 回执即消息：逐条发 type:'read' 消息）。
   * 4.x 无 5.x 的批量 sendMessageReadReceipts API，逐条发送并记录去重。
   */
  async markMessagesRead(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageIds: string[],
  ) {
    if (messageIds.length === 0)
      return
    messageLogger.info('[MessageDomain.markMessagesRead] 批量发送已读回执', { conversationId, conversationType, count: messageIds.length, messageIds: messageIds.slice(0, 5) })
    for (const id of messageIds) {
      const body = WebIM.message.create({
        type: 'read',
        chatType: conversationType,
        id,
        to: conversationId,
      } as EasemobChat.CreateReadMsgParameters) as EasemobChat.ReadMsgBody
      await this.connection.send(body)
    }
    markReadReceiptSent(messageIds)
  }

  /**
   * 补发当前会话中尚未发送过已读回执的接收消息。
   * 语义与 websdk5 对齐：接收方登录收到离线消息时当前会话可能未打开，
   * 进入会话后统一补发；已发送过的经 sentReadReceiptIds 去重；
   * 失败仅 warn 不阻塞（先标记后发送，失败回滚以便下次重试）。
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
      messageLogger.warn('[MessageDomain.sendPendingReadReceipts] failed:', conversationId, error)
    }
  }

  /**
   * 修改文本消息。
   * 4.x `modifyMessage({ messageId, modifiedMessage })`（注意第二参名是 modifiedMessage）：
   * 文本消息可改 msg/ext；这里重建 txt 消息体后提交。
   */
  async modifyText(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
    text: string,
  ) {
    const modifiedMessage = WebIM.message.create({
      type: 'txt',
      chatType: conversationType,
      to: conversationId,
      msg: text,
    } as EasemobChat.CreateTextMsgParameters) as EasemobChat.TextMsgBody
    await this.connection.modifyMessage({
      messageId,
      modifiedMessage,
    })
  }

  /** 置顶消息 */
  async pinMessage(conversationId: string, conversationType: ConversationTypeValue, messageId: string) {
    await this.connection.pinMessage({ conversationId, conversationType, messageId })
  }

  /** 取消置顶 */
  async unpinMessage(conversationId: string, conversationType: ConversationTypeValue, messageId: string) {
    await this.connection.unpinMessage({ conversationId, conversationType, messageId })
  }

  /**
   * 获取会话置顶消息列表。
   * 4.x `getServerPinnedMessages` 分页（pageSize 1-50，cursor 空串起拉），
   * 自动翻页聚合全量后写入 store（5.x getPinnedMessageList 不分页、上限 20，
   * 中立契约取「全量列表」语义）。
   */
  async getPinnedMessages(conversationId: string, conversationType: ConversationTypeValue) {
    const all: EasemobChat.PinnedMessageInfo[] = []
    let cursor = ''
    do {
      const result = await this.connection.getServerPinnedMessages({
        conversationId,
        conversationType,
        pageSize: 50,
        cursor,
      })
      const data = result.data
      if (!data)
        break
      all.push(...(data.list || []))
      cursor = data.cursor || ''
    } while (cursor)

    const uiMsgs = all.map((item) => {
      const uiMsg = toUiMessage(item.message as MessagesType, this.currentUserId)
      // 补齐置顶展示字段（与 5.x 对齐：pinTime/operatorId 挂在 PinnedMessageInfo 上）
      uiMsg.pinned = true
      uiMsg.pinTime = item.pinTime
      uiMsg.pinOperatorId = item.operatorId
      return uiMsg
    })
    this.store.setPinnedMessages(conversationId, uiMsgs)
    return uiMsgs
  }

  /**
   * 翻译文本消息。
   * 4.x `translateMessage({ text, languages })` 按文本翻译（非按消息），
   * 返回 `AsyncResult<TranslationResult>`；非文本消息返回 undefined（降级）。
   */
  async translateMessage(message: SdkMessage, targetLanguages: string[]) {
    if (!isTextBody(message.body)) {
      messageLogger.warn('[MessageDomain.translateMessage] 非文本消息，跳过翻译:', message.type)
      return undefined
    }
    try {
      const result = await this.connection.translateMessage({
        text: message.body.content,
        languages: targetLanguages,
      })
      return { translations: result.data?.translations }
    }
    catch (error) {
      messageLogger.error('[MessageDomain.translateMessage] raw SDK error:', error)
      throw error
    }
  }

  /**
   * 语音消息转文字（4.x `voiceMessageToText(messageBody: AudioMsgBody, audioParams?)`）。
   * 需要从中立消息重建 4.x AudioMsgBody（SDK 从 url 解析 fileId）；
   * 非语音消息抛错（与 websdk5 对齐）。
   */
  async transcribeVoiceMessage(message: SdkMessage, voiceParams?: Record<string, unknown>) {
    if (!isVoiceBody(message.body)) {
      messageLogger.warn('[MessageDomain.transcribeVoiceMessage] not a voice message:', message)
      throw new Error('not a voice message')
    }
    const audioBody = {
      id: message.msgServerId,
      type: 'audio',
      chatType: message.conversationType,
      to: message.to,
      from: message.from,
      time: message.timestamp,
      url: message.body.url,
      filename: message.body.filename || '',
      filetype: message.body.filetype,
      length: message.body.duration,
      file_length: message.body.fileLength,
      secret: message.body.secret,
    } as EasemobChat.AudioMsgBody
    const result = await this.connection.voiceMessageToText(
      audioBody,
      voiceParams as EasemobChat.AudioParams | undefined,
    )
    return { text: result.data?.text }
  }

  /**
   * 下载并解析合并消息。
   * 4.x `downloadAndParseCombineMessage({ url, secret })` 按附件地址下载（非按消息），
   * 返回 4.x 消息体数组，逐条映射为中立消息。
   */
  async downloadAndParseCombineMessage(message: SdkMessage): Promise<readonly SdkMessage[]> {
    if (!isCombineBody(message.body) || !message.body.url || !message.body.secret) {
      messageLogger.warn('[MessageDomain.downloadAndParseCombineMessage] 缺少合并消息下载地址:', message)
      throw new Error('not a downloadable combine message')
    }
    const list = await this.connection.downloadAndParseCombineMessage({
      url: message.body.url,
      secret: message.body.secret,
    })
    return (list as MessagesType[]).map(msg => toUiMessage(msg, this.currentUserId) as SdkMessage)
  }

  /**
   * 获取群消息已读详情。
   * ⚠️ 4.24.2 `getGroupMsgReadUser` 不支持翻页（源码内 limit 固定 500、key 固定 undefined，
   * 分页 TODO 未实现），与主计划「自动翻页聚合」有出入：这里单次拉取（上限 500），
   * `pageSize` 参数忽略并注释说明。
   * ⚠️ d.ts 标注 `userlist: string[]`，但部分服务端版本实际 wire 为对象数组
   * `{username, meta_id, timestamp, ack_content}`（d.ts 与 wire 不一致，2026-08-30 实测）——
   * 两种形状都兼容，无法识别的项告警丢弃；多端登录同账号多设备重复上报，按 userId 去重。
   */
  async fetchGroupReadDetail(
    groupId: string,
    messageId: string,
    _pageSize = 100,
  ): Promise<{ groupId: string, messageId: string, users: Array<{ userId: string, timestamp?: number }>, count: number }> {
    const result = await this.connection.getGroupMsgReadUser({ groupId, msgId: messageId })
    const data = result.data
    const seen = new Set<string>()
    const users: Array<{ userId: string, timestamp?: number }> = []
    for (const item of data?.userlist || []) {
      // 字符串形状（d.ts 标注）：item 即 userId，timestamp 取响应顶层查询时间
      if (typeof item === 'string') {
        if (!seen.has(item)) {
          seen.add(item)
          users.push({ userId: item, timestamp: data?.timestamp })
        }
        continue
      }
      // 对象形状（实测 wire）：username 为用户 ID，timestamp 为该设备已读时间
      const raw = item as unknown as { username?: unknown, timestamp?: unknown }
      if (raw && typeof raw.username === 'string' && raw.username) {
        if (!seen.has(raw.username)) {
          seen.add(raw.username)
          users.push({
            userId: raw.username,
            timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : data?.timestamp,
          })
        }
        continue
      }
      messageLogger.warn('getGroupMsgReadUser userlist 出现无法识别的项，已丢弃:', item)
    }
    return {
      groupId,
      messageId,
      users,
      count: data?.total ?? users.length,
    }
  }
}
