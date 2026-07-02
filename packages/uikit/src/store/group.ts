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

  function setMuted(_groupId: string, _userIds: string[], _muted: boolean) {
    // UIKit Group 类型不含禁言列表，当前仅占位
  }

  // ===== 群成员/公告缓存 =====
  function setGroupMembers(groupId: string, members: UiGroupMember[]) {
    groupMembersMap.value[groupId] = members
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
    setFilterText,
    setActiveId,
    isSelected,
    toggleSelect,
    setSelectedIds,
    setHasMore,
    clearGroups,
  }
})
