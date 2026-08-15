import type { ChatEventHandlerMap, ChatRoomEventHandlerMap, UserInfo } from 'easemob-websdk'
import type { ConversationTypeValue, ManagerHost, UiMessage } from '@easemob/uikit-core'
import { MESSAGE_TYPE, createLogger, createNoticeMessage, resolveNoticeUserName, t } from '@easemob/uikit-core'
import { CHATROOM_CONVERSATION_TYPE, CHATROOM_MEMBER_ROLE } from '../../constants'
import { toChatroom, toChatroomMuteItem } from '../domain/chatroom-domain'
import { toChatroomUiMessage } from '../adapter/chatroom-adapter'
import type { useChatroomMessageStore } from '../../store/chatroom-message'
import type { useChatroomStore } from '../../store/chatroom'

const eventLog = createLogger('UIKit:ChatroomEvents')

/** 房间事件处理器依赖的 store 集合（本包自有 store，直接引用类型） */
export interface ChatroomEventStores {
  chatroom: ReturnType<typeof useChatroomStore>
  chatroomMessage: ReturnType<typeof useChatroomMessageStore>
  client: {
    currentUser: string
  }
}

/** 房间终态事件回调（供 Provider/容器弹 toast 或通知接入方；interact 房） */
export interface ChatroomEventCallbacks {
  /** 当前用户被移出聊天室（reason 为 SDK 原因码） */
  onKicked?: (reason: number) => void
  /** 聊天室被解散 */
  onDestroyed?: () => void
}

/** 信令房消息透传 payload（§5.9：UIKit 零渲染零假设，业务经回调自行呈现） */
export interface SignalMessagePayload {
  roomId: string
  message: UiMessage
}

/** 信令房状态 payload（join 失败 / 被踢 / 解散降级回调，不拖累 UI 房） */
export interface SignalStatusPayload {
  roomId: string
  status: 'joined' | 'failed' | 'kicked' | 'destroyed'
  error?: unknown
}

/** 信令房消息/状态分发器（模块级监听器集合；useChatroom 注册，容器与 headless 同一契约） */
const signalMessageListeners = new Set<(payload: SignalMessagePayload) => void>()
const signalStatusListeners = new Set<(payload: SignalStatusPayload) => void>()

/** 订阅信令房消息透传（返回取消订阅函数） */
export function subscribeSignalMessages(listener: (payload: SignalMessagePayload) => void): () => void {
  signalMessageListeners.add(listener)
  return () => signalMessageListeners.delete(listener)
}

/** 订阅信令房状态变化（返回取消订阅函数） */
export function subscribeSignalStatus(listener: (payload: SignalStatusPayload) => void): () => void {
  signalStatusListeners.add(listener)
  return () => signalStatusListeners.delete(listener)
}

/** 分发信令房消息（无订阅者时静默丢弃——业务未消费即不关心，§5.10「透传回调」语义） */
function dispatchSignalMessage(payload: SignalMessagePayload) {
  for (const listener of signalMessageListeners)
    listener(payload)
}

/** 分发信令房状态（房间终态 + useChatroom.joinSignalRoom 的 joined/failed） */
export function dispatchSignalStatus(payload: SignalStatusPayload) {
  for (const listener of signalStatusListeners)
    listener(payload)
}

// core notice 工具的 conversationType 形参是 core 的 ConversationTypeValue（单群聊场景联合），
// 聊天室 wire 值 'chatRoom' 不在其内；UiMessage.conversationType 底层是 SDK
// ChatConversationType（含 'chatRoom'），此处一次性断言，不在各调用点扩散。
const NOTICE_CONVERSATION_TYPE = CHATROOM_CONVERSATION_TYPE.CHATROOM as unknown as ConversationTypeValue

/** 房间事件 → 系统通知消息，插入指定房间消息流（复用 core notice 工具产出的 UiNoticeMessage 结构） */
function pushNotice(stores: ChatroomEventStores, roomId: string, text: string) {
  if (!text)
    return
  const notice = createNoticeMessage(
    text,
    roomId,
    NOTICE_CONVERSATION_TYPE,
    stores.client.currentUser || '',
  )
  stores.chatroomMessage.addMessage(roomId, notice)
}

/** 成员名单展示名（最多列前 3 个，超出以「等 N 人」收敛） */
function memberNames(users: readonly UserInfo[]): string {
  const names = users.slice(0, 3).map(u => resolveNoticeUserName(u))
  return users.length > 3
    ? t('chatroom.notice.memberNamesMore', '', { names: names.join('、'), count: users.length })
    : names.join('、')
}

/**
 * 注册聊天室场景事件处理器（chatroom 包自建，不进 core 注册表）：
 * - `chatRoomManager`：房间事件（成员进出/禁言/管理员/公告/属性/被踢/解散等），
 *   全部转系统通知插入消息流并同步房间 store；
 * - `chatManager`：消息事件按 `conversationType === 'chatRoom'` 过滤，
 *   与单群聊场景包同装时互不污染。
 *
 * 返回 dispose 函数（登出 / 重新初始化 / Provider 卸载时调用）。
 */
export function registerChatroomEventHandlers(
  host: ManagerHost,
  stores: ChatroomEventStores,
  callbacks: ChatroomEventCallbacks = {},
): () => void {
  /**
   * 仅处理活动房间的管理事件（两层建模：成员/禁言/公告/属性等管理态只对 UI 房开放，
   * 见设计文档 §5.9；信令房不参与管理态，仅消息透传 + 终态降级回调）。
   */
  const isActiveRoom = (chatRoomId: string) => stores.chatroom.roomId === chatRoomId

  const roomHandlers: ChatRoomEventHandlerMap = {
    onChatRoomDestroyed: (payload) => {
      if (!stores.chatroom.isKnownRoom(payload.chatRoomId))
        return
      if (stores.chatroom.roomKind(payload.chatRoomId) === 'signal') {
        // 信令房解散：降级为状态回调（不拖累 UI 房，§5.9）
        dispatchSignalStatus({ roomId: payload.chatRoomId, status: 'destroyed' })
        stores.chatroom.removeRoom(payload.chatRoomId)
        return
      }
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.markDestroyed(payload.chatRoomId)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.destroyed'))
      callbacks.onDestroyed?.()
    },
    onMembersJoined: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.incrementMemberCount(payload.members.length)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.memberJoined', '', { name: memberNames(payload.members) }))
    },
    onMembersExited: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.incrementMemberCount(-payload.members.length)
      stores.chatroom.removeMembersByIds(payload.members.map(u => u.userId))
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.memberExited', '', { name: memberNames(payload.members) }))
    },
    onRemovedFromChatRoom: (payload) => {
      if (!stores.chatroom.isKnownRoom(payload.chatRoomId))
        return
      if (stores.chatroom.roomKind(payload.chatRoomId) === 'signal') {
        // 信令房被移出：降级为状态回调（§5.9）
        dispatchSignalStatus({ roomId: payload.chatRoomId, status: 'kicked', error: payload.reason })
        stores.chatroom.removeRoom(payload.chatRoomId)
        return
      }
      if (!isActiveRoom(payload.chatRoomId))
        return
      // 记录 SDK 原因码，容器 kicked 事件透传给业务（P2 review P1-2）
      stores.chatroom.markKicked(payload.chatRoomId, payload.reason)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.kicked'))
      callbacks.onKicked?.(payload.reason)
    },
    onMuteListAdded: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.addMuteItems(payload.mutes.map(toChatroomMuteItem))
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.muteAdded', '', {
        name: memberNames(payload.mutes.map(m => m.user)),
      }))
    },
    onMuteListRemoved: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.removeMuteItemsByIds(payload.mutes.map(u => u.userId))
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.muteRemoved', '', { name: memberNames(payload.mutes) }))
    },
    onAllMemberMuteStateChanged: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.setAllMuted(payload.isMuted)
      pushNotice(stores, payload.chatRoomId, t(payload.isMuted ? 'chatroom.notice.allMuteOn' : 'chatroom.notice.allMuteOff'))
    },
    onAllowListAdded: (payload) => {
      // 白名单变更属管理侧状态（本步不维护白名单缓存），仅记日志不上屏
      // （debug 级别：高频管理事件不刷屏，P2 review P2-11）
      if (isActiveRoom(payload.chatRoomId))
        eventLog.debug('onAllowListAdded', payload)
    },
    onAllowListRemoved: (payload) => {
      if (isActiveRoom(payload.chatRoomId))
        eventLog.debug('onAllowListRemoved', payload)
    },
    onAdminAdded: (payload) => {
      if (!isActiveRoom(payload.chatRoomId) || !payload.admin)
        return
      stores.chatroom.updateMemberRole(payload.admin.userId, CHATROOM_MEMBER_ROLE.ADMIN)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.adminAdded', '', { name: resolveNoticeUserName(payload.admin) }))
    },
    onAdminRemoved: (payload) => {
      if (!isActiveRoom(payload.chatRoomId) || !payload.admin)
        return
      stores.chatroom.updateMemberRole(payload.admin.userId, CHATROOM_MEMBER_ROLE.MEMBER)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.adminRemoved', '', { name: resolveNoticeUserName(payload.admin) }))
    },
    onOwnerChanged: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      if (payload.oldOwner)
        stores.chatroom.updateMemberRole(payload.oldOwner.userId, CHATROOM_MEMBER_ROLE.MEMBER)
      if (payload.newOwner) {
        stores.chatroom.updateMemberRole(payload.newOwner.userId, CHATROOM_MEMBER_ROLE.OWNER)
        const info = stores.chatroom.info
        if (info)
          stores.chatroom.setInfo({ ...info, ownerId: payload.newOwner.userId })
        pushNotice(stores, payload.chatRoomId, t('chatroom.notice.ownerChanged', '', { name: resolveNoticeUserName(payload.newOwner) }))
      }
    },
    onAnnouncementChanged: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.setAnnouncement(payload.announcement)
      pushNotice(stores, payload.chatRoomId, t('chatroom.notice.announcementChanged', '', { content: payload.announcement }))
    },
    onChatRoomInfoChanged: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.setInfo(toChatroom(payload.chatRoomInfo))
    },
    onAttributesUpdate: (payload) => {
      // 属性是机器态 KV（麦位/商品/直播状态），增量同步本地缓存，不上屏
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.mergeAttributes(payload.attributes)
    },
    onAttributesRemoved: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.removeAttributeKeys(payload.keyList)
    },
  }

  const chatHandlers: ChatEventHandlerMap = {
    onMessage: (message) => {
      // 仅聊天室消息 + 仅已登记房间（未登记房间的广播不消费）；CMD 透传消息不上屏
      if (message.conversationType !== CHATROOM_CONVERSATION_TYPE.CHATROOM)
        return
      if (!stores.chatroom.isKnownRoom(message.conversationId))
        return
      if (message.type === MESSAGE_TYPE.CMD)
        return
      const uiMessage = toChatroomUiMessage(message, stores.client.currentUser)
      if (stores.chatroom.roomKind(message.conversationId) === 'signal') {
        // 信令房：只透传不出屏（不进桶不渲染，§5.9/§5.10；业务经订阅自行呈现）
        dispatchSignalMessage({ roomId: message.conversationId, message: uiMessage })
        return
      }
      // UI 房：入接收缓冲队列，按窗口批量合并进渲染列表（接收侧渲染节流）
      stores.chatroomMessage.enqueueMessages(message.conversationId, [uiMessage])
    },
    onMessageRecalled: (payload) => {
      if (payload.conversationType !== CHATROOM_CONVERSATION_TYPE.CHATROOM)
        return
      if (!stores.chatroom.isKnownRoom(payload.conversationId))
        return
      // 信令房撤回：透传 message 不可得（只有 messageId），状态回调降级
      if (stores.chatroom.roomKind(payload.conversationId) === 'signal')
        return
      stores.chatroomMessage.markRecalled(payload.conversationId, payload.messageId)
    },
  }

  host.chatRoomManager.addEventHandler('uikit-chatroom', roomHandlers)
  host.chatManager.addEventHandler('uikit-chatroom-chat', chatHandlers)

  return () => {
    host.chatRoomManager.removeEventHandler('uikit-chatroom')
    host.chatManager.removeEventHandler('uikit-chatroom-chat')
  }
}
