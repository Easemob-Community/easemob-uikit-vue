// Utility Functions
export * from './format-message'
// sdk-error / download / z-index / format-time / linkify 已迁入 @easemob/uikit-core，此处显式具名 re-export 保持对外 API 不变
export { createConversationTimeFormatter, hasUrl, linkify } from '@easemob/uikit-core'
export type { LinkSegment } from '@easemob/uikit-core'
export {
  extractSdkErrorReason,
  formatSdkError,
  resolveSdkErrorCodeI18nKey,
  resolveSdkErrorI18nKey,
  resolveSdkErrorMessage,
} from '@easemob/uikit-core'
export {
  detectEnvironment,
  downloadFile,
  getDownloadStrategy,
  isCrossOrigin,
} from '@easemob/uikit-core'
export type { DownloadEnvironment, DownloadOptions } from '@easemob/uikit-core'
export { nextZIndex, resetZIndex } from '@easemob/uikit-core'
export * from './resolve-last-message-text'
export * from './mention'

export function isEmpty(val: unknown): boolean {
  return val === undefined || val === null || val === ''
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
