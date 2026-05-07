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
    clearGroups,
  }
})
