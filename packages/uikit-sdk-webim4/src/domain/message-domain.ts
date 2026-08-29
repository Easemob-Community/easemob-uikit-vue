import WebIM from 'easemob-websdk'
import type { EasemobChat } from 'easemob-websdk'
import type {
  ConversationTypeValue,
  MessageStatus,
  SdkMessage,
  UiMessage,
} from '@easemob/uikit-sdk-contract'
import {
  CONVERSATION_TYPE,
  MESSAGE_TYPE,
  createLogger,
} from '@easemob/uikit-sdk-contract'
import { toUiMessage } from '../adapter/message-adapter'
import type { Webim4Client } from '../client'

const messageLogger = createLogger('UIKit:Webim4MessageDomain')

type MessagesType = EasemobChat.ExcludeAckMessageBody

/**
 * MessageStore 需要暴露给 Domain 的最小接口（与 websdk5 adapter 同构）。
 */
export interface MessageStoreLike {
  getMessages: (conversationId: string) => UiMessage[]
  addMessage: (msg: UiMessage) => void
  addSendingMessage: (localId: string, sdkMsg: SdkMessage) => void
  replaceWithSent: (localId: string, msg: UiMessage) => void
  updateUploadProgress: (localId: string, percent: number) => void
  markFailed: (localId: string, reason: string) => void
  prependMessages: (conversationId: string, msgs: UiMessage[]) => void
  updateMessageById: (msgId: string, patch: Partial<UiMessage>) => void
  clearConversationMessages: (conversationId: string) => void
}

/**
 * 消息业务域（4.x）：Message.create + connection.send 发送，
 * connection.getHistoryMessages 拉历史，connection.recallMessage 撤回，
 * 发 read/channel 回执消息清未读（4.x 无专用清未读 API）。
 */
export class MessageDomain {
  constructor(
    private client: Webim4Client,
    private store: MessageStoreLike,
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
    }) as EasemobChat.TextMsgBody
    return this._send(body)
  }

  async sendImage(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    ext?: Record<string, unknown>,
    needReadReceipt?: boolean,
  ) {
    const body = WebIM.message.create({
      type: 'img',
      chatType: conversationType,
      to: conversationId,
      ...(typeof data === 'string' ? { url: data } : { file: data }),
      file_length: typeof data === 'string' ? 0 : data.size,
      ext,
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
      ...(typeof data === 'string' ? { url: data } : { file: data }),
      filename: typeof data === 'string' ? '' : data.name,
      ext,
    } as EasemobChat.CreateFileMsgParameters) as EasemobChat.FileMsgBody
    return this._send(body)
  }

  async sendVoice(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
  ) {
    const body = WebIM.message.create({
      type: 'audio',
      chatType: conversationType,
      to: conversationId,
      ...(typeof data === 'string' ? { url: data } : { file: data }),
      filename: typeof data === 'string' ? '' : data.name,
      length: Math.round(duration),
      ext,
    } as EasemobChat.CreateAudioMsgParameters) as EasemobChat.AudioMsgBody
    return this._send(body)
  }

  async sendVideo(
    conversationId: string,
    conversationType: ConversationTypeValue,
    data: File | string,
    duration: number,
    ext?: Record<string, unknown>,
  ) {
    const body = WebIM.message.create({
      type: 'video',
      chatType: conversationType,
      to: conversationId,
      ...(typeof data === 'string' ? { url: data } : { file: data }),
      filename: typeof data === 'string' ? '' : data.name,
      length: Math.round(duration),
      ext,
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
    } as EasemobChat.CreateCmdMsgParameters) as EasemobChat.CmdMsgBody
    // CMD 透传命令不进入消息 store，直接发送
    return this.connection.send(body)
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
    const body = WebIM.message.create({
      type: 'combine',
      chatType: conversationType,
      to: conversationId,
      title,
      summary,
      compatibleText,
      messageList,
      ext,
    } as EasemobChat.CreateCombineMsgParameters) as EasemobChat.CombineMsgBody
    return this._send(body)
  }

  /** 通用发送流程（4.x） */
  private async _send(body: MessagesType): Promise<SdkMessage> {
    const localId = body.id
    const isCmd = body.type === 'cmd'
    if (isCmd)
      return this.connection.send(body)

    const uiMsg = { ...toUiMessage(body, this.currentUserId), status: 'sending', isSelf: true }
    this.store.addSendingMessage(localId, uiMsg)

    try {
      const result = await this.connection.send(body)
      const sent = toUiMessage((result.message || body) as MessagesType, this.currentUserId)
      this.store.replaceWithSent(localId, sent)
      return sent as unknown as SdkMessage
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
    const page = await this.connection.getHistoryMessages({
      targetId: conversationId,
      chatType: conversationType,
      pageSize,
      cursor: cursor || '',
      searchDirection: 'up',
    })
    const list = (page.messages || []) as MessagesType[]
    const uiMsgs = list
      .filter(msg => msg.type !== 'cmd')
      .map(msg => toUiMessage(msg, this.currentUserId))
    this.store.prependMessages(conversationId, uiMsgs)
    return {
      items: uiMsgs,
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
  }

  /** 清未读（4.x 无专用 API，靠发 read/channel 回执消息隐式清） */
  async markConversationRead(conversationId: string, conversationType: ConversationTypeValue) {
    const messages = this.store.getMessages(conversationId)
    const lastMsgId = messages[messages.length - 1]?.msgServerId
    if (!lastMsgId)
      return
    if (conversationType === CONVERSATION_TYPE.SINGLECHAT) {
      const body = WebIM.message.create({
        type: 'read',
        id: lastMsgId,
        to: conversationId,
      }) as EasemobChat.ReadMsgBody
      await this.connection.send(body)
    }
    else {
      const body = WebIM.message.create({
        type: 'channel',
        mid: lastMsgId,
        chatType: 'groupChat',
        to: conversationId,
      }) as EasemobChat.ChannelMsgBody
      await this.connection.send(body)
    }
  }

  /** 批量发送消息已读回执（4.x 发 read 消息） */
  async markMessagesRead(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageIds: string[],
  ) {
    if (messageIds.length === 0)
      return
    for (const id of messageIds) {
      const body = WebIM.message.create({
        type: 'read',
        id,
        to: conversationId,
      }) as EasemobChat.ReadMsgBody
      await this.connection.send(body)
    }
  }

  /** 获取群消息已读用户列表 */
  async getGroupMessageReadUsers(groupId: string, messageId: string) {
    const result = await this.connection.getGroupMsgReadUser({ groupId, msgId: messageId })
    return result
  }

  /** 修改文本消息 */
  async modifyText(
    conversationId: string,
    conversationType: ConversationTypeValue,
    messageId: string,
    text: string,
  ) {
    // 4.x 修改消息走 modifyMessage（webim4 后续按需接入；此处先记录 TODO）
    messageLogger.warn('[MessageDomain.modifyText] 4.x modifyMessage 待接入')
  }

  /** 置顶消息 */
  async pinMessage(conversationId: string, conversationType: ConversationTypeValue, messageId: string) {
    await this.connection.pinMessage({ conversationId, conversationType, messageId })
  }

  /** 取消置顶 */
  async unpinMessage(conversationId: string, conversationType: ConversationTypeValue, messageId: string) {
    await this.connection.unpinMessage({ conversationId, conversationType, messageId })
  }

  /** 获取会话置顶消息列表 */
  async getPinnedMessages(conversationId: string, conversationType: ConversationTypeValue) {
    const result = await this.connection.getServerPinnedMessages({
      conversationId,
      conversationType,
    })
    const uiMsgs = (result.list || []).map(item => toUiMessage(item.message, this.currentUserId))
    return uiMsgs
  }

  /** 撤回后补发进入会话的未读消息回执（核心 IM 简化：直接清未读） */
  async sendPendingReadReceipts(conversationId: string, conversationType: ConversationTypeValue) {
    await this.markConversationRead(conversationId, conversationType)
  }

  // 类型占位，避免未使用告警
  static _types(): { m: typeof MESSAGE_TYPE, s: MessageStatus } {
    return { m: MESSAGE_TYPE, s: undefined as unknown as MessageStatus }
  }
}
