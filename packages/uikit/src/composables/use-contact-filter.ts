import { computed, type ComputedRef, type Ref } from 'vue'
import type { Contact } from '../store/contact'
import { resolvePinyin } from './use-pinyin'

export type ContactFilterFn = (keyword: string, contact: Contact) => boolean

export interface UseContactFilterOptions {
  /** 自定义过滤规则，覆盖默认（按 name / remark / userId / 拼音 / 首字母模糊匹配） */
  filterFn?: ContactFilterFn
}

/**
 * 联系人筛选 composable
 *
 * 默认匹配规则（不区分大小写）：
 * 1. name / remark / userId 任一字段包含 keyword
 * 2. 若已注入拼音 adapter（setPinyinAdapter）：
 *    - 完整拼音包含 keyword（如 "zhangsan" 命中"张三"）
 *    - 首字母缩写包含 keyword（如 "zs" 命中"张三"）
 *
 * 业务方可通过 options.filterFn 完全覆盖默认规则。
 */
export function useContactFilter(
  contacts: Ref<Contact[]> | ComputedRef<Contact[]>,
  keyword: Ref<string>,
  options: UseContactFilterOptions = {}
): ComputedRef<Contact[]> {
  return computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return contacts.value
    if (options.filterFn) {
      return contacts.value.filter((c) => options.filterFn!(kw, c))
    }
    return contacts.value.filter((c) => {
      const display = (c.remark || c.name || '').toLowerCase()
      const userId = (c.userId || '').toLowerCase()
      if (display.includes(kw) || userId.includes(kw)) return true

      // 拼音匹配（adapter 存在时才生效，零依赖降级）
      const py = resolvePinyin(c.remark || c.name || '')
      if (py) {
        if (py.pinyin.includes(kw)) return true
        if (py.initials.includes(kw)) return true
      }
      return false
    })
  })
}
