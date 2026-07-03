import type { GroupEventHandlerMap, GroupInvitationReceivedEventPayload, GroupInvitationAcceptedEventPayload, GroupInvitationDeclinedEventPayload, GroupAutoAcceptInvitationEventPayload, GroupMembersJoinedEventPayload } from 'easemob-websdk'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'

function toUiGroupInvite(payload: GroupInvitationReceivedEventPayload | GroupAutoAcceptInvitationEventPayload, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  const groupId = payload.groupId
  const inviter = 'inviter' in payload ? payload.inviter : undefined
  const groupName = 'groupName' in payload ? payload.groupName : undefined
  return {
    id: groupId,
    type: 'group',
    groupId,
    groupName,
    inviterId: inviter?.userId,
    inviterName: inviter?.nickname,
    reason: 'reason' in payload ? payload.reason : undefined,
    status,
    timestamp: Date.now(),
  }
}

/** 创建 GroupManager 事件处理器。 */
export function createGroupHandlers(stores: RootStores): GroupEventHandlerMap {
  function isJoinedGroup(groupId: string): boolean {
    return stores.group.groupList.some(g => g.groupId === groupId)
  }

  return {
    onInvitationReceived: (payload) => {
      const invite = toUiGroupInvite(payload, isJoinedGroup(payload.groupId) ? 'accepted' : 'pending')
      stores.contact.addInvite(invite)
    },
    onInvitationAccepted: (payload) => {
      stores.contact.updateInviteStatus(payload.groupId, 'accepted')
    },
    onInvitationDeclined: (payload) => {
      stores.contact.updateInviteStatus(payload.groupId, 'declined')
    },
    onAutoAcceptInvitationFromGroup: (payload) => {
      stores.contact.addInvite(toUiGroupInvite(payload, 'accepted'))
    },
    onMembersJoined: (payload: GroupMembersJoinedEventPayload) => {
      const members = payload.members || []
      const currentUser = stores.client.currentUser
      const isSelfJoining = members.some((m: any) => (typeof m === 'string' ? m : m?.userId) === currentUser)
      if (isSelfJoining) {
        if (stores.contact.getInvite(payload.groupId)) {
          stores.contact.updateInviteStatus(payload.groupId, 'accepted')
        }
        if (!stores.group.getGroupById(payload.groupId)) {
          stores.group.addGroup({ groupId: payload.groupId, groupName: (payload as any).groupName })
        }
      }
      stores.group.incrementMemberCount(payload.groupId, members.length)
    },
    onMembersExited: (payload) => {
      const p = payload as any
      stores.group.decrementMemberCount(p.groupId, (p.members as unknown[]).length)
    },
    onGroupInfoChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, {
        groupName: p.groupName,
        description: p.description,
        avatar: p.avatar,
      })
    },
    onOwnerChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, {
        owner: typeof p.newOwner === 'string' ? p.newOwner : p.newOwner?.userId || '',
      })
    },
    onAdminAdded: () => {
      // UIKit store 当前没有管理员列表，暂不处理该事件
    },
    onAdminRemoved: () => {
      // UIKit store 当前没有管理员列表，暂不处理该事件
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
