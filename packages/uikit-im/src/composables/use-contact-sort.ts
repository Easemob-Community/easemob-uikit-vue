import { type ComputedRef, type Ref, computed } from 'vue'
import type { UiContact as Contact } from '@easemob-community/uikit-core'
import { useUserInfoStore } from '@easemob-community/uikit-core'
import { resolvePinyin } from './use-pinyin'
import { resolveContactDisplayName } from './contact-display'

/** 联系人排序方式 */
export type ContactSortBy =
  | 'none'
  | 'pinyin'
  | ((a: Contact, b: Contact) => number)

/**
 * 联系人排序 composable
 *
 * - sortBy === 'none'：保持 store 顺序
 * - sortBy === 'pinyin'：按展示名（备注 > userInfo 昵称 > name）拼音字典序升序，
 *   未注入 adapter 时降级 localeCompare；昵称异步回填后自动重算
 * - sortBy 为函数：自定义比较器
 */
export function useContactSort(
  contacts: Ref<Contact[]> | ComputedRef<Contact[]>,
  sortBy: Ref<ContactSortBy>,
): ComputedRef<Contact[]> {
  const userInfoStore = useUserInfoStore()
  return computed(() => {
    const list = contacts.value
    const mode = sortBy.value
    if (mode === 'none')
      return list
    const arr = [...list]
    if (typeof mode === 'function') {
      return arr.sort(mode)
    }
    if (mode === 'pinyin') {
      const userInfoMap = userInfoStore.userInfoMap
      return arr.sort((a, b) => {
        const aRaw = resolveContactDisplayName(a, userInfoMap[a.userId]?.nickname)
        const bRaw = resolveContactDisplayName(b, userInfoMap[b.userId]?.nickname)
        const aPy = resolvePinyin(aRaw)
        const bPy = resolvePinyin(bRaw)
        const an = aPy?.pinyin || aRaw.toLowerCase()
        const bn = bPy?.pinyin || bRaw.toLowerCase()
        return an.localeCompare(bn)
      })
    }
    return arr
  })
}
