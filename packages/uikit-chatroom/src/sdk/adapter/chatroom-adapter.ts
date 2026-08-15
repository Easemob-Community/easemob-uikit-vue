import type {
  ChatRoomAttributeMutationResult,
  ChatRoomMuteStatus,
  ChatRoomPageParams,
  ChatRoomUpdateInfoInput,
  ChatRoomUpdateResult,
  JoinChatRoomInfo,
  Message as SdkMessage,
  UserInfo,
} from 'easemob-websdk'
import type { ManagerHost, UiMessage } from '@easemob/uikit-core'
import { MESSAGE_STATUS, MESSAGE_TYPE, createLogger, formatSdkError, normalizeUserId } from '@easemob/uikit-core'
import { CHATROOM_CONVERSATION_TYPE, CHATROOM_MEMBER_ROLE } from '../../constants'
import type {
  Chatroom,
  ChatroomAnnouncement,
  ChatroomAttributeMutationResult,
  ChatroomAttributes,
  ChatroomMember,
  ChatroomMemberPage,
  ChatroomMuteItem,
} from '../domain/chatroom-domain'
import {
  toChatroom,
  toChatroomMember,
  toChatroomMemberFromUser,
  toChatroomMuteItem,
} from '../domain/chatroom-domain'

const adapterLog = createLogger('UIKit:ChatroomAdapter')

/** 归一化用户标识：P2 review 上提至 core（与 uikit-im 共用同一实现），此处 re-export 兼容既有导入 */
export { normalizeUserId }

/**
 * SDK Message → UIKit UiMessage（聊天室场景：无未读/无回执语义，
 * status 仅保留发送态（sending/sent/failed），接收方向一律视为 sent）。
 */
export function toChatroomUiMessage(sdkMsg: SdkMessage, currentUserId: string): UiMessage {
  const isSelf = normalizeUserId(sdkMsg.from) === normalizeUserId(currentUserId)
  return {
    ...sdkMsg,
    isSelf,
    localId: sdkMsg.msgLocalId,
    status: sdkMsg.sendStatus ?? MESSAGE_STATUS.SENT,
  }
}

/**
 * 聊天室适配器：薄封装 websdk `ChatRoomManager` 全量能力 +
 * `ChatManager` 的聊天室消息收发 / 历史拉取，返回 domain 类型。
 *
 * 错误处理：统一日志（core `formatSdkError` 归一化后输出）并原样 rethrow，
 * 由调用方（composables）经 core `resolveSdkErrorMessage` 映射为用户文案
 * （core locale 已有 `error.chatroom*` 段）。
 */
export class ChatroomAdapter {
  constructor(private host: ManagerHost) {}

  private get rooms() {
    return this.host.chatRoomManager
  }

  private get chat() {
    return this.host.chatManager
  }

  /** 统一错误日志 + rethrow */
  private async _call<T>(op: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    }
    catch (error) {
      adapterLog.warn(`${op} failed:`, formatSdkError(error))
      throw error
    }
  }

  // ===== 房间生命周期 =====

  /** 加入聊天室；默认离开当前账号已加入的其他聊天室（单房间模型） */
  joinChatRoom(roomId: string, ext?: string, leaveOtherRooms = true): Promise<JoinChatRoomInfo> {
    return this._call('joinChatRoom', () =>
      this.rooms.joinChatRoom({ chatRoomId: roomId, ext, leaveOtherRooms }))
  }

  leaveChatRoom(roomId: string): Promise<void> {
    return this._call('leaveChatRoom', () =>
      this.rooms.leaveChatRoom({ chatRoomId: roomId }))
  }

  /** 获取房间详情（含公告 / 当前用户权限与状态快照） */
  async getChatroomInfo(roomId: string): Promise<Chatroom> {
    const detail = await this._call('getChatRoomInfo', () =>
      this.rooms.getChatRoomInfo({ chatRoomId: roomId }))
    return toChatroom(detail)
  }

  updateChatroomInfo(roomId: string, input: ChatRoomUpdateInfoInput): Promise<ChatRoomUpdateResult> {
    return this._call('updateChatRoomInfo', () =>
      this.rooms.updateChatRoomInfo({ chatRoomId: roomId, ...input }))
  }

  // ===== 成员 / 管理员 =====

  /** 成员列表分页（游标分页；大房间不做全量加载） */
  async getMemberList(roomId: string, cursor?: string, pageSize?: number): Promise<ChatroomMemberPage> {
    const result = await this._call('getMemberList', () =>
      this.rooms.getMemberList({ chatRoomId: roomId, cursor, pageSize }))
    return {
      items: result.items.map(toChatroomMember),
      cursor: result.cursor,
      hasMore: result.hasMore,
    }
  }

  /** 将成员移出聊天室（踢人） */
  removeMembers(roomId: string, userIds: string[]) {
    return this._call('removeMembers', () =>
      this.rooms.removeMembers({ chatRoomId: roomId, userIds }))
  }

  async getAdminList(roomId: string): Promise<ChatroomMember[]> {
    const admins = await this._call('getAdminList', () =>
      this.rooms.getAdminList({ chatRoomId: roomId }))
    return admins.map(user => toChatroomMemberFromUser(user, CHATROOM_MEMBER_ROLE.ADMIN))
  }

  addAdmin(roomId: string, userId: string): Promise<void> {
    return this._call('addAdmin', () =>
      this.rooms.addAdmin({ chatRoomId: roomId, userId }))
  }

  removeAdmin(roomId: string, userId: string): Promise<void> {
    return this._call('removeAdmin', () =>
      this.rooms.removeAdmin({ chatRoomId: roomId, userId }))
  }

  // ===== 禁言 =====

  async getMuteList(roomId: string, page?: ChatRoomPageParams): Promise<ChatroomMuteItem[]> {
    const entries = await this._call('getMuteList', () =>
      this.rooms.getMuteList({ chatRoomId: roomId, ...page }))
    return entries.map(toChatroomMuteItem)
  }

  /** 禁言成员（duration 单位：秒） */
  muteMembers(roomId: string, userIds: string[], duration: number): Promise<void> {
    return this._call('muteMembers', () =>
      this.rooms.muteMembers({ chatRoomId: roomId, userIds, duration }))
  }

  unmuteMembers(roomId: string, userIds: string[]): Promise<void> {
    return this._call('unmuteMembers', () =>
      this.rooms.unmuteMembers({ chatRoomId: roomId, userIds }))
  }

  muteAllMembers(roomId: string): Promise<void> {
    return this._call('muteAllMembers', () =>
      this.rooms.muteAllMembers({ chatRoomId: roomId }))
  }

  unmuteAllMembers(roomId: string): Promise<void> {
    return this._call('unmuteAllMembers', () =>
      this.rooms.unmuteAllMembers({ chatRoomId: roomId }))
  }

  checkIfInMuteList(roomId: string): Promise<ChatRoomMuteStatus> {
    return this._call('checkIfInMuteList', () =>
      this.rooms.checkIfInMuteList({ chatRoomId: roomId }))
  }

  // ===== 黑 / 白名单 =====

  getBlocklist(roomId: string, page?: ChatRoomPageParams): Promise<ChatroomMember[]> {
    return this._call('getBlocklist', () =>
      this.rooms.getBlocklist({ chatRoomId: roomId, ...page })
        .then(entries => entries.map(e => toChatroomMemberFromUser(e.user, CHATROOM_MEMBER_ROLE.MEMBER))))
  }

  blockMembers(roomId: string, userIds: string[]) {
    return this._call('blockMembers', () =>
      this.rooms.blockMembers({ chatRoomId: roomId, userIds }))
  }

  unblockMembers(roomId: string, userIds: string[]) {
    return this._call('unblockMembers', () =>
      this.rooms.unblockMembers({ chatRoomId: roomId, userIds }))
  }

  /** 白名单用户资料列表（SDK 返回条目包装 { user }，此处展开为 UserInfo） */
  getAllowlist(roomId: string): Promise<UserInfo[]> {
    return this._call('getAllowlist', () =>
      this.rooms.getAllowlist({ chatRoomId: roomId })
        .then(entries => entries.map(e => e.user)))
  }

  addUsersToAllowlist(roomId: string, userIds: string[]) {
    return this._call('addUsersToAllowlist', () =>
      this.rooms.addUsersToAllowlist({ chatRoomId: roomId, userIds }))
  }

  removeUsersFromAllowlist(roomId: string, userIds: string[]) {
    return this._call('removeUsersFromAllowlist', () =>
      this.rooms.removeUsersFromAllowlist({ chatRoomId: roomId, userIds }))
  }

  checkIfInAllowList(roomId: string): Promise<boolean> {
    return this._call('checkIfInAllowList', () =>
      this.rooms.checkIfInAllowList({ chatRoomId: roomId }))
  }

  // ===== 公告 =====

  async getAnnouncement(roomId: string): Promise<ChatroomAnnouncement> {
    const result = await this._call('getAnnouncement', () =>
      this.rooms.getAnnouncement({ chatRoomId: roomId }))
    return { content: result.announcement }
  }

  updateAnnouncement(roomId: string, content: string): Promise<void> {
    return this._call('updateAnnouncement', () =>
      this.rooms.updateAnnouncement({ chatRoomId: roomId, announcement: content }))
  }

  // ===== 房间属性（KV） =====

  /** 拉取房间属性（keys 缺省时全量） */
  async getAttributes(roomId: string, keys?: string[]): Promise<ChatroomAttributes> {
    const snapshot = await this._call('getAttributes', () =>
      this.rooms.getAttributes({ chatRoomId: roomId, keys }))
    return { ...snapshot.attributes }
  }

  /**
   * 设置房间属性。
   * autoDelete：成员退出时是否自动删除其设置的属性（默认 true）；
   * isForced：是否允许覆盖其他成员设置的属性（默认 false）。
   */
  async setAttributes(
    roomId: string,
    attributes: ChatroomAttributes,
    options: { autoDelete?: boolean, isForced?: boolean } = {},
  ): Promise<ChatroomAttributeMutationResult> {
    const result = await this._call('setAttributes', () =>
      this.rooms.setAttributes({ chatRoomId: roomId, attributes, ...options }))
    return toAttributeMutationResult(result)
  }

  removeAttributes(
    roomId: string,
    keys: string[],
    options: { isForced?: boolean } = {},
  ): Promise<ChatroomAttributeMutationResult> {
    return this._call('removeAttributes', () =>
      this.rooms.removeAttributes({ chatRoomId: roomId, keys, ...options })
        .then(toAttributeMutationResult))
  }

  // ===== 聊天室消息（ChatManager，conversationType 固定 'chatRoom'） =====

  /** 创建本地文本消息（乐观上屏用，status 由 composable 层标记 sending） */
  createTextMessage(roomId: string, content: string, ext?: Record<string, unknown>): SdkMessage {
    return this.chat.createTextMessage({
      conversationId: roomId,
      conversationType: CHATROOM_CONVERSATION_TYPE.CHATROOM,
      content,
      ext,
    })
  }

  /** 创建本地图片消息（data 为 File 或已上传的 URL） */
  createImageMessage(roomId: string, data: File | string, ext?: Record<string, unknown>): SdkMessage {
    return this.chat.createImageMessage({
      conversationId: roomId,
      conversationType: CHATROOM_CONVERSATION_TYPE.CHATROOM,
      ext,
      ...(typeof data === 'string' ? { originalUrl: data } : { data }),
    })
  }

  /** 创建本地自定义消息（礼物 / 业务卡片等走 custom） */
  createCustomMessage(
    roomId: string,
    event: string,
    params?: Record<string, string>,
    ext?: Record<string, unknown>,
  ): SdkMessage {
    return this.chat.createCustomMessage({
      conversationId: roomId,
      conversationType: CHATROOM_CONVERSATION_TYPE.CHATROOM,
      event,
      params,
      ext,
    })
  }

  /** 发送已创建的消息（发送侧频率限制由 SDK 控制，触发时限流错误原样抛出） */
  sendMessage(message: SdkMessage): Promise<SdkMessage> {
    return this._call('sendMessage', () => this.chat.sendMessage(message))
  }

  /**
   * 拉取聊天室历史消息（进房必拉最近 N 条；无离线消息概念）。
   * CMD 透传消息不上屏，入口过滤。
   */
  async fetchHistory(
    roomId: string,
    currentUserId: string,
    cursor?: string,
    pageSize?: number,
  ): Promise<{ items: UiMessage[], cursor?: string, hasMore?: boolean }> {
    const page = await this._call('getHistoryMessages', () =>
      this.chat.getHistoryMessages({
        conversationId: roomId,
        conversationType: CHATROOM_CONVERSATION_TYPE.CHATROOM,
        cursor,
        pageSize,
        searchDirection: 'up',
      }))
    const items = page.items
      .filter(msg => msg.type !== MESSAGE_TYPE.CMD)
      .map(msg => toChatroomUiMessage(msg, currentUserId))
    return { items, cursor: page.cursor, hasMore: page.hasMore }
  }
}

/** SDK 属性批量变更结果 → domain 类型（ReadonlyArray → 可变数组） */
function toAttributeMutationResult(result: ChatRoomAttributeMutationResult): ChatroomAttributeMutationResult {
  return {
    appliedKeys: [...result.appliedKeys],
    failedKeys: Object.fromEntries(
      Object.entries(result.failedKeys).map(([key, err]) => [key, { code: err.code, message: err.message }]),
    ),
  }
}
