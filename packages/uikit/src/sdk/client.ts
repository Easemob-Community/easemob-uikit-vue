import WebIM, { type EasemobChat } from 'easemob-websdk'
import type { ClientConfig } from './types'
import { MESSAGE_STATUS, ACK_TYPE, CONVERSATION_TYPE } from '../constants'
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

  /** 发送文本消息 */
  async sendText(options: EasemobChat.CreateTextMsgParameters) {
    const msg = WebIM.message.create(options)
    const localMsgId = (msg as any).id as string
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

  /** 发送图片消息 */
  async sendImage(options: EasemobChat.CreateImgMsgParameters) {
    const msg = WebIM.message.create(options)
    const localMsgId = (msg as any).id as string
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

  /** 发送文件消息 */
  async sendFile(options: EasemobChat.CreateFileMsgParameters) {
    const msg = WebIM.message.create(options)
    const localMsgId = (msg as any).id as string
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

  /** 发送自定义消息 */
  async sendCustom(options: EasemobChat.CreateCustomMsgParameters) {
    const msg = WebIM.message.create(options)
    const localMsgId = (msg as any).id as string
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

  /** 从服务端分页获取会话列表 */
  async getServerConversations(options?: {
    pageSize?: number
    cursor?: string
    includeEmptyConversations?: boolean
  }) {
    const conn = this._connection as any
    return conn.getServerConversations({
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
      includeEmptyConversations: options?.includeEmptyConversations ?? false,
    })
  }

  /** 置顶/取消置顶会话 */
  async pinConversation(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    isPinned: boolean
  }) {
    const conn = this._connection as any
    return conn.pinConversation(options)
  }

  /** 发送会话已读回执 */
  async sendChannelAck(options: {
    chatType: ConversationTypeValue
    to: string
  }) {
    const msg = WebIM.message.create({
      type: ACK_TYPE.CHANNEL,
      chatType: options.chatType,
      to: options.to,
    })
    return this._connection.send(msg)
  }

  /** 删除会话 */
  async deleteConversation(options: {
    channel: string
    chatType: ConversationTypeValue
    deleteRoam?: boolean
  }) {
    const conn = this._connection as any
    return conn.deleteConversation(options)
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


