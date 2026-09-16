import { computed, watchEffect } from 'vue'
import { ALL_USER_INFO_ATTRIBUTES } from '@easemob/uikit-sdk-contract'
import type { UserInfoAttribute } from '@easemob/uikit-sdk-contract'
import { useCoreUIKit } from './use-uikit'

/**
 * 获取当前登录用户自己的资料（全量属性：昵称/头像/签名/邮箱/手机号/性别/生日/ext）。
 * 会自动触发拉取，但不再额外调用陌生人资料订阅（自身资料变更通过 SDK onOwnInfoUpdated 事件同步）。
 * core 版展示优先级：用户资料昵称/头像 > 用户 ID；联系人备注兜底由场景包组合叠加。
 */
export function useOwnUserInfo() {
  const { client, stores, domains, features } = useCoreUIKit()
  const enabled = features.enableUserInfo !== false

  // client.currentUserId 来自 adapter 内部状态，登录完成前为空且不含响应式依赖，
  // 组件若先于登录完成挂载（如刷新后路由立即渲染、SDK 自动登录异步进行），首次求值会永久缓存空串；
  // stores.client.currentUser 由 core login 响应式写入，作为兜底使首次求值后仍能触发资料拉取
  const currentUserId = computed(() => client.value.currentUserId || stores.client.currentUser || '')

  watchEffect(() => {
    if (!enabled)
      return
    const userId = currentUserId.value
    if (!userId)
      return
    if (stores.userInfo.areAttributesFetched(userId, ALL_USER_INFO_ATTRIBUTES))
      return
    if (stores.userInfo.isLoading(userId) || stores.userInfo.isFetchFailed(userId))
      return

    // 全量拉取自身资料：即使此前消息列表已缓存过部分字段（昵称/头像），也会补拉剩余属性
    void domains.userInfo.fetchUserInfos([userId], ALL_USER_INFO_ATTRIBUTES)
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
