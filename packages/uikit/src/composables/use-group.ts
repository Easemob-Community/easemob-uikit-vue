import { computed, ref } from 'vue'
import { CONVERSATION_TYPE } from '../constants'
import type { CreateGroupParams, UiGroup, UiGroupMember } from '../sdk/types'
import { useLocale } from '../locale'
import { insertChatNotice } from '../sdk/event/notice-utils'
import { useUIKit } from './use-uikit'

export function useGroup() {
  const { domains, stores, dataSource } = useUIKit()
  const { t } = useLocale()
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
        // 带 cursor 视为分页追加，否则为首屏/刷新整体替换
        if (params?.cursor) {
          groupStore.appendGroupList(result.list)
        }
        else {
          groupStore.setGroupList(result.list)
        }
        // 分页元数据落 store，供 loadMore 判断是否继续加载及传游标
        groupStore.setHasMore(result.hasMore ?? false)
        groupStore.setCursor(result.cursor)
        return result
      }
      finally {
        loading.value = false
      }
    }
    // 默认走 SDK 本地内存（全量内存态，无分页，hasMore 保持 false）
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

  /** 创建群组（优先数据源适配器接管，回落 SDK 默认实现） */
  async function createGroup(params: CreateGroupParams) {
    const result = dataSource.createGroup
      ? await dataSource.createGroup(params)
      : await domains.group.createGroup(params)
    // 创建成功后在本设备群聊插入“群聊已创建”本地通知
    insertChatNotice(stores, result.groupId, CONVERSATION_TYPE.GROUPCHAT, t('chat.notice.groupCreated'))
    return result
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

  /** 设置群管理员 */
  async function addGroupAdmin(groupId: string, userId: string) {
    await domains.group.addGroupAdmin(groupId, userId)
  }

  /** 取消群管理员 */
  async function removeGroupAdmin(groupId: string, userId: string) {
    await domains.group.removeGroupAdmin(groupId, userId)
  }

  /** 接受群邀请 */
  async function acceptGroupInvitation(groupId: string) {
    await domains.group.acceptGroupInvitation(groupId)
  }

  /** 拒绝群邀请 */
  async function declineGroupInvitation(groupId: string) {
    await domains.group.declineGroupInvitation(groupId)
  }

  /** 获取已缓存的群成员 */
  function getGroupMembers(groupId: string): UiGroupMember[] {
    return groupStore.getGroupMembers(groupId)
  }

  /** 获取已缓存的群公告；未获取过返回 undefined，已获取但为空返回 '' */
  function getGroupAnnouncement(groupId: string): string | undefined {
    return groupStore.getGroupAnnouncement(groupId)
  }

  /** 更新群基础资料 */
  async function updateGroupInfo(
    groupId: string,
    input: { name?: string, description?: string, avatar?: string, ext?: string },
  ) {
    await domains.group.updateGroupInfo(groupId, input)
  }

  /** 更新群配置 */
  async function updateGroupConfigs(
    groupId: string,
    input: {
      public?: boolean
      joinApprovalRequired?: boolean
      allowInvites?: boolean
      inviteNeedConfirm?: boolean
      maxMembers?: number
    },
  ) {
    await domains.group.updateGroupConfigs(groupId, input)
  }

  /** 开启全员禁言 */
  async function muteAllGroupMembers(groupId: string) {
    await domains.group.muteAllGroupMembers(groupId)
  }

  /** 关闭全员禁言 */
  async function unmuteAllGroupMembers(groupId: string) {
    await domains.group.unmuteAllGroupMembers(groupId)
  }

  /**
   * 禁言指定成员。
   * @param muteDuration 禁言时长，单位为毫秒；传 -1 表示永久禁言（SDK 5.0.0+ 语义）。
   */
  async function muteGroupMembers(groupId: string, userIds: string[], muteDuration: number) {
    await domains.group.muteGroupMembers(groupId, userIds, muteDuration)
  }

  /** 解除指定成员禁言 */
  async function unmuteGroupMembers(groupId: string, userIds: string[]) {
    await domains.group.unmuteGroupMembers(groupId, userIds)
  }

  /** 获取群禁言列表 */
  async function getGroupMuteList(groupId: string, pageNum?: number, pageSize?: number) {
    return domains.group.getGroupMuteList(groupId, pageNum, pageSize)
  }

  /** 获取群黑名单 */
  async function getGroupBlocklist(groupId: string, pageNum?: number, pageSize?: number) {
    return domains.group.getGroupBlocklist(groupId, pageNum, pageSize)
  }

  /** 将成员加入群黑名单 */
  async function blockGroupMembers(groupId: string, userIds: string[]) {
    await domains.group.blockGroupMembers(groupId, userIds)
  }

  /** 将成员移出群黑名单 */
  async function unblockGroupMembers(groupId: string, userIds: string[]) {
    await domains.group.unblockGroupMembers(groupId, userIds)
  }

  /** 获取群白名单 */
  async function getGroupAllowlist(groupId: string) {
    return domains.group.getGroupAllowlist(groupId)
  }

  /** 将成员加入群白名单 */
  async function addUsersToGroupAllowlist(groupId: string, userIds: string[]) {
    await domains.group.addUsersToGroupAllowlist(groupId, userIds)
  }

  /** 将成员移出群白名单 */
  async function removeUsersFromGroupAllowlist(groupId: string, userIds: string[]) {
    await domains.group.removeUsersFromGroupAllowlist(groupId, userIds)
  }

  /** 检查当前用户是否在群白名单中 */
  async function checkIfInGroupAllowList(groupId: string) {
    return domains.group.checkIfInGroupAllowList(groupId)
  }

  /** 检查当前用户是否在群禁言列表中 */
  async function checkIfInGroupMuteList(groupId: string) {
    return domains.group.checkIfInGroupMuteList(groupId)
  }

  /** 获取群共享文件列表 */
  async function getGroupSharedFileList(groupId: string, pageNum?: number, pageSize?: number) {
    return domains.group.getGroupSharedFileList(groupId, pageNum, pageSize)
  }

  /** 上传群共享文件 */
  async function uploadGroupSharedFile(groupId: string, file: File) {
    return domains.group.uploadGroupSharedFile(groupId, file)
  }

  /** 删除群共享文件 */
  async function deleteGroupSharedFile(groupId: string, fileId: string) {
    await domains.group.deleteGroupSharedFile(groupId, fileId)
  }

  /** 下载群共享文件 */
  async function downloadGroupSharedFile(groupId: string, fileId: string) {
    return domains.group.downloadGroupSharedFile(groupId, fileId)
  }

  /** 同意入群申请 */
  async function acceptGroupJoinRequest(groupId: string, userId: string) {
    await domains.group.acceptGroupJoinRequest(groupId, userId)
  }

  /** 拒绝入群申请 */
  async function rejectGroupJoinRequest(groupId: string, userId: string, reason: string) {
    await domains.group.rejectGroupJoinRequest(groupId, userId, reason)
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
      // 携带 store 中的游标请求下一页，fetchGroups 内部走 append 合并
      await fetchGroups({ cursor: groupStore.cursor })
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
    addGroupAdmin,
    removeGroupAdmin,
    acceptGroupInvitation,
    declineGroupInvitation,
    getGroupMembers,
    getGroupAnnouncement,
    updateGroupInfo,
    updateGroupConfigs,
    muteAllGroupMembers,
    unmuteAllGroupMembers,
    muteGroupMembers,
    unmuteGroupMembers,
    getGroupMuteList,
    getGroupBlocklist,
    blockGroupMembers,
    unblockGroupMembers,
    getGroupAllowlist,
    addUsersToGroupAllowlist,
    removeUsersFromGroupAllowlist,
    checkIfInGroupAllowList,
    checkIfInGroupMuteList,
    getGroupSharedFileList,
    uploadGroupSharedFile,
    deleteGroupSharedFile,
    downloadGroupSharedFile,
    acceptGroupJoinRequest,
    rejectGroupJoinRequest,
    refresh,
    loadMore,
    fetchJoinedGroupCount,
  }
}
