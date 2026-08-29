import { isSDKError } from 'easemob-websdk'

/**
 * 安全格式化 SDK 错误，便于日志/调试输出。
 * SDK 错误会调用其内置的 `toJSON()`，其他错误保持原样返回。
 */
export function formatSdkError(error: unknown): unknown {
  if (isSDKError(error))
    return error.toJSON()
  return error
}

/**
 * SDK error code 到 UIKit i18n key 的映射。
 * 数值来自 easemob-websdk/dist/utils/error-codes.generated，
 * 仅把业务方最常遇到的错误收敛成用户友好的 toast 文案。
 */
const SDK_ERROR_CODE_I18N_MAP: Record<number, string> = {
  // 连接 / 网络
  1: 'error.unknown',
  2: 'error.network',
  300: 'error.notConnected',
  301: 'error.timeout',
  302: 'error.serverBusy',
  303: 'error.serverError',
  304: 'error.network',
  305: 'error.serviceNotEnabled',

  // 认证 / 权限 / 被踢 / 禁言
  100: 'error.unauthorized',
  107: 'error.invalidConversation',
  108: 'error.tokenExpired',
  110: 'error.validation',
  111: 'error.unsupported',
  200: 'error.unauthorized',
  201: 'error.unauthorized',
  202: 'error.unauthorized',
  204: 'error.notFound',
  210: 'error.forbidden',
  213: 'error.kicked',
  214: 'error.loginTooManyDevices',
  215: 'error.userMuted',
  216: 'error.kicked',
  217: 'error.kicked',
  218: 'error.kicked',
  219: 'error.userMutedByAdmin',
  220: 'error.deviceChanged',
  221: 'error.notOnRoster',
  222: 'error.messageBlockedByRecipient',

  // 文件 / 附件 / 上传
  400: 'error.fileNotFound',
  401: 'error.fileInvalid',
  402: 'error.uploadFailed',
  403: 'error.fileDownloadFailed',
  405: 'error.fileTooLarge',
  406: 'error.fileContentImproper',
  407: 'error.fileExpired',
  410: 'error.fileNotFound',
  411: 'error.fileTooLarge',

  // 消息相关
  500: 'error.internalError',
  501: 'error.illegalContent',
  502: 'error.trafficLimit',
  504: 'message.recall.timeLimit',
  505: 'error.serviceNotEnabled',
  506: 'error.messageExpired',
  510: 'error.messageSizeLimit',

  // 群组
  600: 'error.groupInvalid',
  601: 'error.groupAlreadyJoined',
  602: 'error.groupNotJoined',
  603: 'error.groupPermissionDenied',
  604: 'error.groupMembersFull',
  606: 'error.groupNotExist',
  607: 'error.groupDisabled',
  613: 'error.groupUserInBlocklist',

  // 聊天室
  700: 'error.chatroomInvalid',
  702: 'error.chatroomNotJoined',
  703: 'error.chatroomPermissionDenied',
  704: 'error.chatroomMembersFull',
  705: 'error.chatroomNotExist',

  // 用户属性
  900: 'error.userInfoCountExceed',
  901: 'error.userInfoDataLengthExceed',

  // 联系人
  1000: 'error.contactAlreadyFriend',
  1001: 'error.contactReachLimit',
  1002: 'error.contactReachLimitPeer',

  // 翻译
  1110: 'error.validation',
  1111: 'message.translate.serviceUnavailable',
  1112: 'error.translateUsageLimit',
  1113: 'error.translateFailed',

  // 内容审核 / Reaction
  1200: 'error.moderationFailed',
  1299: 'error.moderationFailed',
  1300: 'error.reactionReachLimit',
  1301: 'error.reactionAlreadyOperated',
  1302: 'error.reactionOperationIllegal',

  // 推送 / 在线状态订阅
  1500: 'error.pushFailed',
  1600: 'error.userInfoSubscriptionLimitExceeded',
  1601: 'error.userInfoSubscriptionTargetLimitExceeded',
}

/**
 * 根据 SDK 错误的 error code 获取对应的 UIKit i18n key。
 * @returns 命中时返回 key，未命中返回 null
 */
export function resolveSdkErrorCodeI18nKey(error: unknown): string | null {
  if (!isSDKError(error))
    return null
  return SDK_ERROR_CODE_I18N_MAP[error.code] ?? null
}

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
  ) {
    return 'error.notConnected'
  }
  if (
    lower.includes('network')
    || lower.includes('net::err')
    || lower.includes('failed to fetch')
    || lower.includes('network request failed')
  ) {
    return 'error.network'
  }
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'error.timeout'
  return 'error.unknown'
}

/**
 * 解析 SDK 错误为最终展示文案。
 * 优先根据 SDK error code 匹配；其次根据错误文本匹配；最后返回 fallbackKey 或原始错误。
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
  const codeKey = resolveSdkErrorCodeI18nKey(error)
  if (codeKey) {
    const message = t(codeKey)
    if (message && message !== codeKey)
      return message
  }

  const reason = extractSdkErrorReason(error)
  const reasonKey = resolveSdkErrorI18nKey(reason)
  if (reasonKey !== 'error.unknown')
    return t(reasonKey) || t(fallbackKey) || reason

  return t(codeKey || fallbackKey) || reason || ''
}
