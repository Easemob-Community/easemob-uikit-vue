import { computed, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useUIKit } from './use-uikit'

/**
 * 根据用户 ID 获取用户资料（昵称/头像等）。
 * 首次使用时会触发批量拉取与订阅；已缓存则直接返回。
 */
export function useUserInfo(userId: MaybeRefOrGetter<string | undefined>) {
  const { stores, domains, features } = useUIKit()
  const enabled = features.enableUserInfo !== false
  const subscriptionEnabled = features.enableUserInfoSubscription !== false

  const id = computed(() => toValue(userId))
  const userInfo = computed(() => {
    const userIdValue = id.value
    return userIdValue ? stores.userInfo.getUserInfo(userIdValue) : undefined
  })

  watchEffect(() => {
    if (!enabled)
      return
    const userIdValue = id.value
    if (!userIdValue)
      return
    if (stores.userInfo.getUserInfo(userIdValue) || stores.userInfo.isLoading(userIdValue))
      return

    void domains.userInfo.fetchUserInfos([userIdValue])

    if (subscriptionEnabled && !stores.userInfo.isSubscriptionDisabled()) {
      void domains.userInfo.subscribeUserInfos([userIdValue])
    }
  })

  const displayName = computed(() => userInfo.value?.nickname || id.value || '')
  const avatarUrl = computed(() => userInfo.value?.avatarUrl)

  return {
    userInfo,
    displayName,
    avatarUrl,
  }
}
