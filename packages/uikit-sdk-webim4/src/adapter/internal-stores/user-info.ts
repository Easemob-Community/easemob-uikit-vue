import type {
  UserInfo,
  UserInfoAttribute,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef } from './types'

/** 创建用户资料 store */
export function createUserInfoStore(handlersRef: HandlersRef): EventStores['userInfo'] {
  const userInfos = new Map<string, UserInfo>()
  const loading = new Set<string>()
  const failed = new Set<string>()
  const subscribed = new Set<string>()
  let subscriptionDisabled = false
  const fetchedAttributes = new Map<string, Set<UserInfoAttribute>>()

  function emitChange() {
    handlersRef()?.onUserInfoChanged?.(Array.from(userInfos.values()))
  }

  return {
    getUserInfo(userId) {
      return userInfos.get(userId)
    },

    setUserInfo(info) {
      userInfos.set(info.userId, info)
      emitChange()
    },

    setUserInfos(infos) {
      for (const info of infos)
        userInfos.set(info.userId, info)
      emitChange()
    },

    areAttributesFetched(userId, attributes) {
      const fetched = fetchedAttributes.get(userId)
      if (!fetched)
        return false
      return attributes.every(a => fetched.has(a))
    },

    markFetchedAttributes(userIds, attributes) {
      for (const userId of userIds) {
        const set = fetchedAttributes.get(userId) ?? new Set<UserInfoAttribute>()
        for (const a of attributes)
          set.add(a)
        fetchedAttributes.set(userId, set)
      }
    },

    markLoading(userIds) {
      for (const id of userIds)
        loading.add(id)
    },

    markLoaded(userIds) {
      for (const id of userIds)
        loading.delete(id)
    },

    markFetchFailed(userIds) {
      for (const id of userIds)
        failed.add(id)
    },

    isFetchFailed(userId) {
      return failed.has(userId)
    },

    markSubscribed(userIds) {
      for (const id of userIds)
        subscribed.add(id)
    },

    markUnsubscribed(userIds) {
      for (const id of userIds)
        subscribed.delete(id)
    },

    markSubscribeFailed(userIds) {
      for (const id of userIds)
        failed.add(id)
    },

    isSubscribeFailed(userId) {
      return failed.has(userId)
    },

    disableSubscription() {
      subscriptionDisabled = true
    },

    isSubscriptionDisabled() {
      return subscriptionDisabled
    },

    isSubscribed(userId) {
      return subscribed.has(userId)
    },

    isLoading(userId) {
      return loading.has(userId)
    },
  }
}
