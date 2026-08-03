import type { Message as SdkMessage } from 'easemob-websdk'
import type { MessageStatus, UiMessage } from '../types'
import type { ManagerHost } from '../client'
import { toUiMessage } from '../adapter/message-adapter'
import { createLogger } from '../../utils/logger'
import { formatSdkError } from '../../utils/sdk-error'

const combineLogger = createLogger('Combine')

/** 上传进度回调写入 store 的最小间隔（ms），避免 XHR progress 事件高频触发整列表重渲染 */
const PROGRESS_FLUSH_INTERVAL = 150

/**
 * MessageStore 需要暴露给 Domain 的最小接口。
 * 具体实现由 store/message.ts 提供。
 */
export interface MessageStoreLike {
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
    action: string,
    ext?: Record<string, unknown>,
  ) {
    const sdkMsg = this.client.chatManager.createCmdMessage({
      conversationId,
      conversationType,
      action,
      ext,
    })
    return this._send(sdkMsg)
  }

  async sendCombine(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
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
    const isCombine = sdkMsg.type === 'combine'
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
    conversationType: 'singleChat' | 'groupChat',
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

    const uiMsgs = page.items.map(msg => toUiMessage(msg, this.currentUserId))
    this.store.prependMessages(conversationId, uiMsgs)

    return {
      items: uiMsgs,
      cursor: page.cursor,
      hasMore: page.hasMore,
    }
  }

  // ===== 消息操作 =====

  async recall(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
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
    conversationType: 'singleChat' | 'groupChat',
    messageIds: string[],
  ) {
    if (messageIds.length === 0)
      return
    await this.client.chatManager.sendMessageReadReceipts({
      conversationId,
      conversationType,
      messageIds,
    })
  }

  /** 置顶消息 */
  async pinMessage(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    messageId: string,
  ) {
    await this.client.chatManager.pinMessage({ conversationId, conversationType, messageId })
  }

  /** 取消置顶 */
  async unpinMessage(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    messageId: string,
  ) {
    await this.client.chatManager.unpinMessage({ conversationId, conversationType, messageId })
  }

  /** 获取会话内置顶消息列表（最多 20 条） */
  async getPinnedMessages(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
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
      console.error('[MessageDomain.translateMessage] raw SDK error:', formatSdkError(error))
      throw error
    }
  }

  /** 语音消息转文字 */
  async transcribeVoiceMessage(
    message: SdkMessage,
    voiceParams?: { format?: string, sampleRate?: number, bitsPerSample?: number, channels?: number },
  ) {
    // SDK 要求传入 VoiceMessageBody，且需要能从 url 解析出 fileId；
    // 兼容部分历史消息 body 缺少 type 的情况，按 message.type 补齐。
    const body = {
      ...(message.body as Record<string, unknown>),
      type: (message.body as Record<string, unknown>)?.type ?? message.type,
    } as any
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
    conversationType: 'singleChat' | 'groupChat',
    messageId: string,
  ) {
    await this.client.chatManager.sendMessageReadReceipts({
      conversationId,
      conversationType,
      messageIds: [messageId],
    })
  }

  /** 获取群消息已读详情 */
  async fetchGroupReadDetail(groupId: string, messageId: string) {
    return this.client.chatManager.getGroupMessageReadUsers({
      groupId,
      messageId,
    })
  }

  /** 修改文本消息 */
  async modifyText(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    messageId: string,
    text: string,
  ) {
    await this.client.chatManager.modifyMessage({
      conversationId,
      conversationType,
      messageId,
      message: {
        type: 'text',
        body: { content: text },
        ext: {},
      },
    })
  }
}
