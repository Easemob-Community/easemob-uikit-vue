import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { UseUserInfoOptions, UserInfoAttribute } from '@easemob-community/uikit-sdk-contract'
import { useUserInfo as useCoreUserInfo } from '@easemob-community/uikit-core'
import { useUIKit } from './use-uikit'

/**
 * 根据用户 ID 获取用户资料（昵称/头像等）。
 * 展示优先级：联系人备注 > 用户资料昵称/头像 > 用户 ID。
 * 首次使用时会触发批量拉取与订阅；已缓存则直接返回。
 * 实现：core 版 useUserInfo（资料拉取/订阅）+ 本场景 contact 兜底叠加。
 * @param userId 响应式用户 ID / Reactive user ID.
 * @param attributes 需要读取的属性 / Attributes to read.
 * @param options 行为选项 / Behavior options.
 * @param options.source 日志来源标签 / Caller label for diagnostic logs.
 * @param options.subscribe 是否订阅资料变更，默认 true / Subscribe to changes; defaults to true.
 */
export function useUserInfo(
  userId: MaybeRefOrGetter<string | undefined>,
  attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl'],
  options: UseUserInfoOptions = {},
) {
  const base = useCoreUserInfo(userId, attributes, options)
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
