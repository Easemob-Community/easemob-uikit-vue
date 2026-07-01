import { type ComputedRef, type Ref, computed } from 'vue'
import type { UiGroup as Group } from '../sdk/types'
import type { GroupSortBy } from '../modules/group/types'
import { resolvePinyin } from './use-pinyin'

/**
 * 群组排序 composable
 *
 * - sortBy === 'none'：保持 store 顺序，不排序
 * - sortBy === 'pinyin'：按 groupName 拼音字典序升序（未注入拼音 adapter 时降级为 localeCompare）
 * - sortBy === 'memberCount'：按 memberCount 降序
 * - sortBy 为函数：调用自定义比较器
 */
export function useGroupSort(
  groups: Ref<Group[]> | ComputedRef<Group[]>,
  sortBy: Ref<GroupSortBy>,
): ComputedRef<Group[]> {
  return computed(() => {
    const list = groups.value
    const mode = sortBy.value
    if (mode === 'none')
      return list
    const arr = [...list]
    if (typeof mode === 'function') {
      return arr.sort(mode)
    }
    if (mode === 'memberCount') {
      return arr.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
    }
    if (mode === 'pinyin') {
      return arr.sort((a, b) => {
        const aRaw = a.groupName || ''
        const bRaw = b.groupName || ''
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
