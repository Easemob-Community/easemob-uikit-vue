// Locale
export * from './type'
export * from './zh-CN'
export * from './en'

import { ref, computed } from 'vue'
import type { LocaleMessages } from './type'
import zhCN from './zh-CN'
import en from './en'

const messages: Record<string, LocaleMessages> = {
  'zh-CN': zhCN,
  'en': en,
}

const currentLocale = ref<string>('zh-CN')

export function useLocale() {
  const t = (key: string): string => {
    const msg = messages[currentLocale.value]
    return msg?.[key] || key
  }

  const setLocale = (locale: string) => {
    currentLocale.value = locale
  }

  const locale = computed(() => currentLocale.value)

  return { t, setLocale, locale }
}

export function createLocale(locale: string = 'zh-CN') {
  currentLocale.value = locale
  return { t: useLocale().t, setLocale: useLocale().setLocale }
}
