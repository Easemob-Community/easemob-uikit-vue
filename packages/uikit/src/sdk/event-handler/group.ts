import type { EventPayloadMap } from 'easemob-websdk'
import type { RootStores } from './index'

/**
 * 创建群组事件处理器
 *
 * @see SDK_DEFICIENCY: 群组事件 payload 中多数字段类型为 UserInfo，
 * UIKit 当前仅处理 userId 字符串，存在类型不完全匹配。
 * 函数体内使用显式 cast 访问运行时字段以弥补 SDK 类型声明的不足。
 */
export function createGroupHandler(stores: RootStores) {
  const handler = {
    onGroupInfoChanged: (payload: EventPayloadMap['onGroupInfoChanged']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.updateGroup(p.groupId, {
        groupName: p.groupName,
        description: p.description,
        avatar: p.avatar,
      })
    },
    onMembersJoined: (payload: EventPayloadMap['onMembersJoined']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.incrementMemberCount(p.groupId, (p.members as unknown[]).length)
    },
    onMembersExited: (payload: EventPayloadMap['onMembersExited']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.decrementMemberCount(p.groupId, (p.members as unknown[]).length)
    },
    onOwnerChanged: (payload: EventPayloadMap['onOwnerChanged']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.updateGroup(p.groupId, { owner: typeof p.newOwner === 'string' ? p.newOwner : p.newOwner?.userId || '' })
    },
    onAdminAdded: (payload: EventPayloadMap['onAdminAdded']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.markAdmin(p.groupId, typeof p.admin === 'string' ? p.admin : p.admin?.userId || '')
    },
    onAdminRemoved: (payload: EventPayloadMap['onAdminRemoved']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.unmarkAdmin(p.groupId, typeof p.admin === 'string' ? p.admin : p.admin?.userId || '')
    },
    onUserRemoved: (payload: EventPayloadMap['onUserRemoved']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      const currentUser = stores.client.currentUser
      if (p.userId === currentUser) {
        stores.group.removeGroup(p.groupId)
      }
    },
    onGroupDestroyed: (payload: EventPayloadMap['onGroupDestroyed']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.removeGroup(p.groupId)
    },
    onAnnouncementChanged: (payload: EventPayloadMap['onAnnouncementChanged']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.updateGroup(p.groupId, { announcement: p.announcement })
    },
    onMuteListAdded: (payload: EventPayloadMap['onMuteListAdded']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.setMuted(p.groupId, p.members, true)
    },
    onMuteListRemoved: (payload: EventPayloadMap['onMuteListRemoved']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.setMuted(p.groupId, p.members, false)
    },
    onAllMemberMuteStateChanged: (payload: EventPayloadMap['onAllMemberMuteStateChanged']) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload as any
      stores.group.updateGroup(p.groupId, { mute: p.allMuted })
    },
  }

  return handler
}
