/**
 * 拼音适配器 (Optional Pinyin Adapter)
 *
 * UIKit 默认不携带任何拼音库，业务方如需中文首字母分组、拼音搜索、
 * 首字母缩写搜索等能力，可通过 setPinyinAdapter 按需注入。
 *
 * 设计原则：
 * - composable 内部零依赖，未注入 adapter 时自动降级（仅按字符串 includes 匹配）
 * - 接口与具体拼音库（pinyin-pro / tiny-pinyin / pinyinlite ...）解耦
 *
 * @example
 * ```ts
 * import { pinyin } from 'pinyin-pro'
 * import { setPinyinAdapter } from '@easemob/uikit'
 *
 * setPinyinAdapter((text) => {
 *   const full = pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
 *     .replace(/\s+/g, '')
 *     .toLowerCase()
 *   const initialsRaw = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' })
 *     .replace(/\s+/g, '')
 *     .toLowerCase()
 *   const firstChar = initialsRaw.charAt(0).toUpperCase()
 *   return {
 *     pinyin: full,
 *     initials: initialsRaw,
 *     firstLetter: /^[A-Z]$/.test(firstChar) ? firstChar : '#',
 *   }
 * })
 * ```
 */

export interface PinyinResult {
  /** 完整拼音，小写无声调，如 "zhangsan" */
  pinyin: string
  /** 每个字的首字母拼接（小写），用于缩写搜索，如 "zs" */
  initials: string
  /** 首字母（大写 A-Z 或 '#' 兜底），用于分组 */
  firstLetter: string
}

export type PinyinAdapter = (text: string) => PinyinResult

let pinyinAdapter: PinyinAdapter | null = null

/**
 * 注入拼音适配器
 * 传入 null 可解除注入（恢复默认行为）。
 */
export function setPinyinAdapter(adapter: PinyinAdapter | null): void {
  pinyinAdapter = adapter
}

/** 是否已注入拼音适配器 */
export function hasPinyinAdapter(): boolean {
  return pinyinAdapter !== null
}

/**
 * 解析文本拼音，未注入或解析异常时返回 null。
 * 内部缓存避免重复计算。
 */
const cache = new Map<string, PinyinResult>()
const CACHE_LIMIT = 1000

export function resolvePinyin(text: string): PinyinResult | null {
  if (!pinyinAdapter || !text) return null
  const cached = cache.get(text)
  if (cached) return cached
  try {
    const result = pinyinAdapter(text)
    if (cache.size >= CACHE_LIMIT) {
      // 简单清理一半，避免无限增长
      const keys = Array.from(cache.keys()).slice(0, CACHE_LIMIT / 2)
      keys.forEach((k) => cache.delete(k))
    }
    cache.set(text, result)
    return result
  } catch {
    return null
  }
}

/** 清空拼音缓存（联系人备注更新等场景使用） */
export function clearPinyinCache(): void {
  cache.clear()
}

/** Composable 包装，便于在组件内直接解构使用 */
export function usePinyin() {
  return {
    setPinyinAdapter,
    hasPinyinAdapter,
    resolvePinyin,
    clearPinyinCache,
  }
}
