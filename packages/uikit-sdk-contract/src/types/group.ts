import type { GroupMemberRoleValue } from '../constants'

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
  /** 当前用户在群内的角色 */
  role?: GroupMemberRoleValue
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

/** 创建群组参数（对齐 SDK groupManager.createGroup 契约，供业务接管时复用） */
export interface CreateGroupParams {
  /** 群名称 */
  name: string
  /** 群描述 */
  description?: string
  /** 初始成员（不含创建者） */
  memberIds?: string[]
  /** 是否公开群，默认 false */
  public?: boolean
  /** 入群是否需要管理员审批，默认 false */
  joinApprovalRequired?: boolean
  /** 是否允许普通成员邀请其他用户入群，默认 false */
  allowInvites?: boolean
  /** 被邀请人入群前是否需要确认邀请，默认 false */
  inviteNeedConfirm?: boolean
  /** 群组最大成员数 */
  maxMembers?: number
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
  role?: GroupMemberRoleValue
  /** 入群时间戳 */
  joinedAt?: number
  /** 禁言到期时间戳（毫秒），仅禁言列表场景有值 */
  muteExpire?: number
  /** 禁言时长（毫秒），仅禁言列表场景有值 */
  muteDuration?: number
}
