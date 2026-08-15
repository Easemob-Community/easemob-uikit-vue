import { type ComputedRef, type Ref, computed } from 'vue'
import type { UiGroup as Group } from '../sdk/types'
import { resolvePinyin } from './use-pinyin'

export type GroupFilterFn = (keyword: string, group: Group) => boolean

export interface UseGroupFilterOptions {
  /** 自定义过滤规则，覆盖默认（按 groupName / groupId / 拼音 / 首字母模糊匹配） */
  filterFn?: GroupFilterFn
}

/**
 * 群组筛选 composable
 *
 * 默认匹配规则（不区分大小写）：
 * 1. groupName / groupId 任一字段包含 keyword
 * 2. 若已注入拼音 adapter（setPinyinAdapter）：
 *    - 完整拼音包含 keyword（如 "yunxiniqun" 命中"运行小群"）
 *    - 首字母缩写包含 keyword（如 "yxxq" 命中"运行小群"）
 *
 * 业务方可通过 options.filterFn 完全覆盖默认规则。
 */
export function useGroupFilter(
  groups: Ref<Group[]> | ComputedRef<Group[]>,
  keyword: Ref<string>,
  options: UseGroupFilterOptions = {},
): ComputedRef<Group[]> {
  return computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw)
      return groups.value
    if (options.filterFn) {
      return groups.value.filter(g => options.filterFn!(kw, g))
    }
    return groups.value.filter((g) => {
      const name = (g.groupName || '').toLowerCase()
      const id = (g.groupId || '').toLowerCase()
      if (name.includes(kw) || id.includes(kw))
        return true

      // 拼音匹配（adapter 存在时才生效，零依赖降级）
      const py = resolvePinyin(g.groupName || '')
      if (py) {
        if (py.pinyin.includes(kw))
          return true
        if (py.initials.includes(kw))
          return true
      }
      return false
    })
  })
}
