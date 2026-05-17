import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Group {
  groupId: string
  groupName: string
  avatar?: string
  owner: string
  memberCount: number
  description?: string
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

  function clearGroups() {
    groupList.value = []
    currentGroup.value = null
    loaded.value = false
    hasMore.value = false
    cursor.value = ''
  }

  return {
    groupList,
    currentGroup,
    loaded,
    hasMore,
    cursor,
    setGroupList,
    appendGroupList,
    setHasMore,
    setCursor,
    addGroup,
    removeGroup,
    setCurrentGroup,
    getGroupById,
    updateGroupMemberCount,
    clearGroups,
  }
})
