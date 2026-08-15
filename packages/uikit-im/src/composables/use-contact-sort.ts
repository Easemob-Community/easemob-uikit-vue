import { type ComputedRef, type Ref, computed } from 'vue'
import type { UiContact as Contact } from '@easemob/uikit-core'
import { resolvePinyin } from './use-pinyin'

/** 联系人排序方式 */
export type ContactSortBy =
  | 'none'
  | 'pinyin'
  | ((a: Contact, b: Contact) => number)

/**
 * 联系人排序 composable
 *
 * - sortBy === 'none'：保持 store 顺序
 * - sortBy === 'pinyin'：按 remark/name 拼音字典序升序（未注入 adapter 时降级 localeCompare）
 * - sortBy 为函数：自定义比较器
 */
export function useContactSort(
  contacts: Ref<Contact[]> | ComputedRef<Contact[]>,
  sortBy: Ref<ContactSortBy>,
): ComputedRef<Contact[]> {
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
      return arr.sort((a, b) => {
        const aRaw = a.remark || a.name || ''
        const bRaw = b.remark || b.name || ''
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
