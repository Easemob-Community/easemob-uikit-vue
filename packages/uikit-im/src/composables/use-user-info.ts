import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { UserInfoAttribute } from 'easemob-websdk'
import { useUserInfo as useCoreUserInfo } from '@easemob/uikit-core'
import { useUIKit } from './use-uikit'

/**
 * 根据用户 ID 获取用户资料（昵称/头像等）。
 * 展示优先级：联系人备注 > 用户资料昵称/头像 > 用户 ID。
 * 首次使用时会触发批量拉取与订阅；已缓存则直接返回。
 * 实现：core 版 useUserInfo（资料拉取/订阅）+ 本场景 contact 兜底叠加。
 */
export function useUserInfo(
  userId: MaybeRefOrGetter<string | undefined>,
  attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl'],
) {
  const base = useCoreUserInfo(userId, attributes)
  const { stores } = useUIKit()

  const id = computed(() => toValue(userId))
  const contact = computed(() => {
    const userIdValue = id.value
    return userIdValue ? stores.contact.getContact(userIdValue) : undefined
  })

  const displayName = computed(() => contact.value?.remark || base.userInfo.value?.nickname || id.value || '')
  const avatarUrl = computed(() => base.userInfo.value?.avatarUrl || contact.value?.avatar)

  return {
    ...base,
    contact,
    displayName,
    avatarUrl,
  }
}
