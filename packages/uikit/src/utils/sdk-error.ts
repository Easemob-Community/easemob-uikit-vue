/**
 * 从 SDK 抛出的错误中提取可读 reason。
 * 兼容 Error 实例、字符串、以及带 reason 字段的对象。
 */
export function extractSdkErrorReason(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  if (error && typeof error === 'object' && 'reason' in error && typeof error.reason === 'string')
    return error.reason
  return String(error)
}

/**
 * 将 SDK 常见英文错误映射为 UIKit 本地化 key。
 * 未命中已知模式时返回 'error.unknown'，由调用方决定是否兜底展示原始错误。
 */
export function resolveSdkErrorI18nKey(reason: string): string {
  const lower = reason.toLowerCase()
  if (
    lower.includes('not connected')
    || lower.includes('disconnected')
    || lower.includes('connection is closed')
    || lower.includes('chatclient is not connected')
  )
    return 'error.notConnected'
  if (
    lower.includes('network')
    || lower.includes('net::err')
    || lower.includes('failed to fetch')
    || lower.includes('network request failed')
  )
    return 'error.network'
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'error.timeout'
  return 'error.unknown'
}

/**
 * 解析 SDK 错误为最终展示文案。
 * @param error 原始错误
 * @param fallbackKey 未命中已知错误时的 UIKit 兜底 i18n key
 * @param t 本地化函数
 * @returns 用于 toast 等提示的文案
 */
export function resolveSdkErrorMessage(
  error: unknown,
  fallbackKey: string,
  t: (key: string) => string,
): string {
  const reason = extractSdkErrorReason(error)
  const key = resolveSdkErrorI18nKey(reason)
  if (key !== 'error.unknown')
    return t(key) || t(fallbackKey) || reason
  return reason || t(fallbackKey) || ''
}
