import type {
  ChatRoomDetail,
  ChatRoomMemberEntry,
  ChatRoomMuteEntry,
  ChatRoomSummary,
  UserInfo,
} from 'easemob-websdk'
import type { ChatroomMemberRoleValue, ChatroomPermissionValue } from '../../constants'
import { CHATROOM_MEMBER_ROLE } from '../../constants'

/**
 * 聊天室 domain 类型：对 websdk `ChatRoom*` wire 类型的 UIKit 侧映射。
 * 与 core 的 user-info/presence domain 同层，仅承载聊天室场景模型。
 */

/** 聊天室房间信息 */
export interface Chatroom {
  /** 房间 ID */
  id: string
  /** 房间名称 */
  name: string
  /** 房间描述 */
  description?: string
  /** 最大成员数 */
  maxUsers?: number
  /** 当前成员数 */
  memberCount?: number
  /** 房主用户 ID */
  ownerId?: string
  /** 房间公告（详情接口携带；实时变更经 onAnnouncementChanged 事件同步） */
  announcement?: string
  /** 创建时间戳（单位以服务端返回为准） */
  createdAt?: number
  /** 扩展信息 */
  ext?: string
  /** 房间是否已被禁用 */
  disabled?: boolean
  /** 当前用户在房间内的权限类型 */
  permissionType?: ChatroomPermissionValue
  /** 当前用户是否处于禁言状态 */
  currentUserMuted?: boolean
  /** 当前用户是否在白名单中 */
  currentUserInAllowlist?: boolean
}

/** 聊天室成员 */
export interface ChatroomMember {
  /** 成员用户 ID */
  userId: string
  /** 昵称 */
  nickname?: string
  /** 头像 */
  avatarUrl?: string
  /** 角色：owner / admin / member */
  role: ChatroomMemberRoleValue
  /** 加入时间戳 */
  joinedAt?: number
}

/** 聊天室禁言名单条目 */
export interface ChatroomMuteItem {
  /** 被禁言用户 ID */
  userId: string
  /** 昵称 */
  nickname?: string
  /** 头像 */
  avatarUrl?: string
  /** 禁言到期时间戳（毫秒，具体以服务端返回为准） */
  muteExpire?: number
  /** 禁言时长（秒，具体以服务端返回为准） */
  duration?: number
}

/** 聊天室公告 */
export interface ChatroomAnnouncement {
  /** 公告内容 */
  content: string
}

/** 聊天室自定义属性（KV，key/value 均为字符串；变种房间级状态走这里，见设计文档 5.6） */
export type ChatroomAttributes = Record<string, string>

/** 成员分页结果 */
export interface ChatroomMemberPage {
  items: ChatroomMember[]
  /** 下一页游标（空表示没有更多） */
  cursor?: string
  hasMore?: boolean
}

/** 属性批量变更结果（对齐 SDK `ChatRoomAttributeMutationResult`） */
export interface ChatroomAttributeMutationResult {
  /** 成功应用的 key 列表 */
  appliedKeys: string[]
  /** 失败的 key → 错误信息 */
  failedKeys: Record<string, { code: number, message: string }>
}

/** 从 SDK UserInfo 提取成员基础字段 */
function fromUserInfo(user: UserInfo | undefined): Pick<ChatroomMember, 'userId' | 'nickname' | 'avatarUrl'> {
  return {
    userId: user?.userId ?? '',
    nickname: user?.nickname,
    avatarUrl: user?.avatarUrl,
  }
}

/** SDK ChatRoomSummary/Detail → Chatroom */
export function toChatroom(detail: ChatRoomSummary | ChatRoomDetail): Chatroom {
  const room: Chatroom = {
    id: detail.chatRoomId,
    name: detail.name,
    memberCount: detail.memberCount,
    ownerId: detail.owner?.userId,
    disabled: detail.disabled,
  }
  if ('description' in detail) {
    room.description = detail.description
    room.maxUsers = detail.maxMembers
    room.createdAt = detail.createdAt
    room.ext = detail.ext
    room.announcement = detail.announcement
    room.permissionType = detail.permissionType
    room.currentUserMuted = detail.currentUserStatus?.muted
    room.currentUserInAllowlist = detail.currentUserStatus?.inAllowlist
  }
  return room
}

/** SDK ChatRoomMemberEntry → ChatroomMember */
export function toChatroomMember(entry: ChatRoomMemberEntry): ChatroomMember {
  return {
    ...fromUserInfo(entry.user),
    role: entry.role ?? CHATROOM_MEMBER_ROLE.MEMBER,
    joinedAt: entry.joinedAt,
  }
}

/** SDK UserInfo（管理员/黑白名单条目）→ ChatroomMember */
export function toChatroomMemberFromUser(user: UserInfo, role: ChatroomMemberRoleValue): ChatroomMember {
  return { ...fromUserInfo(user), role }
}

/** SDK ChatRoomMuteEntry → ChatroomMuteItem */
export function toChatroomMuteItem(entry: ChatRoomMuteEntry): ChatroomMuteItem {
  return {
    ...fromUserInfo(entry.user),
    muteExpire: entry.muteExpire,
    duration: entry.duration,
  }
}
