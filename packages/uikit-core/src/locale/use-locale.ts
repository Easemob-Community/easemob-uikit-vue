// Locale Vue 响应式适配层（仅本文件依赖 vue）。
// 纯逻辑（文案存储/插值/合并/反查）在 messages.ts（零 vue 依赖）；
// 引擎层（sdk/constants/utils）禁止引用本文件，一律走 messages.ts（门禁
// scripts/check-engine-isolation.mjs）。
import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { getLocale, setLocale, subscribeLocale, translate } from './messages'

export function useLocale() {
  // 内部 ref 与纯逻辑层语言状态单向同步：setLocale（模块级）触发订阅更新
  const locale = ref(getLocale())
  const unsubscribe = subscribeLocale(next => {
    locale.value = next
  })
  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  /**
   * 响应式 t：读取内部 ref 建立响应式依赖，语言切换后模板/computed 自动重求值；
   * 非 setup 上下文（事件回调等）请用 messages.ts 的独立 t。
   */
  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    return translate(key, locale.value, fallback, params)
  }

  return { t, setLocale, locale }
}

/** 设置全局语言并返回当前语言环境下的 t / setLocale（兼容旧签名） */
export function createLocale(locale: string = 'zh-CN') {
  setLocale(locale)
  return { t: useLocale().t, setLocale: useLocale().setLocale }
}
