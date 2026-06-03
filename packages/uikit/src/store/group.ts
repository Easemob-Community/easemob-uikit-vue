import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UIKIT 内部群组模型
 * 基于 SDK getGroupInfo (GroupDetailInfo) 与 getJoinedGroups (GroupInfo) 的并集
 */
export interface Group {
  /** 群组 ID */
  groupId: string
  /** 群组名称 */
  groupName: string
  /** 群组头像 */
  avatar?: string
  /** 群主 */
  owner: string
  /** 成员数量 */
  memberCount: number
  /** 群组描述 */
  description?: string
  /** 是否公开群 */
  public?: boolean
  /** 当前用户角色 */
  role?: 'owner' | 'admin' | 'member'
  /** 是否允许成员邀请 */
  allowInvites?: boolean
  /** 是否需要审批入群 */
  approval?: boolean
  /** 最大成员数 */
  maxUsers?: number
  /** 是否全员禁言 */
  mute?: boolean
  /** 是否已屏蔽该群消息 */
  shieldgroup?: boolean
  /** 群公告 */
  announcement?: string
  /** 是否全员禁言 */
  allMuted?: boolean
  /** 群组扩展信息 */
  ext?: string
  /** 创建时间戳 */
  created?: number
}

export const useGroupStore = defineStore('group', () => {
  const groupList = ref<Group[]>([])
  const currentGroup = ref<Group | null>(null)
  /** 是否已拉取过群组列表（幂等标记） */
  const loaded = ref(false)
  /** 是否还有下一页 */
  const hasMore = ref(false)
  /** 分页游标（SDK 使用 pageNum，此处统一抽象为 cursor） */
  const cursor = ref<string>('')
  /** 当前用户加入的群组总数（由 getJoinedGroupsCount 轻量接口提供） */
  const joinedGroupCount = ref<number>(0)

  function setGroupList(list: Group[]) {
    groupList.value = list
    loaded.value = true
  }

  function appendGroupList(list: Group[]) {
    const ids = new Set(groupList.value.map((g) => g.groupId))
    for (const g of list) {
      if (!ids.has(g.groupId)) {
        groupList.value.push(g)
        ids.add(g.groupId)
      }
    }
  }

  function setHasMore(value: boolean) {
    hasMore.value = value
  }

  function setCursor(value: string) {
    cursor.value = value
  }

  function addGroup(group: Group) {
    const exists = groupList.value.find((g: Group) => g.groupId === group.groupId)
    if (!exists) {
      groupList.value.push(group)
    }
  }

  function removeGroup(groupId: string) {
    groupList.value = groupList.value.filter((g: Group) => g.groupId !== groupId)
  }

  /** 根据群ID获取群信息 */
  function getGroupById(groupId: string): Group | undefined {
    return groupList.value.find((g: Group) => g.groupId === groupId)
  }

  /** 更新群成员数（群信息可能来自群详情接口或消息上下文） */
  function updateGroupMemberCount(groupId: string, count: number) {
    const g = groupList.value.find((item: Group) => item.groupId === groupId)
    if (g) {
      g.memberCount = count
    } else {
      // 缓存未知群的成员数（仅 memberCount，其他字段用占位值）
      groupList.value.push({
        groupId,
        groupName: groupId,
        owner: '',
        memberCount: count,
      })
    }
  }

  function setCurrentGroup(group: Group | null) {
    currentGroup.value = group
  }

  function setJoinedGroupCount(count: number) {
    joinedGroupCount.value = count
  }

  /** 按 groupId 局部更新群信息 */
  function updateGroup(groupId: string, patch: Partial<Group>) {
    const g = groupList.value.find((item) => item.groupId === groupId)
    if (g) Object.assign(g, patch)
  }

  /** 增量更新成员数 */
  function incrementMemberCount(groupId: string, delta: number) {
    const g = groupList.value.find((item) => item.groupId === groupId)
    if (g) g.memberCount = Math.max(0, (g.memberCount || 0) + delta)
  }

  /** 减量更新成员数 */
  function decrementMemberCount(groupId: string, delta: number) {
    const g = groupList.value.find((item) => item.groupId === groupId)
    if (g) g.memberCount = Math.max(0, (g.memberCount || 0) - delta)
  }

  /**
   * 标记管理员（当前 Group 类型不含管理员列表，仅做占位）
   * @see SDK_DEFICIENCY: 群管理员变更事件 payload 中的 administrator 为 UserInfo 而非 string
   */
  function markAdmin(_groupId: string, _userId: string) {
    // Admin tracking requires adding admins field to Group type
  }

  /**
   * 取消管理员标记（当前 Group 类型不含管理员列表，仅做占位）
   * @see SDK_DEFICIENCY: 群管理员变更事件 payload 中的 administrator 为 UserInfo 而非 string
   */
  function unmarkAdmin(_groupId: string, _userId: string) {
    // Admin tracking requires adding admins field to Group type
  }

  /**
   * 设置用户禁言状态（当前 Group 类型不含禁言列表，仅做占位）
   * @see SDK_DEFICIENCY: 群禁言事件 payload 中的 mutes 为 UserInfo[] 而非 string[]
   */
  function setMuted(_groupId: string, _userIds: string[], _muted: boolean) {
    // Mute tracking requires adding muteList field to Group type
  }

  function clearGroups() {
    groupList.value = []
    currentGroup.value = null
    loaded.value = false
    hasMore.value = false
    cursor.value = ''
    joinedGroupCount.value = 0
  }

  return {
    groupList,
    currentGroup,
    loaded,
    hasMore,
    cursor,
    joinedGroupCount,
    setGroupList,
    appendGroupList,
    setHasMore,
    setCursor,
    addGroup,
    removeGroup,
    setCurrentGroup,
    getGroupById,
    updateGroupMemberCount,
    setJoinedGroupCount,
    updateGroup,
    incrementMemberCount,
    decrementMemberCount,
    markAdmin,
    unmarkAdmin,
    setMuted,
    clearGroups,
  }
})
