// Locale 出口（公共 API 面稳定：useLocale / t / createLocale / mergeLocaleMessages /
// findLocaleKey / FindLocaleKeyOptions / type / zh-CN / en）。
// 实现分层：messages.ts 纯 TS（零 vue，引擎层与事件回调可用）；
// use-locale.ts 提供 Vue 响应式 useLocale（组件/composable 使用）。
export * from './type'
export * from './zh-CN'
export * from './en'
export { t, mergeLocaleMessages, findLocaleKey } from './messages'
export type { FindLocaleKeyOptions } from './messages'
export { useLocale, createLocale } from './use-locale'
