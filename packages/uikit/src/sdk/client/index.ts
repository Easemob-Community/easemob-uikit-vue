import {
  ChatClient as SdkChatClient,
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
} from 'easemob-websdk'
import type { Message, ChatEventHandlerMap, ConnectionEventHandlerMap, ContactEventHandlerMap, EventHandlerMap, GroupEventHandlerMap, PresenceEventHandlerMap } from 'easemob-websdk'
import type { ClientConfig, ChatClient } from '../types'
import type { MessageStatusValue, ConversationTypeValue } from '../../constants'
import { MESSAGE_STATUS } from '../../constants'
import { MessageService } from './message'
import { ConversationService } from './conversation'
import { ContactService } from './contact'
import { GroupService } from './group'
import { PresenceService } from './presence'

// 重新导出各功能域 Service（供测试或外部扩展使用）
export { MessageService } from './message'
export { ConversationService } from './conversation'
export { ContactService } from './contact'
export { GroupService } from './group'
export { PresenceService } from './presence'

let clientInstance: UIKitClient | null = null

export type SdkMessage = Message

export type MessageStatusCallback = (
  localMsgId: string,
  status: MessageStatusValue
) => void

/**
 * Service 类依赖的核心接口，由 UIKitClient 实现
 */
export interface ClientCore {
  client: ChatClient
  chatManager: ChatManager
  contactManager: ContactManager
  groupManager: GroupManager
  presenceManager: PresenceManager
  _sendWithStatus(msg: SdkMessage): Promise<SdkMessage>
}

/**
 * UIKIT 客户端封装类
 *
 * 对 easemob-websdk 的 ChatClient 进行二次封装：
 * - 提供 login / logout / sendText 等便捷方法
 * - 统一事件处理器管理
 * - 支持消息发送状态回调（sending / sent / failed）
 * - 通过 manager getters 暴露原始 SDK 实例，保留全部原生能力
 * - 按功能域组合 MessageService / ConversationService / ContactService / GroupService / PresenceService
 */
export class UIKitClient implements ClientCore {
  private _client: ChatClient
  private _connHandlers = new Map<string, ConnectionEventHandlerMap>()
  private _chatHandlers = new Map<string, ChatEventHandlerMap>()
  private _contactHandlers = new Map<string, ContactEventHandlerMap>()
  private _groupHandlers = new Map<string, GroupEventHandlerMap>()
  private _onMessageStatus?: MessageStatusCallback

  /** 消息服务 */
  readonly message: MessageService
  /** 会话服务 */
  readonly conversation: ConversationService
  /** 好友/黑名单服务 */
  readonly contact: ContactService
  /** 群组服务 */
  readonly group: GroupService
  /** 在线状态服务 */
  readonly presence: PresenceService

  constructor(config: ClientConfig) {
    const { debug, ...sdkConfig } = config
    this._client = SdkChatClient.init({
      ...sdkConfig,
      managers: [ChatManager, ContactManager, GroupManager, PresenceManager],
    }) as ChatClient
    if (debug) {
      /**
       * @see SDK_DEFICIENCY: easemob-websdk ChatClient 未在公开 API 中暴露 logger 属性，
       * 无法通过类型安全的方式设置日志级别。
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logger = (this._client as any).logger
      if (logger && typeof logger.setLevel === 'function') {
        logger.setLevel('debug')
      }
    }

    // 初始化各功能域 Service
    this.message = new MessageService(this)
    this.conversation = new ConversationService(this)
    this.contact = new ContactService(this)
    this.group = new GroupService(this)
    this.presence = new PresenceService(this)
  }

  /** 原始 SDK ChatClient 实例 */
  get client() {
    return this._client
  }

  /** ChatManager 实例 */
  get chatManager() {
    return this._client.chatManager
  }

  /** ContactManager 实例 */
  get contactManager() {
    return this._client.contactManager
  }

  /** GroupManager 实例 */
  get groupManager() {
    return this._client.groupManager
  }

  /** PresenceManager 实例 */
  get presenceManager() {
    return this._client.presenceManager
  }

  /** 设置消息发送状态回调 */
  setMessageStatusCallback(cb: MessageStatusCallback) {
    this._onMessageStatus = cb
  }

  /**
   * 通用发送方法：发送 → 状态回调
   */
  async _sendWithStatus(msg: SdkMessage): Promise<SdkMessage> {
    const localMsgId = msg.msgLocalId || ''
    if (localMsgId) this._onMessageStatus?.(localMsgId, MESSAGE_STATUS.SENDING)
    try {
      const result = await this._client.chatManager.sendMessage(msg)
      this._onMessageStatus?.(result.msgLocalId || localMsgId, MESSAGE_STATUS.SENT)
      return result
    } catch (error) {
      if (localMsgId) this._onMessageStatus?.(localMsgId, MESSAGE_STATUS.FAILED)
      throw error
    }
  }

  // ========== 连接相关 ==========

  /** 登录（支持 accessToken 或密码） */
  async login(
    params: { user: string; accessToken?: string; password?: string },
  ) {
    return this._client.login({
      userId: params.user,
      token: params.accessToken ?? params.password ?? '',
    })
  }

  /** 登出 */
  async logout() {
    return this._client.logout()
  }

  /** 是否已连接 */
  get isConnected() {
    return this._client.getConnectionState() === 'connected'
  }

  // ========== 会话便捷方法 ==========

  /** 标记会话已读（清空未读数） */
  async markConversationRead(options: {
    conversationId: string
    conversationType: ConversationTypeValue
  }) {
    return this.conversation.markConversationRead(options)
  }

  // ========== 事件处理器管理 ==========

  /** 添加连接事件处理器 */
  addEventHandler(id: string, handler: ConnectionEventHandlerMap) {
    this._connHandlers.set(id, handler)
    this._client.addEventHandler(id, handler as EventHandlerMap)
  }

  /** 移除连接事件处理器 */
  removeEventHandler(id: string) {
    this._connHandlers.delete(id)
    this._client.removeEventHandler(id)
  }

  /** 添加 ChatManager 事件处理器 */
  addChatEventHandler(id: string, handler: ChatEventHandlerMap) {
    this._chatHandlers.set(id, handler)
    this._client.chatManager.addEventHandler(id, handler)
  }

  /** 移除 ChatManager 事件处理器 */
  removeChatEventHandler(id: string) {
    this._chatHandlers.delete(id)
    this._client.chatManager.removeEventHandler(id)
  }

  /** 添加 ContactManager 事件处理器 */
  addContactEventHandler(id: string, handler: ContactEventHandlerMap) {
    this._contactHandlers.set(id, handler)
    this._client.contactManager.addEventHandler(id, handler)
  }

  /** 移除 ContactManager 事件处理器 */
  removeContactEventHandler(id: string) {
    this._contactHandlers.delete(id)
    this._client.contactManager.removeEventHandler(id)
  }

  /** 添加 GroupManager 事件处理器 */
  addGroupEventHandler(id: string, handler: GroupEventHandlerMap) {
    this._groupHandlers.set(id, handler)
    this._client.groupManager.addEventHandler(id, handler)
  }

  /** 移除 GroupManager 事件处理器 */
  removeGroupEventHandler(id: string) {
    this._groupHandlers.delete(id)
    this._client.groupManager.removeEventHandler(id)
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
