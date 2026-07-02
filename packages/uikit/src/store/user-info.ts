import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from 'easemob-websdk'

export interface UserInfoState {
  userInfoMap: Record<string, UserInfo>
  loadingSet: Set<string>
  subscribedSet: Set<string>
}

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfoMap = ref<Record<string, UserInfo>>({})
  const loadingSet = ref<Set<string>>(new Set())
  const subscribedSet = ref<Set<string>>(new Set())

  function getUserInfo(userId: string): UserInfo | undefined {
    return userInfoMap.value[userId]
  }

  function setUserInfo(userInfo: UserInfo) {
    userInfoMap.value[userInfo.userId] = { ...userInfo }
  }

  function setUserInfos(infos: UserInfo[]) {
    for (const info of infos) {
      userInfoMap.value[info.userId] = { ...info }
    }
  }

  function markLoading(userIds: string[]) {
    for (const id of userIds) {
      loadingSet.value.add(id)
    }
  }

  function markLoaded(userIds: string[]) {
    for (const id of userIds) {
      loadingSet.value.delete(id)
    }
  }

  function markSubscribed(userIds: string[]) {
    for (const id of userIds) {
      subscribedSet.value.add(id)
    }
  }

  function isLoading(userId: string): boolean {
    return loadingSet.value.has(userId)
  }

  function isSubscribed(userId: string): boolean {
    return subscribedSet.value.has(userId)
  }

  function clearUserInfos() {
    userInfoMap.value = {}
    loadingSet.value.clear()
    subscribedSet.value.clear()
  }

  return {
    userInfoMap: computed(() => userInfoMap.value),
    loadingSet: computed(() => loadingSet.value),
    subscribedSet: computed(() => subscribedSet.value),
    getUserInfo,
    setUserInfo,
    setUserInfos,
    markLoading,
    markLoaded,
    markSubscribed,
    isLoading,
    isSubscribed,
    clearUserInfos,
  }
})

export type UserInfoStore = ReturnType<typeof useUserInfoStore>
