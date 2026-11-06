import type {
  UiGroup,
  UiGroupMember,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef } from './types'

/** 创建群组 store */
export function createGroupStore(handlersRef: HandlersRef): EventStores['group'] {
  let groupList: UiGroup[] = []
  const members = new Map<string, UiGroupMember[]>()
  const announcements = new Map<string, string>()
  const muteList = new Map<string, UiGroupMember[]>()
  const blocklist = new Map<string, UiGroupMember[]>()
  const allowlist = new Map<string, UiGroupMember[]>()
  const sharedFiles = new Map<string, any[]>()
  const joinRequests = new Map<string, any[]>()
  const adminSynced = new Set<string>()
  const loaded = false

  function emitChange() {
    handlersRef()?.onGroupChange?.(groupList)
  }

  return {
    get groupList() {
      return groupList
    },
    get loaded() {
      return loaded
    },

    setList(list) {
      groupList = list
      emitChange()
    },

    addGroup(group) {
      const idx = groupList.findIndex(g => g.groupId === group.groupId)
      if (idx >= 0)
        groupList[idx] = { ...groupList[idx], ...group }
      else
        groupList.push(group)
      emitChange()
      handlersRef()?.onGroupUpdated?.(group)
    },

    removeGroup(groupId) {
      const removed = groupList.find(g => g.groupId === groupId)
      groupList = groupList.filter(g => g.groupId !== groupId)
      if (removed) {
        emitChange()
        handlersRef()?.onGroupUpdated?.(removed)
      }
    },

    updateGroup(groupId, patch) {
      const idx = groupList.findIndex(g => g.groupId === groupId)
      if (idx < 0)
        return
      groupList[idx] = { ...groupList[idx], ...patch }
      emitChange()
      handlersRef()?.onGroupUpdated?.(groupList[idx])
    },

    setGroupMembers(groupId, list) {
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    appendGroupMembers(groupId, list) {
      const existing = members.get(groupId) ?? []
      const map = new Map(existing.map(m => [m.userId, m]))
      for (const m of list)
        map.set(m.userId, m)
      const merged = Array.from(map.values())
      members.set(groupId, merged)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: merged })
    },

    removeGroupMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      const list = (members.get(groupId) ?? []).filter(m => !idSet.has(m.userId))
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    updateGroupMemberRole(groupId, userId, role) {
      const list = members.get(groupId) ?? []
      const idx = list.findIndex(m => m.userId === userId)
      if (idx < 0)
        return
      list[idx] = { ...list[idx], role }
      members.set(groupId, list)
      handlersRef()?.onGroupMembersChanged?.({ groupId, members: list })
    },

    setGroupAnnouncement(groupId, announcement) {
      announcements.set(groupId, announcement)
      handlersRef()?.onGroupAnnouncementChanged?.({ groupId, announcement })
    },

    isGroupAdminSynced(groupId) {
      return adminSynced.has(groupId)
    },

    markGroupAdminSynced(groupId) {
      adminSynced.add(groupId)
    },

    setGroupMuteList(groupId, list) {
      muteList.set(groupId, list)
    },

    addGroupMuteMembers(groupId, entries) {
      const existing = muteList.get(groupId) ?? []
      const userIds: string[] = Array.isArray(entries) && entries.length > 0 && typeof entries[0] === 'string'
        ? entries as string[]
        : (entries as Array<{ userId: string }>).map(e => e.userId)
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      muteList.set(groupId, existing)
    },

    removeGroupMuteMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      muteList.set(groupId, (muteList.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupBlocklist(groupId, list) {
      blocklist.set(groupId, list)
    },

    addGroupBlocklistMembers(groupId, userIds) {
      const existing = blocklist.get(groupId) ?? []
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      blocklist.set(groupId, existing)
    },

    removeGroupBlocklistMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      blocklist.set(groupId, (blocklist.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupAllowlist(groupId, list) {
      allowlist.set(groupId, list)
    },

    addGroupAllowlistMembers(groupId, userIds) {
      const existing = allowlist.get(groupId) ?? []
      for (const userId of userIds) {
        if (!existing.some(m => m.userId === userId))
          existing.push({ userId })
      }
      allowlist.set(groupId, existing)
    },

    removeGroupAllowlistMembers(groupId, userIds) {
      const idSet = new Set(userIds)
      allowlist.set(groupId, (allowlist.get(groupId) ?? []).filter(m => !idSet.has(m.userId)))
    },

    setGroupList(list) {
      this.setList(list)
    },

    getGroupById(groupId) {
      return groupList.find(g => g.groupId === groupId)
    },

    incrementMemberCount(groupId, delta) {
      const g = this.getGroupById(groupId)
      if (g)
        this.updateGroup(groupId, { memberCount: (g.memberCount ?? 0) + delta })
    },

    decrementMemberCount(groupId, delta) {
      const g = this.getGroupById(groupId)
      if (g)
        this.updateGroup(groupId, { memberCount: Math.max(0, (g.memberCount ?? 0) - delta) })
    },

    addGroupSharedFile(groupId, file) {
      const existing = sharedFiles.get(groupId) ?? []
      existing.push(file)
      sharedFiles.set(groupId, existing)
    },

    removeGroupSharedFile(groupId, fileId) {
      sharedFiles.set(groupId, (sharedFiles.get(groupId) ?? []).filter(f => f.fileId !== fileId))
    },

    getGroupJoinRequests(groupId) {
      return joinRequests.get(groupId) ?? []
    },

    setGroupJoinRequests(groupId, requests) {
      joinRequests.set(groupId, requests)
    },

    updateGroupJoinRequest(groupId, userId, status) {
      const list = joinRequests.get(groupId) ?? []
      const req = list.find(
        (r: any) => r.applicantId === userId || r.applicant?.userId === userId,
      )
      if (req)
        req.status = status
    },
  }
}
