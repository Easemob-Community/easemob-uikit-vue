import type { GroupMemberEntry, GroupMuteEntry, SdkGroupSource, UiGroup, UiGroupMember } from '@easemob/uikit-core'

/**
 * 将 SDK 群组摘要/详情转换为 UIKit 群组展示类型。
 */
export function toUiGroup(source: SdkGroupSource): UiGroup {
  const base: UiGroup = {
    groupId: source.groupId,
    groupName: source.name,
    description: source.description,
    memberCount: source.memberCount,
    public: source.public,
    allowInvites: source.allowInvites,
    approval: source.joinApprovalRequired,
    disabled: source.disabled,
    maxUsers: source.maxMembers,
  }

  // 角色仅在有值时写入，避免详情接口未返回 role 时用 undefined 覆盖本地已缓存的角色
  if (source.role) {
    base.role = source.role
  }

  if ('avatarUrl' in source) {
    base.avatar = source.avatarUrl
  }

  if ('muteAllMembers' in source) {
    base.mute = source.muteAllMembers
  }

  if ('ownerId' in source) {
    base.owner = source.ownerId
  }

  if ('owner' in source && source.owner) {
    base.owner = source.owner.userId
  }

  if ('createdAt' in source) {
    base.created = source.createdAt
  }

  if ('messageBlocked' in source) {
    base.shieldgroup = source.messageBlocked
  }

  return base
}

/** 批量转换 SDK 群组 */
export function toUiGroups(sources: readonly SdkGroupSource[]): UiGroup[] {
  return sources.map(source => toUiGroup(source))
}

/** 将 SDK 群成员/禁言条目转换为 UIKit 群成员展示类型 */
export function toUiGroupMember(source: GroupMemberEntry | GroupMuteEntry): UiGroupMember {
  const user = source.user
  const member: UiGroupMember = {
    userId: user.userId,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: 'role' in source ? source.role : undefined,
  }

  // 0.14.192+ 服务端未返回加入时间时 SDK 不再输出该字段
  if ('joinedAt' in source) {
    member.joinedAt = source.joinedAt
  }

  // 0.20.40+ SDK 禁言列表返回 muteExpire / muteDuration（毫秒）
  if ('muteExpire' in source && source.muteExpire !== undefined) {
    member.muteExpire = source.muteExpire
  }
  if ('muteDuration' in source && source.muteDuration !== undefined) {
    member.muteDuration = source.muteDuration
  }

  return member
}

/** 批量转换 SDK 群成员/禁言条目 */
export function toUiGroupMembers(sources: readonly (GroupMemberEntry | GroupMuteEntry)[]): UiGroupMember[] {
  return sources.map(source => toUiGroupMember(source))
}
