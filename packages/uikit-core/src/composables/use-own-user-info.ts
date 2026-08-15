import { computed, watchEffect } from 'vue'
import type { UserInfoAttribute } from 'easemob-websdk'
import { useCoreUIKit } from './use-uikit'

/**
 * 获取当前登录用户自己的资料（昵称/头像等）。
 * 会自动触发拉取，但不再额外调用陌生人资料订阅（自身资料变更通过 SDK onOwnInfoUpdated 事件同步）。
 * core 版展示优先级：用户资料昵称/头像 > 用户 ID；联系人备注兜底由场景包组合叠加。
 */
export function useOwnUserInfo() {
  const { client, stores, domains, features } = useCoreUIKit()
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

  /** 更新当前用户资料（批量字段） */
  async function updateOwnInfo(params: Parameters<typeof domains.userInfo.updateOwnInfo>[0]) {
    return domains.userInfo.updateOwnInfo(params)
  }

  /** 更新当前用户单个资料属性 */
  async function updateOwnInfoByAttribute(attribute: UserInfoAttribute, value: string | number | boolean) {
    return domains.userInfo.updateOwnInfoByAttribute(attribute, value)
  }

  return {
    userInfo,
    displayName,
    avatarUrl,
    updateOwnInfo,
    updateOwnInfoByAttribute,
  }
}
