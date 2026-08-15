import type { ChatEventHandlerMap, ChatRoomEventHandlerMap, UserInfo } from 'easemob-websdk'
import type { ConversationTypeValue, ManagerHost } from '@easemob/uikit-core'
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

/** 房间终态事件回调（供 Provider/容器弹 toast 或通知接入方） */
export interface ChatroomEventCallbacks {
  /** 当前用户被移出聊天室（reason 为 SDK 原因码） */
  onKicked?: (reason: number) => void
  /** 聊天室被解散 */
  onDestroyed?: () => void
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
   * 仅处理活动房间的事件（两层建模：成员/禁言/公告/属性等管理态只对 UI 房开放，
   * 见设计文档 §5.9；信令房 P3 订阅，不参与管理态）。
   */
  const isActiveRoom = (chatRoomId: string) => stores.chatroom.roomId === chatRoomId

  const roomHandlers: ChatRoomEventHandlerMap = {
    onChatRoomDestroyed: (payload) => {
      if (!isActiveRoom(payload.chatRoomId))
        return
      stores.chatroom.markDestroyed()
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
      if (!isActiveRoom(payload.chatRoomId))
        return
      // 记录 SDK 原因码，容器 kicked 事件透传给业务（P2 review P1-2）
      stores.chatroom.markKicked(payload.reason)
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
      // 仅聊天室消息 + 仅已登记房间（两层建模：注册表内任意房间的消息都入对应桶，
      // 活动房间由 composable 视图消费；未登记房间的广播不消费）；CMD 透传消息不上屏
      if (message.conversationType !== CHATROOM_CONVERSATION_TYPE.CHATROOM)
        return
      if (!stores.chatroom.isKnownRoom(message.conversationId))
        return
      if (message.type === MESSAGE_TYPE.CMD)
        return
      // 入接收缓冲队列，按窗口批量合并进渲染列表（接收侧渲染节流）
      stores.chatroomMessage.enqueueMessages(message.conversationId, [
        toChatroomUiMessage(message, stores.client.currentUser),
      ])
    },
    onMessageRecalled: (payload) => {
      if (payload.conversationType !== CHATROOM_CONVERSATION_TYPE.CHATROOM)
        return
      if (!stores.chatroom.isKnownRoom(payload.conversationId))
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
