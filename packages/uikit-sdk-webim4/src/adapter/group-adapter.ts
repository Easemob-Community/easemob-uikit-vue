import type { EasemobChat } from 'easemob-websdk'
import type { UiGroup, UiGroupMember } from '@easemob/uikit-sdk-contract'
import { createLogger } from '@easemob/uikit-sdk-contract'

const groupAdapterLog = createLogger('UIKit:Webim4GroupAdapter')

/** 4.x 群组对象联合：已加入列表项（BaseGroupInfo/GroupInfo）与群详情（GroupDetailInfo） */
type SdkGroupSource =
  | EasemobChat.BaseGroupInfo
  | EasemobChat.GroupInfo
  | EasemobChat.GroupDetailInfo

/**
 * 将 4.x 群组摘要/详情转换为 UIKit 群组展示类型。
 *
 * 4.x 字段命名不统一（已核对 4.24.2 类型）：
 * - `getJoinedGroups`：`BaseGroupInfo{groupid, groupname}` 或带 `needRole/needAffiliations` 的
 *   `GroupInfo{groupId, groupName, role, affiliationsCount, ...}`（camelCase）；
 * - `getGroupInfo`：`GroupDetailInfo{id, name, affiliations_count, maxusers, membersonly, ...}`（下划线风格）。
 */
export function toUiGroup(source: SdkGroupSource): UiGroup {
  // GroupDetailInfo（getGroupInfo 返回，下划线风格字段）：
  // 以 `id`（另两种形状分别为 groupid/groupId，均无 `id`）或详情专属字段判别，
  // 避免私有化服务裁剪字段时静默落到 BaseGroupInfo 分支产出空 groupName
  if ('affiliations_count' in source || 'maxusers' in source || 'id' in source) {
    const detail = source as EasemobChat.GroupDetailInfo
    return {
      groupId: detail.id,
      groupName: detail.name,
      description: detail.description,
      owner: detail.owner,
      memberCount: detail.affiliations_count,
      maxUsers: detail.maxusers,
      public: detail.public,
      allowInvites: detail.allowinvites,
      approval: detail.membersonly,
      mute: detail.mute,
      // 注意：4.x GroupDetailInfo 无 disabled 字段（已核对 4.24.2 类型），群禁用状态只能由事件增量维护
      shieldgroup: detail.shieldgroup,
      avatar: detail.avatar,
      created: detail.created,
    }
  }

  // GroupInfo（getJoinedGroups + needRole/needAffiliations，camelCase 字段）
  if ('groupId' in source) {
    const info = source as EasemobChat.GroupInfo
    const group: UiGroup = {
      groupId: info.groupId,
      groupName: info.groupName,
      description: info.description,
      memberCount: info.affiliationsCount,
      maxUsers: info.maxUsers,
      public: info.public,
      allowInvites: info.allowInvites,
      approval: info.approval,
      disabled: info.disabled,
    }
    // 角色仅在有值时写入，避免覆盖本地已缓存的角色
    if (info.role) {
      group.role = info.role
    }
    return group
  }

  // BaseGroupInfo（getJoinedGroups 默认返回，仅 groupid/groupname）
  const base = source as EasemobChat.BaseGroupInfo
  if (!base.groupid && !base.groupname) {
    // 字段形状与三种已知类型都不匹配：显式告警，不静默产出空群组（请求 200 但 UI 无名的排查入口）
    groupAdapterLog.warn('toUiGroup 无法识别的群组字段形状:', Object.keys(source))
  }
  return {
    groupId: base.groupid,
    groupName: base.groupname,
  }
}

/** 批量转换 4.x 群组 */
export function toUiGroups(sources: readonly SdkGroupSource[]): UiGroup[] {
  return sources.map(source => toUiGroup(source))
}

/** 将 4.x 群成员（getGroupMembers 返回）转换为 UIKit 群成员展示类型 */
export function toUiGroupMember(source: EasemobChat.FetchedGroupMember): UiGroupMember {
  return {
    userId: source.userId,
    // 4.x wire 角色值与契约 GROUP_MEMBER_ROLE 常量一致（owner/admin/member）
    role: source.role,
    joinedAt: source.joinedTime,
  }
}

/** 批量转换 4.x 群成员 */
export function toUiGroupMembers(
  sources: readonly EasemobChat.FetchedGroupMember[],
): UiGroupMember[] {
  return sources.map(source => toUiGroupMember(source))
}

/** 将裸 userId 列表（黑名单/白名单/管理员接口返回）转换为 UIKit 群成员展示类型 */
export function toUiGroupMembersFromIds(
  userIds: readonly string[],
  role?: UiGroupMember['role'],
): UiGroupMember[] {
  return userIds.filter(Boolean).map(userId => ({ userId, role }))
}

/** 将 4.x 群禁言条目（getGroupMuteList 返回）转换为 UIKit 群成员展示类型 */
export function toUiGroupMuteMembers(
  sources: readonly EasemobChat.GetGroupMuteListResult[],
): UiGroupMember[] {
  return sources.filter(item => !!item?.user).map(item => ({
    userId: item.user,
    // 4.x `expire` 为禁言到期时间戳（毫秒）
    muteExpire: item.expire,
  }))
}
