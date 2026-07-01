import type { GroupEventHandlerMap } from 'easemob-websdk'
import type { RootStores } from './types'

/**
 * 创建 GroupManager 事件处理器。
 */
export function createGroupHandlers(stores: RootStores): GroupEventHandlerMap {
  return {
    onGroupInfoChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, {
        groupName: p.groupName,
        description: p.description,
        avatar: p.avatar,
      })
    },
    onMembersJoined: (payload) => {
      const p = payload as any
      stores.group.incrementMemberCount(p.groupId, (p.members as unknown[]).length)
    },
    onMembersExited: (payload) => {
      const p = payload as any
      stores.group.decrementMemberCount(p.groupId, (p.members as unknown[]).length)
    },
    onOwnerChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, {
        owner: typeof p.newOwner === 'string' ? p.newOwner : p.newOwner?.userId || '',
      })
    },
    onAdminAdded: (payload) => {
      const p = payload as any
      // UIKit store 当前没有管理员列表，仅记录日志
      console.info('[UIKit] onAdminAdded:', p)
    },
    onAdminRemoved: (payload) => {
      const p = payload as any
      console.info('[UIKit] onAdminRemoved:', p)
    },
    onUserRemoved: (payload) => {
      const p = payload as any
      if (p.userId === stores.client.currentUser) {
        stores.group.removeGroup(p.groupId)
      }
    },
    onGroupDestroyed: (payload) => {
      const p = payload as any
      stores.group.removeGroup(p.groupId)
    },
    onAnnouncementChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, { announcement: p.announcement })
    },
    onMuteListAdded: (payload) => {
      const p = payload as any
      stores.group.setMuted(p.groupId, p.members, true)
    },
    onMuteListRemoved: (payload) => {
      const p = payload as any
      stores.group.setMuted(p.groupId, p.members, false)
    },
    onAllMemberMuteStateChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, { mute: p.allMuted })
    },
  }
}
