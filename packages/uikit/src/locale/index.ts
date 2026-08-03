// Locale
import { computed, ref } from 'vue'
import type { LocaleMessages } from './type'
import zhCN from './zh-CN'
import en from './en'

export * from './type'
export * from './zh-CN'
export * from './en'

const messages: Record<string, LocaleMessages> = {
  'zh-CN': zhCN,
  'en': en,
}

const currentLocale = ref<string>('zh-CN')

export function useLocale() {
  const t = (key: string, fallback?: string): string => {
    const msg = messages[currentLocale.value]
    // 缺 key 时返回 fallback（而非 truthy 的 key 名），让调用方兜底文案真正生效
    return msg?.[key] || fallback || key
  }

  const setLocale = (locale: string) => {
    currentLocale.value = locale
  }

  const locale = computed(() => currentLocale.value)

  return { t, setLocale, locale }
}

/** 独立的 t 函数，可在非 setup 上下文（如事件回调）中使用 */
export function t(key: string, fallback?: string): string {
  const msg = messages[currentLocale.value]
  return msg?.[key] || fallback || key
}

export function createLocale(locale: string = 'zh-CN') {
  currentLocale.value = locale
  return { t: useLocale().t, setLocale: useLocale().setLocale }
}

/**
 * 向指定语言包增量合并自定义文案。
 * 业务方 / plugin 可在初始化时调用，扩展自己的多语言 key，例如：
 *   mergeLocaleMessages('en', { 'plugin.card.send': 'Send Card' })
 */
export function mergeLocaleMessages(locale: string, msgs: LocaleMessages) {
  messages[locale] = { ...(messages[locale] || {}), ...msgs }
}

export interface FindLocaleKeyOptions {
  /** 是否精确匹配完整文案，默认 false（包含即可） */
  exact?: boolean
  /** 指定查找的语言包，默认使用当前语言 */
  locale?: string
}

/**
 * 根据文案反查 locale key，方便业务方定位需要覆盖的语言包项。
 * 支持单个文案或批量文案查询。
 *
 * 示例：
 *   findLocaleKey('暂无会话')                   // ['conversation.empty']
 *   findLocaleKey(['暂无会话', '发送名片'])      // ['conversation.empty', 'demo.card.send']
 *   findLocaleKey('发送', { exact: true })
 *   findLocaleKey('No conversation', { locale: 'en' })
 */
export function findLocaleKey(
  text: string | string[],
  options: FindLocaleKeyOptions = {},
): string[] {
  const { exact = false, locale } = options
  const target = locale || currentLocale.value
  const msg = messages[target]
  if (!msg) return []
  const texts = Array.isArray(text) ? text : [text]
  const matched = new Set<string>()
  for (const [, value] of Object.entries(msg)) {
    for (const t of texts) {
      const hit = exact ? value === t : value.includes(t)
      if (hit) {
        matched.add(value)
        break
      }
    }
  }
  // 根据命中文案反查其 key，支持同一文案对应多 key 的场景
  return Object.entries(msg)
    .filter(([, value]) => matched.has(value))
    .map(([key]) => key)
}
