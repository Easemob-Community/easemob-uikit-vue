import { computed, ref } from 'vue'
import type { UiGroup, UiGroupMember } from '../sdk/types'
import { useUIKit } from './use-uikit'

export function useGroup() {
  const { domains, stores, dataSource } = useUIKit()
  const groupStore = stores.group

  const groupList = computed(() => groupStore.groupList)
  const currentGroup = computed(() => groupStore.currentGroup)
  const loaded = computed(() => groupStore.loaded)
  const joinedGroupCount = computed(() => groupStore.joinedGroupCount)

  // ===== UI 交互状态 =====
  const filterText = computed(() => groupStore.filterText)
  const activeId = computed(() => groupStore.activeId)
  const selectedIds = computed(() => groupStore.selectedIds)
  const hasMore = computed(() => groupStore.hasMore)

  const loading = ref(false)

  function setFilterText(text: string) {
    groupStore.setFilterText(text)
  }

  function setActiveId(id: string) {
    groupStore.setActiveId(id)
  }

  function isSelected(groupId: string): boolean {
    return groupStore.isSelected(groupId)
  }

  function toggleSelect(groupId: string) {
    groupStore.toggleSelect(groupId)
  }

  function setSelectedIds(ids: string[]) {
    groupStore.setSelectedIds(ids)
  }

  /** 同步本地已加入群组 */
  function syncLocalGroups(): UiGroup[] {
    const list = domains.group.syncLocal()
    groupStore.setJoinedGroupCount(list.length)
    return list
  }

  /** 拉取群组列表（优先数据源适配器） */
  async function fetchGroups(params?: { cursor?: string, pageSize?: number }) {
    if (dataSource.fetchGroups) {
      loading.value = true
      try {
        const result = await dataSource.fetchGroups(params || {})
        groupStore.setGroupList(result.list)
        return result
      }
      finally {
        loading.value = false
      }
    }
    const list = syncLocalGroups()
    return { list, cursor: undefined, hasMore: false }
  }

  /** 获取群详情 */
  async function fetchGroupInfo(groupId: string): Promise<UiGroup | undefined> {
    return domains.group.fetchGroupInfo(groupId)
  }

  /** 拉取群成员列表 */
  async function fetchGroupMembers(
    groupId: string,
    cursor?: string,
    pageSize = 20,
  ): Promise<{ members: UiGroupMember[], cursor?: string, hasMore?: boolean }> {
    return domains.group.fetchGroupMembers(groupId, cursor, pageSize)
  }

  /** 拉取群公告 */
  async function fetchGroupAnnouncement(groupId: string): Promise<string> {
    return domains.group.fetchGroupAnnouncement(groupId)
  }

  /** 更新群公告 */
  async function updateGroupAnnouncement(groupId: string, announcement: string) {
    await domains.group.updateGroupAnnouncement(groupId, announcement)
  }

  /** 创建群组 */
  async function createGroup(params: {
    name: string
    description?: string
    memberIds?: string[]
    public?: boolean
    joinApprovalRequired?: boolean
    allowInvites?: boolean
    inviteNeedConfirm?: boolean
    maxMembers?: number
  }) {
    return domains.group.createGroup(params)
  }

  /** 加入群组 */
  async function joinGroup(groupId: string, message?: string) {
    await domains.group.joinGroup(groupId, message)
  }

  /** 离开群组 */
  async function leaveGroup(groupId: string) {
    await domains.group.leaveGroup(groupId)
  }

  /** 解散群组 */
  async function destroyGroup(groupId: string) {
    await domains.group.destroyGroup(groupId)
  }

  /** 转让群主 */
  async function changeGroupOwner(groupId: string, newOwnerId: string) {
    await domains.group.changeGroupOwner(groupId, newOwnerId)
  }

  /** 移除群成员 */
  async function removeGroupMembers(groupId: string, userIds: string[]) {
    await domains.group.removeGroupMembers(groupId, userIds)
  }

  /** 邀请用户入群 */
  async function inviteUsersToGroup(groupId: string, userIds: string[]) {
    await domains.group.inviteUsersToGroup(groupId, userIds)
  }

  /** 获取已缓存的群成员 */
  function getGroupMembers(groupId: string): UiGroupMember[] {
    return groupStore.getGroupMembers(groupId)
  }

  /** 获取已缓存的群公告 */
  function getGroupAnnouncement(groupId: string): string {
    return groupStore.getGroupAnnouncement(groupId)
  }

  /** 刷新群组列表（重新拉取） */
  async function refresh() {
    await fetchGroups()
    groupStore.setJoinedGroupCount(groupStore.groupList.length)
  }

  /**
   * 加载更多群组（分页数据源场景）。
   * SDK 本地已加入群组为全量内存态，无分页；仅在配置了分页数据源时才有更多数据。
   */
  async function loadMore() {
    if (!groupStore.hasMore)
      return
    if (dataSource.fetchGroups) {
      await fetchGroups()
    }
  }

  /** 轻量获取已加入群组总数（不强制拉取完整列表） */
  async function fetchJoinedGroupCount(): Promise<number> {
    const count = groupStore.loaded
      ? groupStore.groupList.length
      : domains.group.syncLocal().length
    groupStore.setJoinedGroupCount(count)
    return count
  }

  return {
    groupList,
    currentGroup,
    loaded,
    joinedGroupCount,
    loading,
    filterText,
    activeId,
    selectedIds,
    hasMore,
    setFilterText,
    setActiveId,
    isSelected,
    toggleSelect,
    setSelectedIds,
    syncLocalGroups,
    fetchGroups,
    fetchGroupInfo,
    fetchGroupMembers,
    fetchGroupAnnouncement,
    updateGroupAnnouncement,
    createGroup,
    joinGroup,
    leaveGroup,
    destroyGroup,
    changeGroupOwner,
    removeGroupMembers,
    inviteUsersToGroup,
    getGroupMembers,
    getGroupAnnouncement,
    refresh,
    loadMore,
    fetchJoinedGroupCount,
  }
}
