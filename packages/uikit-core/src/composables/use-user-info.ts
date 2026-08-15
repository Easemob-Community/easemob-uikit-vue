import { computed, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { UserInfoAttribute } from 'easemob-websdk'
import { useCoreUIKit } from './use-uikit'

/**
 * 根据用户 ID 获取用户资料（昵称/头像等）。
 * core 版展示优先级：用户资料昵称/头像 > 用户 ID；
 * 联系人备注/头像兜底属场景能力，由场景包组合叠加（如 uikit-im 的 useUserInfo）。
 * 首次使用时会触发批量拉取与订阅；已缓存则直接返回。
 */
export function useUserInfo(
  userId: MaybeRefOrGetter<string | undefined>,
  attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl'],
) {
  const { stores, domains, features } = useCoreUIKit()
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
    if (
      stores.userInfo.getUserInfo(userIdValue)
      || stores.userInfo.isLoading(userIdValue)
      || stores.userInfo.isFetchFailed(userIdValue)
    ) {
      return
    }

    void domains.userInfo.fetchUserInfos([userIdValue], attributes)

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
    /** 取消订阅指定用户的资料变更 */
    unsubscribeUsersInfo: (userIds: string[]) => domains.userInfo.unsubscribeUsersInfo(userIds),
    /** 获取已订阅用户列表 */
    getSubscribedUsers: () => domains.userInfo.getSubscribedUsers(),
  }
}
