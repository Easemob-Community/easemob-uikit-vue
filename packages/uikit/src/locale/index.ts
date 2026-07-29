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
