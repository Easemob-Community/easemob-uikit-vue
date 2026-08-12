import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo as SdkUserInfo } from 'easemob-websdk'
import { GROUP_MEMBER_ROLE } from '../constants'
import type { UiGroup, UiGroupMember } from '../sdk/types'

/** 入群申请记录：申请人 ID 扁平化为 applicantId，作为状态更新的匹配键 */
export interface UiGroupJoinRequest {
  groupId?: string
  groupName?: string
  applicantId?: string
  applicant?: SdkUserInfo
  reason?: string
  status?: 'pending' | 'accepted' | 'declined'
  timestamp?: number
}

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
  /** 群公告缓存：groupId -> announcement；未获取时为 undefined，空字符串表示已获取但公告为空 */
  const groupAnnouncementMap = ref<Record<string, string | undefined>>({})
  /** 已同步过管理员列表的群 ID 集合，避免切换会话时重复拉取 */
  const groupAdminSyncedIds = ref<Set<string>>(new Set())

  /** 群成员禁言列表缓存：groupId -> members */
  const groupMuteListMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群黑名单缓存：groupId -> members */
  const groupBlocklistMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群白名单缓存：groupId -> members */
  const groupAllowlistMap = ref<Record<string, UiGroupMember[]>>({})
  /** 群共享文件缓存：groupId -> files */
  const groupSharedFilesMap = ref<Record<string, any[]>>({})
  /** 入群申请列表缓存：groupId -> requests */
  const groupJoinRequestsMap = ref<Record<string, UiGroupJoinRequest[]>>({})

  // ===== UI 交互状态 =====
  const filterText = ref('')
  const activeId = ref('')
  const selectedIds = ref<Set<string>>(new Set())
  const hasMore = ref(false)
  /** 分页数据源的下一页游标（无分页能力时为 undefined） */
  const cursor = ref<string | undefined>(undefined)

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
    // 不可变更新：替换数组引用，保证依赖 ref 身份/浅比较的 computed 与 watch 正确触发
    groupList.value = groupList.value.map(item =>
      item.groupId === groupId ? { ...item, ...patch } : item,
    )
  }

  function incrementMemberCount(groupId: string, delta: number) {
    groupList.value = groupList.value.map(item =>
      item.groupId === groupId
        ? { ...item, memberCount: Math.max(0, (item.memberCount || 0) + delta) }
        : item,
    )
  }

  function decrementMemberCount(groupId: string, delta: number) {
    groupList.value = groupList.value.map(item =>
      item.groupId === groupId
        ? { ...item, memberCount: Math.max(0, (item.memberCount || 0) - delta) }
        : item,
    )
  }

  function isGroupAdminSynced(groupId: string): boolean {
    return groupAdminSyncedIds.value.has(groupId)
  }

  function markGroupAdminSynced(groupId: string) {
    groupAdminSyncedIds.value = new Set([...groupAdminSyncedIds.value, groupId])
  }

  function clearGroupAdminSynced(groupId?: string) {
    if (groupId) {
      const next = new Set(groupAdminSyncedIds.value)
      next.delete(groupId)
      groupAdminSyncedIds.value = next
    }
    else {
      groupAdminSyncedIds.value = new Set()
    }
  }

  /** 成员级禁言状态更新：同步更新 groupMuteListMap */
  function setMuted(groupId: string, userIds: string[], muted: boolean) {
    const list = groupMuteListMap.value[groupId] || []
    if (muted) {
      // 添加禁言成员（去重）
      const existingIds = new Set(list.map(m => m.userId))
      const newMembers = userIds
        .filter(id => !existingIds.has(id))
        .map(id => ({ userId: id, role: GROUP_MEMBER_ROLE.MEMBER }))
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

  function addGroupMuteMembers(groupId: string, entries: string[] | Array<{ userId: string, muteExpire?: number, muteDuration?: number }>) {
    const list = groupMuteListMap.value[groupId] || []
    const existingIds = new Set(list.map(m => m.userId))
    const normalized = entries.map((item) => {
      if (typeof item === 'string')
        return { userId: item, role: GROUP_MEMBER_ROLE.MEMBER }
      return { userId: item.userId, role: GROUP_MEMBER_ROLE.MEMBER, muteExpire: item.muteExpire, muteDuration: item.muteDuration }
    })
    const newMembers = normalized.filter(m => !existingIds.has(m.userId))
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
      .map(id => ({ userId: id, role: GROUP_MEMBER_ROLE.MEMBER }))
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
      .map(id => ({ userId: id, role: GROUP_MEMBER_ROLE.MEMBER }))
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
  function setGroupJoinRequests(groupId: string, requests: UiGroupJoinRequest[]) {
    groupJoinRequestsMap.value[groupId] = requests
  }

  function updateGroupJoinRequest(groupId: string, userId: string, status: UiGroupJoinRequest['status']) {
    const list = groupJoinRequestsMap.value[groupId] || []
    // 匹配键以扁平化的 applicantId 为准；applicant?.userId 兜底兼容旧记录
    // 不可变更新：替换 map 与数组引用，保证 computed/watch 正确触发
    groupJoinRequestsMap.value = {
      ...groupJoinRequestsMap.value,
      [groupId]: list.map(r =>
        (r.applicantId === userId || r.applicant?.userId === userId) ? { ...r, status } : r,
      ),
    }
  }

  function getGroupJoinRequests(groupId: string): UiGroupJoinRequest[] {
    return groupJoinRequestsMap.value[groupId] || []
  }

  // ===== 群成员/公告缓存 =====
  function setGroupMembers(groupId: string, members: UiGroupMember[]) {
    const existing = groupMembersMap.value[groupId] || []
    const existingRoles = new Map(existing.map(m => [m.userId, m.role]))
    groupMembersMap.value[groupId] = members.map((m) => {
      const existingRole = existingRoles.get(m.userId)
      // 保留已缓存的 admin/owner 角色，避免服务端延迟同步导致角色闪回
      if (existingRole && (existingRole === GROUP_MEMBER_ROLE.ADMIN || existingRole === GROUP_MEMBER_ROLE.OWNER) && m.role === GROUP_MEMBER_ROLE.MEMBER) {
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
    // 不可变更新：替换 map 与数组引用，保证 computed/watch 正确触发
    groupMembersMap.value = {
      ...groupMembersMap.value,
      [groupId]: list.map(m => (m.userId === userId ? { ...m, role } : m)),
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

  function getGroupAnnouncement(groupId: string): string | undefined {
    return groupAnnouncementMap.value[groupId]
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

  function setCursor(value: string | undefined) {
    cursor.value = value
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
    cursor.value = undefined
    groupMembersMap.value = {}
    groupAnnouncementMap.value = {}
    groupAdminSyncedIds.value = new Set()
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
    cursor,
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
    isGroupAdminSynced,
    markGroupAdminSynced,
    clearGroupAdminSynced,
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
    setCursor,
    clearGroups,
  }
})
