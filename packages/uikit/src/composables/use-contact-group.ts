import { computed, type ComputedRef, type Ref } from 'vue'
import type { Contact } from '../store/contact'
import {
  DEFAULT_ALPHABET_KEYS,
  type ContactGroupBy,
  type ContactGroupItem,
} from '../modules/contact/types'
import { resolvePinyin } from './use-pinyin'

/**
 * 提取联系人的分组 key
 *
 * - groupBy === 'none'：返回单一 'all' 分组
 * - groupBy === 'alphabet'：
 *     1) 取 remark/name 首字符大写，A-Z 直接归类
 *     2) 否则若已注入拼音 adapter，使用 firstLetter 归类
 *     3) 否则归到 '#' 兜底
 * - groupBy 为函数：调用并使用其返回值
 */
function resolveGroupKey(contact: Contact, groupBy: ContactGroupBy): string {
  if (groupBy === 'none') return 'all'
  if (typeof groupBy === 'function') return groupBy(contact)

  // alphabet 模式
  const raw = (contact.remark || contact.name || '').trim()
  if (!raw) return '#'
  const first = raw.charAt(0).toUpperCase()
  if (/^[A-Z]$/.test(first)) return first

  // 中文等非 A-Z 字符尝试通过拼音 adapter 解析
  const py = resolvePinyin(raw)
  if (py && /^[A-Z]$/.test(py.firstLetter)) return py.firstLetter

  return '#'
}

export interface UseContactGroupOptions {
  /** 组内排序规则，默认按拼音/字典序 */
  sort?: (a: Contact, b: Contact) => number
}

/**
 * 联系人分组 composable
 *
 * 输出始终按 A-Z + # 顺序排列；当 groupBy 为函数时按出现顺序保留。
 * 空分组会被剔除，不会出现 items.length === 0 的项。
 *
 * 组内排序：若已注入拼音 adapter，自动按完整拼音字典序排列；否则按原文 localeCompare。
 */
export function useContactGroup(
  contacts: Ref<Contact[]> | ComputedRef<Contact[]>,
  groupBy: Ref<ContactGroupBy>,
  options: UseContactGroupOptions = {}
): ComputedRef<ContactGroupItem[]> {
  const defaultSort = (a: Contact, b: Contact) => {
    const aRaw = a.remark || a.name || ''
    const bRaw = b.remark || b.name || ''
    const aPy = resolvePinyin(aRaw)
    const bPy = resolvePinyin(bRaw)
    const an = aPy?.pinyin || aRaw.toLowerCase()
    const bn = bPy?.pinyin || bRaw.toLowerCase()
    return an.localeCompare(bn)
  }

  return computed<ContactGroupItem[]>(() => {
    const list = contacts.value
    const mode = groupBy.value
    const sort = options.sort ?? defaultSort
    const map = new Map<string, Contact[]>()
    const orderedKeys: string[] = []

    for (const item of list) {
      const key = resolveGroupKey(item, mode)
      if (!map.has(key)) {
        map.set(key, [])
        orderedKeys.push(key)
      }
      map.get(key)!.push(item)
    }

    let keys: string[]
    if (mode === 'alphabet') {
      keys = DEFAULT_ALPHABET_KEYS.filter((k) => map.has(k))
    } else {
      keys = orderedKeys
    }

    return keys.map<ContactGroupItem>((key) => ({
      key,
      title: key,
      items: [...map.get(key)!].sort(sort),
    }))
  })
}
