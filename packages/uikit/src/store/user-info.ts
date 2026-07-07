import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from 'easemob-websdk'

export interface UserInfoState {
  userInfoMap: Record<string, UserInfo>
  loadingSet: Set<string>
  subscribedSet: Set<string>
  subscribeFailedSet: Set<string>
  subscriptionDisabled: boolean
}

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfoMap = ref<Record<string, UserInfo>>({})
  const loadingSet = ref<Set<string>>(new Set())
  const fetchFailedSet = ref<Set<string>>(new Set())
  const subscribedSet = ref<Set<string>>(new Set())
  const subscribeFailedSet = ref<Set<string>>(new Set())
  const subscriptionDisabled = ref(false)

  function getUserInfo(userId: string): UserInfo | undefined {
    return userInfoMap.value[userId]
  }

  function setUserInfo(userInfo: UserInfo) {
    userInfoMap.value[userInfo.userId] = { ...userInfo }
    fetchFailedSet.value.delete(userInfo.userId)
  }

  function setUserInfos(infos: UserInfo[]) {
    for (const info of infos) {
      userInfoMap.value[info.userId] = { ...info }
      fetchFailedSet.value.delete(info.userId)
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

  function markFetchFailed(userIds: string[]) {
    for (const id of userIds) {
      fetchFailedSet.value.add(id)
    }
  }

  function isFetchFailed(userId: string): boolean {
    return fetchFailedSet.value.has(userId)
  }

  function markSubscribed(userIds: string[]) {
    for (const id of userIds) {
      subscribedSet.value.add(id)
      subscribeFailedSet.value.delete(id)
    }
  }

  function markSubscribeFailed(userIds: string[]) {
    for (const id of userIds) {
      subscribeFailedSet.value.add(id)
    }
  }

  function isSubscribeFailed(userId: string): boolean {
    return subscribeFailedSet.value.has(userId)
  }

  function disableSubscription() {
    subscriptionDisabled.value = true
  }

  function isSubscriptionDisabled(): boolean {
    return subscriptionDisabled.value
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
    fetchFailedSet.value.clear()
    subscribedSet.value.clear()
    subscribeFailedSet.value.clear()
    subscriptionDisabled.value = false
  }

  return {
    userInfoMap: computed(() => userInfoMap.value),
    loadingSet: computed(() => loadingSet.value),
    fetchFailedSet: computed(() => fetchFailedSet.value),
    subscribedSet: computed(() => subscribedSet.value),
    subscribeFailedSet: computed(() => subscribeFailedSet.value),
    subscriptionDisabled: computed(() => subscriptionDisabled.value),
    getUserInfo,
    setUserInfo,
    setUserInfos,
    markLoading,
    markLoaded,
    markFetchFailed,
    isFetchFailed,
    markSubscribed,
    markSubscribeFailed,
    isSubscribeFailed,
    disableSubscription,
    isSubscriptionDisabled,
    isLoading,
    isSubscribed,
    clearUserInfos,
  }
})

export type UserInfoStore = ReturnType<typeof useUserInfoStore>
