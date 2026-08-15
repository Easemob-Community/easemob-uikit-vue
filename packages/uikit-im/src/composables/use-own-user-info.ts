import { computed } from 'vue'
import { useOwnUserInfo as useCoreOwnUserInfo } from '@easemob/uikit-core'
import { useUIKit } from './use-uikit'

/**
 * 获取当前登录用户自己的资料（昵称/头像等）。
 * 会自动触发拉取，但不再额外调用陌生人资料订阅（自身资料变更通过 SDK onOwnInfoUpdated 事件同步）。
 * 展示优先级：联系人备注 > 用户资料昵称/头像 > 用户 ID。
 * 实现：core 版 useOwnUserInfo（资料拉取/更新）+ 本场景 contact 兜底叠加。
 */
export function useOwnUserInfo() {
  const base = useCoreOwnUserInfo()
  const { client, stores } = useUIKit()

  const currentUserId = computed(() => client.value.currentUserId)
  const contact = computed(() => {
    const userId = currentUserId.value
    return userId ? stores.contact.getContact(userId) : undefined
  })

  const displayName = computed(() => contact.value?.remark || base.userInfo.value?.nickname || currentUserId.value || '')
  const avatarUrl = computed(() => base.userInfo.value?.avatarUrl || contact.value?.avatar)

  return {
    ...base,
    displayName,
    avatarUrl,
  }
}
