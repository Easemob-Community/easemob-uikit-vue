import type { GroupMemberEntry, SdkGroupSource, UiGroup, UiGroupMember } from '../types'

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
    role: source.role,
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

/** 将 SDK 群成员条目转换为 UIKit 群成员展示类型 */
export function toUiGroupMember(source: GroupMemberEntry): UiGroupMember {
  const user = source.user
  const member: UiGroupMember = {
    userId: user.userId,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: source.role,
  }

  // 0.14.192+ 服务端未返回加入时间时 SDK 不再输出该字段
  if ('joinedAt' in source) {
    member.joinedAt = source.joinedAt
  }

  return member
}

/** 批量转换 SDK 群成员 */
export function toUiGroupMembers(sources: readonly GroupMemberEntry[]): UiGroupMember[] {
  return sources.map(source => toUiGroupMember(source))
}
