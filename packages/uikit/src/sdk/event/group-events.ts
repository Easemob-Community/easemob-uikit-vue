import type { GroupAllowListAddedEventPayload, GroupAllowListRemovedEventPayload, GroupAutoAcceptInvitationEventPayload, GroupEventHandlerMap, GroupInvitationAcceptedEventPayload, GroupInvitationDeclinedEventPayload, GroupInvitationReceivedEventPayload, GroupMembersJoinedEventPayload, GroupMuteListAddedEventPayload, GroupMuteListRemovedEventPayload, GroupRequestToJoinAcceptedEventPayload, GroupRequestToJoinDeclinedEventPayload, GroupRequestToJoinReceivedEventPayload, GroupSharedFileAddedEventPayload, GroupSharedFileDeletedEventPayload } from 'easemob-websdk'
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
    onMuteListAdded: (payload: GroupMuteListAddedEventPayload) => {
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.addGroupMuteMembers(payload.groupId, userIds)
    },
    onMuteListRemoved: (payload: GroupMuteListRemovedEventPayload) => {
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.removeGroupMuteMembers(payload.groupId, userIds)
    },
    onAllMemberMuteStateChanged: (payload) => {
      const p = payload as any
      stores.group.updateGroup(p.groupId, { mute: p.isMuted })
    },
    onAllowListAdded: (payload: GroupAllowListAddedEventPayload) => {
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.addGroupAllowlistMembers(payload.groupId, userIds)
    },
    onAllowListRemoved: (payload: GroupAllowListRemovedEventPayload) => {
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.removeGroupAllowlistMembers(payload.groupId, userIds)
    },
    onSharedFileAdded: (payload: GroupSharedFileAddedEventPayload) => {
      if (payload.sharedFile) {
        stores.group.addGroupSharedFile(payload.groupId, payload.sharedFile)
      }
    },
    onSharedFileDeleted: (payload: GroupSharedFileDeletedEventPayload) => {
      stores.group.removeGroupSharedFile(payload.groupId, payload.fileId)
    },
    onRequestToJoinReceived: (payload: GroupRequestToJoinReceivedEventPayload) => {
      const list = stores.group.getGroupJoinRequests(payload.groupId)
      stores.group.setGroupJoinRequests(payload.groupId, [
        ...list,
        {
          groupId: payload.groupId,
          groupName: payload.groupName,
          applicant: payload.applicant,
          reason: payload.reason,
          status: 'pending',
          timestamp: Date.now(),
        },
      ])
    },
    onRequestToJoinAccepted: (payload: GroupRequestToJoinAcceptedEventPayload) => {
      // 入群申请被同意后，移除对应申请记录
      const list = stores.group.getGroupJoinRequests(payload.groupId)
        .filter((r: any) => r.applicant?.userId !== payload.accepter?.userId)
      stores.group.setGroupJoinRequests(payload.groupId, list)
    },
    onRequestToJoinDeclined: (payload: GroupRequestToJoinDeclinedEventPayload) => {
      stores.group.updateGroupJoinRequest(
        payload.groupId,
        payload.applicant?.userId || '',
        'declined',
      )
    },
  }
}
