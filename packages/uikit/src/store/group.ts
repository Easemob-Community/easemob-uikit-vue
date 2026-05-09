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

  function setGroupList(list: Group[]) {
    groupList.value = list
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
  }

  return {
    groupList,
    currentGroup,
    setGroupList,
    addGroup,
    removeGroup,
    setCurrentGroup,
    getGroupById,
    updateGroupMemberCount,
    clearGroups,
  }
})
