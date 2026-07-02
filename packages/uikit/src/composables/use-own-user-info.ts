import { computed, watchEffect } from 'vue'
import { useUIKit } from './use-uikit'

/**
 * 获取当前登录用户自己的资料（昵称/头像等）。
 * 会自动触发拉取，但不再额外调用陌生人资料订阅（自身资料变更通过 SDK onOwnInfoUpdated 事件同步）。
 */
export function useOwnUserInfo() {
  const { client, stores, domains, features } = useUIKit()
  const enabled = features.enableUserInfo !== false

  const currentUserId = computed(() => client.value.currentUserId)

  watchEffect(() => {
    if (!enabled)
      return
    const userId = currentUserId.value
    if (!userId)
      return
    if (stores.userInfo.getUserInfo(userId) || stores.userInfo.isLoading(userId))
      return

    void domains.userInfo.fetchUserInfos([userId])
  })

  const userInfo = computed(() => {
    const userId = currentUserId.value
    return userId ? stores.userInfo.getUserInfo(userId) : undefined
  })

  const displayName = computed(() => userInfo.value?.nickname || currentUserId.value || '')
  const avatarUrl = computed(() => userInfo.value?.avatarUrl)

  return {
    userInfo,
    displayName,
    avatarUrl,
  }
}
