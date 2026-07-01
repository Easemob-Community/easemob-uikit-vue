import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiPresence } from '../sdk/types'

export const usePresenceStore = defineStore('presence', () => {
  const presenceMap = ref<Map<string, UiPresence>>(new Map())
  const subscribedUserIds = ref<Set<string>>(new Set())

  const onlineUserIds = computed(() => {
    const ids: string[] = []
    presenceMap.value.forEach((info, id) => {
      if (info.status === 'online')
        ids.push(id)
    })
    return ids
  })

  function update(info: UiPresence) {
    const next = new Map(presenceMap.value)
    next.set(info.userId, { ...info, lastTime: info.lastTime ?? Date.now() })
    presenceMap.value = next
  }

  function updateBatch(list: UiPresence[]) {
    if (!list || list.length === 0)
      return
    const next = new Map(presenceMap.value)
    const now = Date.now()
    for (const info of list) {
      next.set(info.userId, { ...info, lastTime: info.lastTime ?? now })
    }
    presenceMap.value = next
  }

  function get(userId: string): UiPresence | undefined {
    return presenceMap.value.get(userId)
  }

  function setSubscribed(userIds: string[]) {
    for (const id of userIds) {
      subscribedUserIds.value.add(id)
    }
  }

  function clear() {
    presenceMap.value = new Map()
    subscribedUserIds.value = new Set()
  }

  return {
    presenceMap,
    onlineUserIds,
    subscribedUserIds,
    update,
    updateBatch,
    get,
    setSubscribed,
    clear,
  }
})
