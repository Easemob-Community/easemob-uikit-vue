import type {
  GroupDetail,
  JoinedGroupSummary,
  Contact as SdkContact,
  Message as SdkMessage,
  UserInfo as SdkUserInfo,
} from 'easemob-websdk'

export type { GroupMemberEntry } from 'easemob-websdk'

/**
 * UIKit 对 SDK Message 的扩展字段。
 * SDK Message 本身已包含：msgServerId / msgLocalId / status / timestamp /
 * groupReadCount / modifiedInfo / body / ext 等。
 */
export interface UiMessageExtension {
  /** 是否为自己发送的消息 */
  isSelf: boolean
  /** 本地消息 ID 别名，方便 UI 层引用 */
  localId?: string
  /** 该消息是否请求群已读回执 */
  requireGroupAck?: boolean
  /** 群成员总数（仅群消息展示用） */
  groupMemberCount?: number
  /** 消息是否已被撤回 */
  recalled?: boolean
  /** 撤回操作者 ID */
  recalledBy?: string
  /** 文本消息撤回后保留的原始内容，用于重新编辑 */
  originalMsg?: string
  /** 是否被置顶（仅用于置顶消息列表展示） */
  pinned?: boolean
  /** 置顶时间 */
  pinTime?: number
  /** 置顶操作人 ID */
  pinOperatorId?: string
  /** 翻译结果 */
  translation?: { text: string, to: string }
  /** 是否优先展示译文 */
  showTranslation?: boolean
  /** 是否正在翻译中 */
  translating?: boolean
  /** 发送失败原因 */
  failReason?: string
  /** 附件上传进度（0-100） */
  progress?: number
  /** 消息是否被编辑过 */
  modified?: boolean
}

/** UIKit 层消息：SDK Message 加上 UI 扩展 */
export type UiMessage = SdkMessage & UiMessageExtension

/** UIKit 会话展示类型 */
export interface UiConversation {
  /** 会话 ID */
  id: string
  /** 展示名称 */
  name: string
  /** 头像 */
  avatar?: string
  /** 会话类型 */
  type: 'singleChat' | 'groupChat'
  /** 未读数 */
  unreadCount: number
  /** 最后一条消息摘要文本 */
  lastMessageText: string
  /** 最后一条消息时间戳 */
  lastMessageTime?: number
  /** 是否置顶 */
  isPinned: boolean
  /** 置顶时间戳 */
  pinnedTime?: number
  /** 是否免打扰 */
  isMuted: boolean
  /** 会话标记列表 */
  marks: number[]
  /** 草稿内容 */
  draft?: string
  /** 草稿保存时间 */
  draftTime?: number
  /** 提醒类型 */
  remindType?: string
}

/** UIKit 联系人展示类型 */
export interface UiContact {
  /** 用户 ID */
  userId: string
  /** 显示名（备注优先） */
  name?: string
  /** 头像 */
  avatar?: string
  /** 备注 */
  remark?: string
  /** 签名 */
  signature?: string
  /** 性别 */
  gender?: string
  /** 生日 */
  birth?: string
  /** 电话 */
  phone?: string
  /** 邮箱 */
  mail?: string
  /** 扩展 */
  ext?: Record<string, unknown>
}

/** UIKit 群组展示类型 */
export interface UiGroup {
  /** 群 ID */
  groupId: string
  /** 群名称 */
  groupName?: string
  /** 群头像 */
  avatar?: string
  /** 群描述 */
  description?: string
  /** 群主 */
  owner?: string
  /** 成员数 */
  memberCount?: number
  /** 最大成员数 */
  maxUsers?: number
  /** 是否公开群 */
  public?: boolean
  /** 是否允许成员邀请 */
  allowInvites?: boolean
  /** 入群是否需要审批 */
  approval?: boolean
  /** 是否全员禁言 */
  mute?: boolean
  /** 群是否被禁用 */
  disabled?: boolean
  /** 是否屏蔽群消息 */
  shieldgroup?: boolean
  /** 群公告 */
  announcement?: string
  /** 创建时间 */
  created?: number
}

/** UIKit 群成员展示类型 */
export interface UiGroupMember {
  /** 成员用户 ID */
  userId: string
  /** 成员昵称 */
  nickname?: string
  /** 成员头像 */
  avatarUrl?: string
  /** 成员角色 */
  role?: 'owner' | 'admin' | 'member'
  /** 入群时间戳 */
  joinedAt?: number
}

/** UIKit 好友申请 / 群组邀请展示类型 */
export interface UiContactInvite {
  /** 唯一标识（好友申请取 userId，群组邀请取 groupId） */
  id: string
  /** 通知类型：好友申请 / 群组邀请 */
  type: 'contact' | 'group'
  /** 申请人/被邀请人用户 ID（好友申请时为申请人） */
  userId?: string
  /** 申请人/对方昵称 */
  nickname?: string
  /** 申请人/对方头像 */
  avatarUrl?: string
  /** 申请/邀请附言 */
  reason?: string
  /** 群组 ID（仅群组邀请） */
  groupId?: string
  /** 群组名称（仅群组邀请） */
  groupName?: string
  /** 邀请人用户 ID（仅群组邀请） */
  inviterId?: string
  /** 邀请人昵称（仅群组邀请） */
  inviterName?: string
  /** 申请/邀请状态 */
  status: 'pending' | 'accepted' | 'declined'
  /** 申请/邀请时间戳 */
  timestamp?: number
}

/** UIKit 在线状态展示类型 */
export interface UiPresence {
  userId: string
  status: 'online' | 'offline' | 'away' | 'busy' | 'custom'
  ext?: string
  lastTime?: number
}

/** SDK 联系人来源联合类型 */
export type SdkContactSource = SdkContact | SdkUserInfo

/** SDK 群组来源联合类型 */
export type SdkGroupSource = JoinedGroupSummary | GroupDetail

/** 简化后的本地发送消息标识 */
export interface SendingMessageMeta {
  localId: string
  sdkMessage: SdkMessage
  timestamp: number
}

export type {
  TextMessageBody,
  ImageMessageBody,
  FileMessageBody,
  VoiceMessageBody,
  VideoMessageBody,
  LocationMessageBody,
  CmdMessageBody,
  CustomMessageBody,
  CombineMessageBody,
  MessageStatus,
} from './types/message'

export {
  isTextBody,
  isImageBody,
  isFileBody,
  isVoiceBody,
  isVideoBody,
  isLocationBody,
  isCustomBody,
  isCombineBody,
  isCmdBody,
} from './types/message'
