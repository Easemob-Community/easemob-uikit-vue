import WebIM, { type EasemobChat } from 'easemob-websdk'
import type { ClientConfig } from './types'
import { MESSAGE_STATUS, ACK_TYPE } from '../constants'
import type { MessageStatusValue, ConversationTypeValue } from '../constants'

let clientInstance: UIKitClient | null = null

export type MessageStatusCallback = (
  localMsgId: string,
  status: MessageStatusValue
) => void

/**
 * UIKIT 客户端封装类
 *
 * 对 easemob-websdk 的 Connection 进行二次封装：
 * - 提供 login / logout / sendText 等便捷方法
 * - 统一事件处理器管理
 * - 支持消息发送状态回调（sending / sent / failed）
 * - 通过 `connection` getter 暴露原始 SDK 实例，保留全部原生能力
 */
export class UIKitClient {
  private _connection: EasemobChat.Connection
  private _handlers = new Map<string, EasemobChat.EventHandlerType>()
  private _onMessageStatus?: MessageStatusCallback

  constructor(config: ClientConfig) {
    const { debug, ...sdkConfig } = config
    this._connection = new WebIM.connection(sdkConfig)
    if (debug) {
      this._connection.isDebug = true
    }
  }

  /** 原始 SDK Connection 实例，可直接调用所有原生 API */
  get connection() {
    return this._connection
  }

  /** 当前连接是否已打开 */
  get isConnected() {
    return this._connection.isOpened()
  }

  /** 设置消息发送状态回调 */
  setMessageStatusCallback(cb: MessageStatusCallback) {
    this._onMessageStatus = cb
  }

  /** 登录（支持 accessToken 或密码） */
  async login(params: { user: string; accessToken?: string; password?: string }) {
    return this._connection.open({
      user: params.user,
      ...(params.accessToken ? { accessToken: params.accessToken } : {}),
      ...(params.password ? { pwd: params.password } : {}),
    } as any)
  }

  /** 登出 */
  logout() {
    this._connection.close()
  }

  /**
   * 通用发送方法：创建消息 → 发送 → 状态回调
   * 所有 sendXxx 方法统一委托此方法，消除重复代码
   *
   * @returns SendMsgResult，包含 localMsgId 和 serverMsgId
   */
  private async _sendWithStatus(options: EasemobChat.CreateMsgType): Promise<EasemobChat.SendMsgResult> {
    const msg = WebIM.message.create(options)
    const localMsgId = msg.id
    if (localMsgId) this._onMessageStatus?.(localMsgId, MESSAGE_STATUS.SENDING)
    try {
      const result = await this._connection.send(msg)
      this._onMessageStatus?.(result.localMsgId, MESSAGE_STATUS.SENT)
      return result
    } catch (error) {
      if (localMsgId) this._onMessageStatus?.(localMsgId, MESSAGE_STATUS.FAILED)
      throw error
    }
  }

  /**
   * 仅创建消息对象，不发送。用于需要先拿到 SDK 生成的 msg.id 再插入本地 store 的场景。
   *
   * @returns 创建好的 MessageBody（含 id 字段）
   */
  createMessage(options: EasemobChat.CreateMsgType): EasemobChat.MessageBody {
    return WebIM.message.create(options)
  }

  /**
   * 发送已创建的消息对象（配合 createMessage 使用）
   *
   * @returns SendMsgResult
   */
  async sendCreatedMessage(msg: EasemobChat.MessageBody): Promise<EasemobChat.SendMsgResult> {
    const localMsgId = msg.id
    try {
      const result = await this._connection.send(msg)
      this._onMessageStatus?.(result.localMsgId, MESSAGE_STATUS.SENT)
      return result
    } catch (error) {
      if (localMsgId) this._onMessageStatus?.(localMsgId, MESSAGE_STATUS.FAILED)
      throw error
    }
  }

  /** 发送文本消息 */
  async sendText(options: EasemobChat.CreateTextMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 发送图片消息 */
  async sendImage(options: EasemobChat.CreateImgMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 发送文件消息 */
  async sendFile(options: EasemobChat.CreateFileMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 发送自定义消息 */
  async sendCustom(options: EasemobChat.CreateCustomMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 发送语音消息 */
  async sendAudio(options: EasemobChat.CreateAudioMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 发送视频消息 */
  async sendVideo(options: EasemobChat.CreateVideoMsgParameters): Promise<EasemobChat.SendMsgResult> {
    return this._sendWithStatus(options)
  }

  /** 从服务端分页获取会话列表 */
  async getServerConversations(options?: {
    pageSize?: number
    cursor?: string
    includeEmptyConversations?: boolean
  }): Promise<EasemobChat.AsyncResult<EasemobChat.ServerConversations>> {
    return this._connection.getServerConversations({
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
      includeEmptyConversations: options?.includeEmptyConversations ?? false,
    } as any) // SDK 未在 Connection 接口暴露此方法签名，运行时存在
  }

  /** 置顶/取消置顶会话 */
  async pinConversation(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    isPinned: boolean
  }): Promise<void> {
    return (this._connection as any).pinConversation(options) // SDK 未在 Connection 接口暴露此方法签名，运行时存在
  }

  /** 发送会话已读回执（单聊/群聊均支持，用于清空整个会话的未读数） */
  async sendChannelAck(options: {
    chatType: ConversationTypeValue
    to: string
  }): Promise<EasemobChat.SendMsgResult | void> {
    const msg = WebIM.message.create({
      type: ACK_TYPE.CHANNEL as EasemobChat.MessageType,
      chatType: options.chatType as EasemobChat.ChatType,
      to: options.to,
    } as EasemobChat.CreateChannelMsgParameters)
    return this._connection.send(msg)
  }

  /** 发送消息已读回执（单聊） */
  async sendReadAck(options: {
    chatType: ConversationTypeValue
    to: string
    msgId: string
  }): Promise<EasemobChat.SendMsgResult> {
    const msg = WebIM.message.create({
      type: ACK_TYPE.READ as EasemobChat.MessageType,
      chatType: options.chatType as EasemobChat.ChatType,
      to: options.to,
      id: options.msgId,
    } as EasemobChat.CreateReadMsgParameters)
    return this._connection.send(msg)
  }

  /** 发送群消息已读回执 */
  async sendGroupReadAck(options: {
    to: string
    msgId: string
    ackContent?: string
  }): Promise<EasemobChat.SendMsgResult> {
    const msg = WebIM.message.create({
      type: ACK_TYPE.GROUP_READ as EasemobChat.MessageType,
      chatType: 'groupChat' as EasemobChat.ChatType,
      to: options.to,
      id: options.msgId,
      ackContent: options.ackContent || JSON.stringify({}),
    } as EasemobChat.CreateReadMsgParameters)
    return this._connection.send(msg)
  }

  /** 撤回消息 */
  async recallMessage(options: {
    mid: string
    to: string
    chatType: ConversationTypeValue
    ext?: string
  }): Promise<EasemobChat.SendMsgResult> {
    return this._connection.recallMessage({
      mid: options.mid,
      to: options.to,
      chatType: options.chatType as 'singleChat' | 'groupChat' | 'chatRoom',
      ext: options.ext,
    })
  }

  /** 获取群消息已读用户列表 */
  async getGroupMsgReadUser(options: {
    msgId: string
    groupId: string
  }): Promise<EasemobChat.AsyncResult<EasemobChat.GetGroupMsgReadUserResult>> {
    return this._connection.getGroupMsgReadUser(options)
  }

  /** 删除会话 */
  async deleteConversation(options: {
    channel: string
    chatType: ConversationTypeValue
    deleteRoam?: boolean
  }): Promise<void> {
    return (this._connection as any).deleteConversation(options) // SDK 未在 Connection 接口暴露此方法签名，运行时存在
  }

  /** 获取历史消息（分页） */
  async getHistoryMessages(options: {
    targetId: string
    chatType: ConversationTypeValue
    pageSize?: number
    cursor?: string
  }): Promise<EasemobChat.HistoryMessages> {
    return this._connection.getHistoryMessages({
      targetId: options.targetId,
      chatType: options.chatType as EasemobChat.ChatType,
      pageSize: options.pageSize ?? 20,
      cursor: options.cursor ?? '',
    })
  }

  /** 添加事件处理器 */
  addEventHandler(id: string, handler: EasemobChat.EventHandlerType) {
    this._handlers.set(id, handler)
    this._connection.addEventHandler(id, handler)
  }

  /** 移除事件处理器 */
  removeEventHandler(id: string) {
    this._handlers.delete(id)
    this._connection.removeEventHandler(id)
  }
}

/** 创建 UIKitClient 实例 */
export function createClient(config: ClientConfig): UIKitClient {
  const client = new UIKitClient(config)
  clientInstance = client
  return client
}

/** 获取全局 UIKitClient 实例 */
export function getClient(): UIKitClient | null {
  return clientInstance
}


