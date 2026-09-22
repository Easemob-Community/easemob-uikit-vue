import { computed, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { UserInfoAttribute } from '@easemob-community/uikit-sdk-contract'
import { useCoreUIKit } from './use-uikit'

/**
 * 根据用户 ID 获取用户资料（默认拉取昵称/头像，可按需传入更多属性）。
 * core 版展示优先级：用户资料昵称/头像 > 用户 ID；
 * 联系人备注/头像兜底属场景能力，由场景包组合叠加（如 uikit-im 的 useUserInfo）。
 * 首次使用时会触发批量拉取与订阅；缓存已覆盖请求属性集时直接返回，部分覆盖会自动补拉。
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
      stores.userInfo.areAttributesFetched(userIdValue, attributes)
      || stores.userInfo.isLoading(userIdValue)
      || stores.userInfo.isFetchFailed(userIdValue)
    ) {
      return
    }

    // 缓存已存在但未覆盖请求的属性集（如只拉过昵称/头像），按请求属性补拉
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
