import type { GroupRepository } from '@easemob-community/uikit-sdk-contract'
import type { GroupDomain } from '../../domain/group-domain'

export function createGroupRepository(domain: GroupDomain): GroupRepository {
  const groupDomain = domain
  return {
    // 经 domain.fetchGroups 读取：注入 group.fetchGroups 时由 domain 委托覆盖
    fetchGroups: async (cursor, pageSize) => groupDomain.fetchGroups(cursor, pageSize),

    fetchGroupInfo: async groupId => groupDomain.fetchGroupInfo(groupId),

    createGroup: async params => groupDomain.createGroup(params),

    joinGroup: async (groupId, message) => {
      await groupDomain.joinGroup(groupId, message)
    },

    leaveGroup: async (groupId) => {
      await groupDomain.leaveGroup(groupId)
    },

    destroyGroup: async (groupId) => {
      await groupDomain.destroyGroup(groupId)
    },

    fetchGroupMembers: async (groupId, cursor, pageSize) => {
      return groupDomain.fetchGroupMembers(groupId, cursor, pageSize)
    },

    removeGroupMembers: async (groupId, userIds) => {
      await groupDomain.removeGroupMembers(groupId, userIds)
    },

    inviteUsersToGroup: async (groupId, userIds) => {
      await groupDomain.inviteUsersToGroup(groupId, userIds)
    },

    addGroupAdmin: async (groupId, userId) => {
      await groupDomain.addGroupAdmin(groupId, userId)
    },

    removeGroupAdmin: async (groupId, userId) => {
      await groupDomain.removeGroupAdmin(groupId, userId)
    },

    changeGroupOwner: async (groupId, newOwnerId) => {
      await groupDomain.changeGroupOwner(groupId, newOwnerId)
    },

    updateGroupInfo: async (groupId, input) => {
      await groupDomain.updateGroupInfo(groupId, input)
    },

    updateGroupConfigs: async (groupId, input) => {
      await groupDomain.updateGroupConfigs(groupId, input)
    },

    muteAllGroupMembers: async (groupId) => {
      await groupDomain.muteAllGroupMembers(groupId)
    },

    unmuteAllGroupMembers: async (groupId) => {
      await groupDomain.unmuteAllGroupMembers(groupId)
    },

    muteGroupMembers: async (groupId, userIds, muteDuration) => {
      await groupDomain.muteGroupMembers(groupId, userIds, muteDuration)
    },

    unmuteGroupMembers: async (groupId, userIds) => {
      await groupDomain.unmuteGroupMembers(groupId, userIds)
    },

    updateGroupAnnouncement: async (groupId, announcement) => {
      await groupDomain.updateGroupAnnouncement(groupId, announcement)
    },

    acceptGroupInvitation: async (groupId) => {
      await groupDomain.acceptGroupInvitation(groupId)
    },

    declineGroupInvitation: async (groupId) => {
      await groupDomain.declineGroupInvitation(groupId)
    },

    acceptGroupJoinRequest: async (groupId, userId) => {
      await groupDomain.acceptGroupJoinRequest(groupId, userId)
    },

    rejectGroupJoinRequest: async (groupId, userId, reason) => {
      await groupDomain.rejectGroupJoinRequest(groupId, userId, reason)
    },
  }
}
