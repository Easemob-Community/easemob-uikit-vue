import {
  ChatClient as SdkChatClient,
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
} from 'im-sdk-web'
import type {
  ChatEventHandlerMap,
  ConnectionEventHandlerMap,
  ContactEventHandlerMap,
  GroupEventHandlerMap,
  PresenceEventHandlerMap,
  UpdateMessageParams,
  MessageTranslationResult,
  PinnedMessageListResult,
  GroupListResult,
  Contact,
} from 'im-sdk-web'
import type { ClientConfig, JoinedGroupItem, ChatClient } from './types'
import { MESSAGE_STATUS } from '../constants'
import type { MessageStatusValue, ConversationTypeValue } from '../constants'

let clientInstance: UIKitClient | null = null

/**
 * 从 SDK ChatManager 返回值推断 Message 类型。
 * SDK 未将 Message 作为命名类型导出，此处通过 ReturnType 提取。
 * @see SDK_DEFICIENCY: im-sdk-web 未在公共入口导出 Message 命名类型
 */
export type SdkMessage = Awaited<ReturnType<ChatManager['sendMessage']>>

export type MessageStatusCallback = (
  localMsgId: string,
  status: MessageStatusValue
) => void

/**
 * UIKIT 客户端封装类
 *
 * 对 im-sdk-web 的 ChatClient 进行二次封装：
 * - 提供 login / logout / sendText 等便捷方法
 * - 统一事件处理器管理
 * - 支持消息发送状态回调（sending / sent / failed）
 * - 通过 manager getters 暴露原始 SDK 实例，保留全部原生能力
 */
export class UIKitClient {
  private _client: ChatClient
  private _connHandlers = new Map<string, ConnectionEventHandlerMap | PresenceEventHandlerMap>()
  private _chatHandlers = new Map<string, ChatEventHandlerMap>()
  private _contactHandlers = new Map<string, ContactEventHandlerMap>()
  private _groupHandlers = new Map<string, GroupEventHandlerMap>()
  private _onMessageStatus?: MessageStatusCallback

  constructor(config: ClientConfig) {
    const { debug, ...sdkConfig } = config
    this._client = SdkChatClient.init({
      ...sdkConfig,
      managers: [ChatManager, ContactManager, GroupManager, PresenceManager],
    })
    if (debug) {
      /**
       * @see SDK_DEFICIENCY: im-sdk-web ChatClient 未在公开 API 中暴露 logger 属性，
       * 无法通过类型安全的方式设置日志级别。
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logger = (this._client as any).logger
      if (logger && typeof logger.setLevel === 'function') {
        logger.setLevel('debug')
      }
    }
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

  /** 当前连接是否已打开 */
  get isConnected() {
    return this._client.getConnectionState() === 'connected'
  }

  /** 设置消息发送状态回调 */
  setMessageStatusCallback(cb: MessageStatusCallback) {
    this._onMessageStatus = cb
  }

  /** 登录（支持 accessToken 或密码） */
  async login(params: { user: string; accessToken?: string; password?: string }) {
    return this._client.login({
      userId: params.user,
      token: params.accessToken ?? params.password ?? '',
    })
  }

  /** 登出 */
  async logout() {
    return this._client.logout()
  }

  /**
   * 发送文本消息
   */
  async sendText(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    content: string
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createTextMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送图片消息 */
  async sendImage(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    file: File
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createImageMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送文件消息 */
  async sendFile(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    file: File
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createFileMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送自定义消息 */
  async sendCustom(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    customEvent: string
    customExts?: Record<string, unknown>
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createCustomMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      event: options.customEvent,
      ext: options.ext,
    })
    return this._sendWithStatus(msg)
  }

  /** 发送语音消息 */
  async sendAudio(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    file: File
    duration: number
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createVoiceMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送视频消息 */
  async sendVideo(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    file: File
    duration: number
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createVideoMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送位置消息 */
  async sendLocation(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    latitude: number
    longitude: number
    address?: string
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createLocationMessage(options)
    return this._sendWithStatus(msg)
  }

  /** 发送命令消息 */
  async sendCmd(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    action: string
    ext?: Record<string, unknown>
  }) {
    const msg = this._client.chatManager.createCmdMessage(options)
    return this._sendWithStatus(msg)
  }

  /**
   * 通用发送方法：发送 → 状态回调
   */
  private async _sendWithStatus(msg: SdkMessage): Promise<SdkMessage> {
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

  /** 从服务端分页获取会话列表 */
  async getServerConversations(options?: {
    pageSize?: number
    cursor?: string
    includeEmptyConversations?: boolean
  }) {
    const params = {
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
      includeEmptyConversations: options?.includeEmptyConversations ?? false,
    }
    console.log('[UIKitClient] getServerConversations -> chatManager.getConversationList', params)
    const result = await this._client.chatManager.getConversationList(params)
    console.log('[UIKitClient] getServerConversations <- result', {
      hasItems: !!result && 'items' in result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itemCount: (result as any)?.items?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursor: (result as any)?.cursor,
    })
    return result
  }

  /** 获取本地会话列表（WebSocket 同步的内存数据） */
  getSessionList() {
    return this._client.chatManager.getSessionList()
  }

  /** 强制刷新会话列表 */
  async refreshSessionList(options?: { needEmptySession?: boolean; needSessionMark?: boolean }) {
    return this._client.chatManager.refreshSessionList({
      needEmptySession: options?.needEmptySession ?? false,
      needSessionMark: options?.needSessionMark ?? false,
    })
  }

  /** 置顶/取消置顶会话 */
  async setConversationPinned(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    pinned: boolean
  }) {
    return this._client.chatManager.setConversationPinned({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      pinned: options.pinned,
    })
  }

  /** 标记会话已读（替代 sendChannelAck） */
  async markConversationRead(options: {
    conversationId: string
    conversationType: ConversationTypeValue
  }) {
    return this._client.chatManager.markConversationRead({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
  }

  /** 发送消息已读回执（单聊） */
  async sendMessageReadAck(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageId: string
  }) {
    return this._client.chatManager.sendMessageReadAck({
      conversationId: options.conversationId,
      messageId: options.messageId,
    })
  }

  /** 发送群消息已读回执 */
  async sendGroupMessageReadAck(options: {
    groupId: string
    messageId: string
    ackContent?: string
  }) {
    return this._client.chatManager.sendGroupMessageReadAck({
      groupId: options.groupId,
      messageId: options.messageId,
      ackContent: options.ackContent || JSON.stringify({}),
    })
  }

  /** 撤回消息 */
  async recallMessage(options: {
    messageId: string
    conversationId: string
    conversationType: ConversationTypeValue
  }) {
    return this._client.chatManager.recallMessage({
      messageId: options.messageId,
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
  }

  /** 修改已发送的消息 */
  async modifyMessage(options: UpdateMessageParams) {
    return this._client.chatManager.modifyMessage(options)
  }

  /** 置顶消息 */
  async pinMessage(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageId: string
  }) {
    return this._client.chatManager.pinMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      messageId: options.messageId,
    })
  }

  /** 取消置顶消息 */
  async unpinMessage(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    messageId: string
  }) {
    return this._client.chatManager.unpinMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      messageId: options.messageId,
    })
  }

  /** 分页拉取会话置顶消息列表 */
  async getPinnedMessageList(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    pageSize?: number
    cursor?: string
  }): Promise<PinnedMessageListResult> {
    /**
     * @see SDK_DEFICIENCY: getPinnedMessageList 参数类型仅包含 ConversationIdentifier，
     * 不支持 pageSize/cursor 分页参数，但我们仍透传以确保向后兼容。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this._client.chatManager.getPinnedMessageList(options as any)
  }

  /** 翻译文本（支持多目标语言；UIKIT 当前仅使用单目标） */
  async translateMessage(options: { text: string; languages: string[] }): Promise<MessageTranslationResult> {
    const fakeMsg = this._client.chatManager.createTextMessage({
      conversationId: '',
      conversationType: 'singleChat' as const,
      content: options.text,
    })
    return this._client.chatManager.translateMessage({
      message: fakeMsg,
      targetLanguages: options.languages,
    })
  }

  /** 获取翻译服务支持的语言列表 */
  async getSupportedTranslationLanguages() {
    return this._client.chatManager.getSupportedTranslationLanguages()
  }

  /** 获取群消息已读用户列表 */
  async getGroupMessageReadUsers(options: {
    messageId: string
    groupId: string
  }) {
    return this._client.chatManager.getGroupMessageReadUsers(options)
  }

  /** 删除会话 */
  async deleteConversation(options: {
    conversationId: string
    conversationType: ConversationTypeValue
    deleteRoamingMessages?: boolean
  }) {
    return this._client.chatManager.deleteConversation({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      deleteRoamingMessages: options.deleteRoamingMessages ?? false,
    })
  }

  /** 获取历史消息（分页） */
  async getHistoryMessages(options: {
    targetId: string
    conversationType: ConversationTypeValue
    pageSize?: number
    cursor?: string
  }) {
    return this._client.chatManager.getHistoryMessages({
      conversationId: options.targetId,
      conversationType: options.conversationType,
      pageSize: options.pageSize ?? 20,
      cursor: options.cursor ?? '',
    })
  }

  // ========== 好友 ==========
  /** 获取全部好友列表（轻量，仅 userId） */
  getContacts() {
    return this._client.contactManager.getContacts()
  }

  /** 分页获取好友列表（含备注） */
  async getContactsWithCursor(options?: {
    pageSize?: number
    cursor?: string
  }) {
    /**
     * @see SDK_DEFICIENCY: ContactManager 未暴露 getContactsWithCursor 方法，
     * 仅提供 getContacts() 返回内存中的完整联系人列表。
     * 此处保留占位实现以维持 UIKit 分页接口兼容性。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this._client.contactManager as any).getContactsWithCursor?.({
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
    })
  }

  /** 添加好友 */
  async addContact(userId: string, reason?: string) {
    return this._client.contactManager.addContact({
      userId,
      message: reason ?? '',
    })
  }

  /** 删除好友 */
  async deleteContact(userId: string) {
    return this._client.contactManager.deleteContact({ userId })
  }

  /** 设置好友备注 */
  async setContactRemark(userId: string, remark: string) {
    return this._client.contactManager.setContactRemark({ userId, remark })
  }

  // ========== 黑名单 ==========
  /** 获取黑名单 */
  getBlocklist() {
    return this._client.contactManager.getBlocklist()
  }

  /** 加入黑名单 */
  async addUsersToBlocklist(userIds: string[]) {
    return this._client.contactManager.addUsersToBlocklist({ userIds })
  }

  /** 移出黑名单 */
  async removeUserFromBlocklist(userId: string) {
    return this._client.contactManager.removeUserFromBlocklist({ userIds: [userId] })
  }

  // ========== 群组 ==========
  /** 拉取已加入的群组（分页） */
  async getJoinedGroupList(options?: {
    pageSize?: number
    needMemberCount?: boolean
    needRole?: boolean
  }) {
    return this._client.groupManager.getJoinedGroupList({
      pageSize: options?.pageSize ?? 50,
      needMemberCount: options?.needMemberCount ?? false,
      needRole: options?.needRole ?? false,
    })
  }

  /** 获取当前用户加入的群组总数（轻量接口，无需拉取完整列表） */
  async getJoinedGroupsCount() {
    try {
      const res = await this._client.groupManager.getJoinedGroupList({ pageSize: 1 })
      /**
       * @see SDK_DEFICIENCY: GroupListResult 类型未声明 total 字段，
       * 但服务端实际返回中包含该字段。
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (res as any)?.total === 'number' ? (res as any).total : 0
    } catch (e) {
      console.warn('[UIKitClient] getJoinedGroupsCount failed:', e)
      return 0
    }
  }

  /** 获取单个/多个群详情（支持批量） */
  async getGroupInfo(groupId: string | string[]) {
    const id = Array.isArray(groupId) ? groupId[0] : groupId
    return this._client.groupManager.getGroupInfo({ groupId: id })
  }

  // ========== Presence ==========
  /** 订阅在线状态变更 */
  async subscribePresence(userIds: string[], expiry = 7 * 24 * 60 * 60) {
    return this._client.presenceManager.subscribePresence({
      userIds,
      expiry,
    })
  }

  /** 取消订阅在线状态 */
  async unsubscribePresence(userIds: string[]) {
    return this._client.presenceManager.unsubscribePresence({ userIds })
  }

  /** 主动获取在线状态 */
  async getPresenceStatus(userIds: string[]) {
    return this._client.presenceManager.getPresenceStatus({ userIds })
  }

  /** 发布自定义在线状态 */
  async publishPresence(description: string) {
    /**
     * @see SDK_DEFICIENCY: PublishPresenceParams 类型未从 im-sdk-web 主入口导出，
     * 此处使用内联对象字面量。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this._client.presenceManager.publishPresence({ customStatus: description } as any)
  }

  /** 添加连接事件处理器 */
  addEventHandler(id: string, handler: ConnectionEventHandlerMap | PresenceEventHandlerMap) {
    this._connHandlers.set(id, handler)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._client.addEventHandler(id, handler as any)
  }

  /** 移除连接事件处理器 */
  removeEventHandler(id: string) {
    this._connHandlers.delete(id)
    this._client.removeEventHandler(id)
  }

  /** 添加 ChatManager 事件处理器 */
  addChatEventHandler(id: string, handler: ChatEventHandlerMap) {
    this._chatHandlers.set(id, handler)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._client.chatManager.addEventHandler(id, handler as any)
  }

  /** 移除 ChatManager 事件处理器 */
  removeChatEventHandler(id: string) {
    this._chatHandlers.delete(id)
    this._client.chatManager.removeEventHandler(id)
  }

  /** 添加 ContactManager 事件处理器 */
  addContactEventHandler(id: string, handler: ContactEventHandlerMap) {
    this._contactHandlers.set(id, handler)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._client.contactManager.addEventHandler(id, handler as any)
  }

  /** 移除 ContactManager 事件处理器 */
  removeContactEventHandler(id: string) {
    this._contactHandlers.delete(id)
    this._client.contactManager.removeEventHandler(id)
  }

  /** 添加 GroupManager 事件处理器 */
  addGroupEventHandler(id: string, handler: GroupEventHandlerMap) {
    this._groupHandlers.set(id, handler)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._client.groupManager.addEventHandler(id, handler as any)
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
