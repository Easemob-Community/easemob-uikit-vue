import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiGroup, UiGroupMember } from '../sdk/types'

export const useGroupStore = defineStore('group', () => {
  const groupList = ref<UiGroup[]>([])
  const currentGroup = ref<UiGroup | null>(null)
  const loaded = ref(false)
  /** 未加载完整列表时的轻量群数量（仅在 loaded 为 false 时生效）；加载后恒等于列表长度 */
  const explicitJoinedGroupCount = ref(0)
  const joinedGroupCount = computed(() =>
    loaded.value ? groupList.value.length : explicitJoinedGroupCount.value,
  )

  /** 群成员缓存：groupId -> members */
  const groupMembersMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群公告缓存：groupId -> announcement */
  const groupAnnouncementMap = ref<Record<string, string>>({})

  /** 群成员禁言列表缓存：groupId -> members */
  const groupMuteListMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群黑名单缓存：groupId -> members */
  const groupBlocklistMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群白名单缓存：groupId -> members */
  const groupAllowlistMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群共享文件缓存：groupId -> files */
  const groupSharedFilesMap = ref<Record<string, any[]>>({})
  /** 入群申请列表缓存：groupId -> requests */
  const groupJoinRequestsMap = ref<Record<string, any[]>>({})

  // ===== UI 交互状态 =====
  const filterText = ref('')
  const activeId = ref('')
  const selectedIds = ref<Set<string>>(new Set())
  const hasMore = ref(false)

  function setGroupList(list: UiGroup[]) {
    groupList.value = list
    loaded.value = true
  }

  function appendGroupList(list: UiGroup[]) {
    const ids = new Set(groupList.value.map(g => g.groupId))
    for (const g of list) {
      if (!ids.has(g.groupId)) {
        groupList.value.push(g)
        ids.add(g.groupId)
      }
    }
  }

  function addGroup(group: UiGroup) {
    const exists = groupList.value.find(g => g.groupId === group.groupId)
    if (!exists) {
      groupList.value.push(group)
    }
  }

  function removeGroup(groupId: string) {
    groupList.value = groupList.value.filter(g => g.groupId !== groupId)
  }

  function getGroupById(groupId: string): UiGroup | undefined {
    return groupList.value.find(g => g.groupId === groupId)
  }

  function updateGroupMemberCount(groupId: string, count: number) {
    const g = groupList.value.find(item => item.groupId === groupId)
    if (g) {
      g.memberCount = count
    }
    else {
      groupList.value.push({
        groupId,
        groupName: groupId,
        memberCount: count,
      })
    }
  }

  function setCurrentGroup(group: UiGroup | null) {
    currentGroup.value = group
  }

  function setJoinedGroupCount(count: number) {
    explicitJoinedGroupCount.value = count
  }

  function updateGroup(groupId: string, patch: Partial<UiGroup>) {
    const g = groupList.value.find(item => item.groupId === groupId)
    if (g)
      Object.assign(g, patch)
  }

  function incrementMemberCount(groupId: string, delta: number) {
    const g = groupList.value.find(item => item.groupId === groupId)
    if (g)
      g.memberCount = Math.max(0, (g.memberCount || 0) + delta)
  }

  function decrementMemberCount(groupId: string, delta: number) {
    const g = groupList.value.find(item => item.groupId === groupId)
    if (g)
      g.memberCount = Math.max(0, (g.memberCount || 0) - delta)
  }

  /** 成员级禁言状态更新：同步更新 groupMuteListMap */
  function setMuted(groupId: string, userIds: string[], muted: boolean) {
    const list = groupMuteListMap.value[groupId] || []
    if (muted) {
      // 添加禁言成员（去重）
      const existingIds = new Set(list.map(m => m.userId))
      const newMembers = userIds
        .filter(id => !existingIds.has(id))
        .map(id => ({ userId: id, role: 'member' as const }))
      if (newMembers.length > 0) {
        groupMuteListMap.value[groupId] = [...list, ...newMembers]
      }
    }
    else {
      // 移除禁言成员
      const idSet = new Set(userIds)
      groupMuteListMap.value[groupId] = list.filter(m => !idSet.has(m.userId))
    }
  }

  // ===== 禁言列表缓存 =====
  function setGroupMuteList(groupId: string, members: UiGroupMember[]) {
    groupMuteListMap.value[groupId] = members
  }

  function addGroupMuteMembers(groupId: string, userIds: string[]) {
    const list = groupMuteListMap.value[groupId] || []
    const existingIds = new Set(list.map(m => m.userId))
    const newMembers = userIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ userId: id, role: 'member' as const }))
    if (newMembers.length > 0) {
      groupMuteListMap.value[groupId] = [...list, ...newMembers]
    }
  }

  function removeGroupMuteMembers(groupId: string, userIds: string[]) {
    const idSet = new Set(userIds)
    groupMuteListMap.value[groupId] = (groupMuteListMap.value[groupId] || [])
      .filter(m => !idSet.has(m.userId))
  }

  function getGroupMuteList(groupId: string): UiGroupMember[] {
    return groupMuteListMap.value[groupId] || []
  }

  // ===== 黑名单缓存 =====
  function setGroupBlocklist(groupId: string, members: UiGroupMember[]) {
    groupBlocklistMap.value[groupId] = members
  }

  function addGroupBlocklistMembers(groupId: string, userIds: string[]) {
    const list = groupBlocklistMap.value[groupId] || []
    const existingIds = new Set(list.map(m => m.userId))
    const newMembers = userIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ userId: id, role: 'member' as const }))
    if (newMembers.length > 0) {
      groupBlocklistMap.value[groupId] = [...list, ...newMembers]
    }
  }

  function removeGroupBlocklistMembers(groupId: string, userIds: string[]) {
    const idSet = new Set(userIds)
    groupBlocklistMap.value[groupId] = (groupBlocklistMap.value[groupId] || [])
      .filter(m => !idSet.has(m.userId))
  }

  function getGroupBlocklist(groupId: string): UiGroupMember[] {
    return groupBlocklistMap.value[groupId] || []
  }

  // ===== 白名单缓存 =====
  function setGroupAllowlist(groupId: string, members: UiGroupMember[]) {
    groupAllowlistMap.value[groupId] = members
  }

  function addGroupAllowlistMembers(groupId: string, userIds: string[]) {
    const list = groupAllowlistMap.value[groupId] || []
    const existingIds = new Set(list.map(m => m.userId))
    const newMembers = userIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ userId: id, role: 'member' as const }))
    if (newMembers.length > 0) {
      groupAllowlistMap.value[groupId] = [...list, ...newMembers]
    }
  }

  function removeGroupAllowlistMembers(groupId: string, userIds: string[]) {
    const idSet = new Set(userIds)
    groupAllowlistMap.value[groupId] = (groupAllowlistMap.value[groupId] || [])
      .filter(m => !idSet.has(m.userId))
  }

  function getGroupAllowlist(groupId: string): UiGroupMember[] {
    return groupAllowlistMap.value[groupId] || []
  }

  // ===== 共享文件缓存 =====
  function setGroupSharedFiles(groupId: string, files: any[]) {
    groupSharedFilesMap.value[groupId] = files
  }

  function addGroupSharedFile(groupId: string, file: any) {
    const list = groupSharedFilesMap.value[groupId] || []
    groupSharedFilesMap.value[groupId] = [...list, file]
  }

  function removeGroupSharedFile(groupId: string, fileId: string) {
    groupSharedFilesMap.value[groupId] = (groupSharedFilesMap.value[groupId] || [])
      .filter(f => f.fileId !== fileId && f.id !== fileId)
  }

  function getGroupSharedFiles(groupId: string): any[] {
    return groupSharedFilesMap.value[groupId] || []
  }

  // ===== 入群申请缓存 =====
  function setGroupJoinRequests(groupId: string, requests: any[]) {
    groupJoinRequestsMap.value[groupId] = requests
  }

  function updateGroupJoinRequest(groupId: string, userId: string, status: string) {
    const list = groupJoinRequestsMap.value[groupId] || []
    const item = list.find(r => r.userId === userId || r.applicantId === userId)
    if (item) {
      item.status = status
    }
  }

  function getGroupJoinRequests(groupId: string): any[] {
    return groupJoinRequestsMap.value[groupId] || []
  }

  // ===== 群成员/公告缓存 =====
  function setGroupMembers(groupId: string, members: UiGroupMember[]) {
    const existing = groupMembersMap.value[groupId] || []
    const existingRoles = new Map(existing.map(m => [m.userId, m.role]))
    groupMembersMap.value[groupId] = members.map((m) => {
      const existingRole = existingRoles.get(m.userId)
      // 保留已缓存的 admin/owner 角色，避免服务端延迟同步导致角色闪回
      if (existingRole && (existingRole === 'admin' || existingRole === 'owner') && m.role === 'member') {
        return { ...m, role: existingRole }
      }
      return m
    })
  }

  function appendGroupMembers(groupId: string, members: UiGroupMember[]) {
    const existing = groupMembersMap.value[groupId] || []
    const existingIds = new Set(existing.map(m => m.userId))
    const appended = [...existing]
    for (const member of members) {
      if (!existingIds.has(member.userId)) {
        appended.push(member)
        existingIds.add(member.userId)
      }
    }
    groupMembersMap.value[groupId] = appended
  }

  function removeGroupMembers(groupId: string, userIds: string[]) {
    const idSet = new Set(userIds)
    groupMembersMap.value[groupId] = (groupMembersMap.value[groupId] || [])
      .filter(m => !idSet.has(m.userId))
  }

  function updateGroupMemberRole(groupId: string, userId: string, role: UiGroupMember['role']) {
    const list = groupMembersMap.value[groupId] || []
    const member = list.find(m => m.userId === userId)
    if (member) {
      member.role = role
    }
  }

  function getGroupMembers(groupId: string): UiGroupMember[] {
    return groupMembersMap.value[groupId] || []
  }

  function clearGroupMembers(groupId?: string) {
    if (groupId) {
      delete groupMembersMap.value[groupId]
    }
    else {
      groupMembersMap.value = {}
    }
  }

  function setGroupAnnouncement(groupId: string, announcement: string) {
    groupAnnouncementMap.value[groupId] = announcement
  }

  function getGroupAnnouncement(groupId: string): string {
    return groupAnnouncementMap.value[groupId] || ''
  }

  // ===== UI 交互状态操作 =====
  function setFilterText(text: string) {
    filterText.value = text
  }

  function setActiveId(id: string) {
    activeId.value = id
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id))
      next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function setSelectedIds(ids: string[]) {
    selectedIds.value = new Set(ids)
  }

  function setHasMore(value: boolean) {
    hasMore.value = value
  }

  function clearGroups() {
    groupList.value = []
    currentGroup.value = null
    loaded.value = false
    explicitJoinedGroupCount.value = 0
    filterText.value = ''
    activeId.value = ''
    selectedIds.value = new Set()
    hasMore.value = false
    groupMembersMap.value = {}
    groupAnnouncementMap.value = {}
    groupMuteListMap.value = {}
    groupBlocklistMap.value = {}
    groupAllowlistMap.value = {}
    groupSharedFilesMap.value = {}
    groupJoinRequestsMap.value = {}
  }

  // 别名方法：兼容 Domain 层 GroupStoreLike 接口
  const setList = setGroupList

  return {
    groupList,
    currentGroup,
    loaded,
    joinedGroupCount,
    groupMembersMap: computed(() => groupMembersMap.value),
    groupAnnouncementMap: computed(() => groupAnnouncementMap.value),
    groupMuteListMap: computed(() => groupMuteListMap.value),
    groupBlocklistMap: computed(() => groupBlocklistMap.value),
    groupAllowlistMap: computed(() => groupAllowlistMap.value),
    groupSharedFilesMap: computed(() => groupSharedFilesMap.value),
    groupJoinRequestsMap: computed(() => groupJoinRequestsMap.value),
    filterText,
    activeId,
    selectedIds,
    hasMore,
    setGroupList,
    setList,
    appendGroupList,
    addGroup,
    removeGroup,
    getGroupById,
    updateGroupMemberCount,
    setCurrentGroup,
    setJoinedGroupCount,
    updateGroup,
    incrementMemberCount,
    decrementMemberCount,
    setMuted,
    setGroupMembers,
    appendGroupMembers,
    removeGroupMembers,
    updateGroupMemberRole,
    getGroupMembers,
    clearGroupMembers,
    setGroupAnnouncement,
    getGroupAnnouncement,
    setGroupMuteList,
    addGroupMuteMembers,
    removeGroupMuteMembers,
    getGroupMuteList,
    setGroupBlocklist,
    addGroupBlocklistMembers,
    removeGroupBlocklistMembers,
    getGroupBlocklist,
    setGroupAllowlist,
    addGroupAllowlistMembers,
    removeGroupAllowlistMembers,
    getGroupAllowlist,
    setGroupSharedFiles,
    addGroupSharedFile,
    removeGroupSharedFile,
    getGroupSharedFiles,
    setGroupJoinRequests,
    updateGroupJoinRequest,
    getGroupJoinRequests,
    setFilterText,
    setActiveId,
    isSelected,
    toggleSelect,
    setSelectedIds,
    setHasMore,
    clearGroups,
  }
})
