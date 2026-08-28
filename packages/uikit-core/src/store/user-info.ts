import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo, UserInfoAttribute } from 'easemob-websdk'

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
  /** 每个 userId 已成功拉取过的属性集合，用于判断缓存是否满足后续更大属性集的请求 */
  const fetchedAttributesMap = ref<Record<string, Set<UserInfoAttribute>>>({})

  function getUserInfo(userId: string): UserInfo | undefined {
    return userInfoMap.value[userId]
  }

  function setUserInfo(userInfo: UserInfo) {
    // 合并写入：事件推送/单属性更新可能只带部分字段，合并保留已拉取的全量字段
    userInfoMap.value[userInfo.userId] = {
      ...userInfoMap.value[userInfo.userId],
      ...userInfo,
    }
    fetchFailedSet.value.delete(userInfo.userId)
  }

  function setUserInfos(infos: UserInfo[]) {
    for (const info of infos) {
      userInfoMap.value[info.userId] = {
        ...userInfoMap.value[info.userId],
        ...info,
      }
      fetchFailedSet.value.delete(info.userId)
    }
  }

  /** 记录指定用户已成功拉取过的属性集合（与既有集合取并集） */
  function markFetchedAttributes(userIds: string[], attributes: UserInfoAttribute[]) {
    for (const id of userIds) {
      const current = fetchedAttributesMap.value[id] ?? new Set<UserInfoAttribute>()
      for (const attr of attributes)
        current.add(attr)
      fetchedAttributesMap.value[id] = current
    }
  }

  /** 指定用户的缓存是否已覆盖请求的全部属性 */
  function areAttributesFetched(userId: string, attributes: UserInfoAttribute[]): boolean {
    const fetched = fetchedAttributesMap.value[userId]
    if (!fetched)
      return false
    return attributes.every(attr => fetched.has(attr))
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

  function markUnsubscribed(userIds: string[]) {
    for (const id of userIds) {
      subscribedSet.value.delete(id)
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
    fetchedAttributesMap.value = {}
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
    markFetchedAttributes,
    areAttributesFetched,
    markLoading,
    markLoaded,
    markFetchFailed,
    isFetchFailed,
    markSubscribed,
    markUnsubscribed,
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
