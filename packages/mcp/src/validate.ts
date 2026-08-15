export interface ValidationIssue {
  path: string
  level: 'error' | 'warning'
  message: string
}

const THEME_KEYS = new Set([
  'mode', 'primaryColor', 'gap', 'shape', 'fontSize', 'density',
  'bubbleColor', 'chatBg', 'inputBg',
])
const H5_KEYS = new Set(['safeArea', 'keyboardAdapt', 'pullRefresh', 'fontScale'])
const NOTIFICATION_KEYS = new Set([
  'enable', 'browser', 'inApp', 'autoRequestPermission', 'triggerMode', 'navigateOnClick',
])
const LOGGER_KEYS = new Set([
  'enabled', 'collectSdkLog', 'uikitLevel', 'sdkLevel', 'maxEntries', 'retentionDays',
])

const BOOLEAN_PROPS = [
  'autoInit', 'enableContact', 'enableBlocklist', 'enablePresence', 'enableGroup',
  'enableUserInfo', 'enableUserInfoSubscription', 'enableToast', 'enableDraft',
  'enableAtMe', 'enableTyping',
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * 校验 EmUIKitProvider 的 props 配置对象（JS 对象，camelCase 键，对应 ProviderProps）。
 * 返回问题列表；空数组表示通过。
 */
export function validateProviderConfig(config: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(config)) {
    issues.push({ path: '$', level: 'error', message: '配置必须是对象' })
    return issues
  }
  const c = config

  // appKey 必填 + 格式
  if (typeof c.appKey !== 'string' || c.appKey.trim() === '') {
    issues.push({ path: 'appKey', level: 'error', message: 'appKey 必填，格式为 orgName#appName' })
  }
  else if (!c.appKey.includes('#')) {
    issues.push({ path: 'appKey', level: 'warning', message: `appKey "${c.appKey}" 不含 "#"，请确认为 orgName#appName 格式` })
  }

  // 布尔开关类型
  for (const p of BOOLEAN_PROPS) {
    if (p in c && typeof c[p] !== 'boolean') {
      issues.push({ path: p, level: 'error', message: '应为 boolean' })
    }
  }

  // locale
  if ('locale' in c && c.locale !== 'zh-CN' && c.locale !== 'en') {
    issues.push({ path: 'locale', level: 'error', message: "应为 'zh-CN' 或 'en'" })
  }

  // contactFetchMode
  if ('contactFetchMode' in c && c.contactFetchMode !== 'page' && c.contactFetchMode !== 'all') {
    issues.push({ path: 'contactFetchMode', level: 'error', message: "应为 'page' 或 'all'" })
  }

  // theme
  if (isRecord(c.theme)) {
    const theme = c.theme
    for (const key of Object.keys(theme)) {
      if (!THEME_KEYS.has(key)) {
        issues.push({ path: `theme.${key}`, level: 'warning', message: '未知的 theme 配置项' })
      }
    }
    if ('mode' in theme && !['light', 'dark', 'auto'].includes(theme.mode as string)) {
      issues.push({ path: 'theme.mode', level: 'error', message: "应为 'light' | 'dark' | 'auto'" })
    }
    if ('shape' in theme && !['ground', 'square'].includes(theme.shape as string)) {
      issues.push({ path: 'theme.shape', level: 'error', message: "应为 'ground' | 'square'" })
    }
    if ('density' in theme && !['compact', 'normal', 'comfortable'].includes(theme.density as string)) {
      issues.push({ path: 'theme.density', level: 'error', message: "应为 'compact' | 'normal' | 'comfortable'" })
    }
    if ('primaryColor' in theme && (typeof theme.primaryColor !== 'number' || theme.primaryColor < 0 || theme.primaryColor > 360)) {
      issues.push({ path: 'theme.primaryColor', level: 'error', message: '应为 0-360 的色相数值' })
    }
  }
  else if ('theme' in c) {
    issues.push({ path: 'theme', level: 'error', message: '应为对象' })
  }

  // h5
  if (isRecord(c.h5)) {
    const h5 = c.h5
    for (const key of Object.keys(h5)) {
      if (!H5_KEYS.has(key)) {
        issues.push({ path: `h5.${key}`, level: 'warning', message: '未知的 h5 配置项' })
      }
    }
    if ('safeArea' in h5 && typeof h5.safeArea !== 'boolean') {
      issues.push({ path: 'h5.safeArea', level: 'error', message: '应为 boolean' })
    }
    if ('keyboardAdapt' in h5 && typeof h5.keyboardAdapt !== 'boolean') {
      issues.push({ path: 'h5.keyboardAdapt', level: 'error', message: '应为 boolean' })
    }
    if ('pullRefresh' in h5 && typeof h5.pullRefresh !== 'boolean' && h5.pullRefresh !== 'auto') {
      issues.push({ path: 'h5.pullRefresh', level: 'error', message: "应为 boolean 或 'auto'" })
    }
  }

  // notification
  if (isRecord(c.notification)) {
    const n = c.notification
    for (const key of Object.keys(n)) {
      if (!NOTIFICATION_KEYS.has(key)) {
        issues.push({ path: `notification.${key}`, level: 'warning', message: '未知的 notification 配置项' })
      }
    }
    if ('triggerMode' in n && !['background', 'always'].includes(n.triggerMode as string)) {
      issues.push({ path: 'notification.triggerMode', level: 'error', message: "应为 'background' | 'always'" })
    }
  }

  // logger
  if (isRecord(c.logger)) {
    const l = c.logger
    for (const key of Object.keys(l)) {
      if (!LOGGER_KEYS.has(key)) {
        issues.push({ path: `logger.${key}`, level: 'warning', message: '未知的 logger 配置项' })
      }
    }
  }

  // token 回调
  for (const p of ['onTokenWillExpire', 'onTokenExpired']) {
    if (p in c && typeof c[p] !== 'function') {
      issues.push({ path: p, level: 'error', message: '应为函数' })
    }
  }

  // dataSource
  if ('dataSource' in c && !isRecord(c.dataSource)) {
    issues.push({ path: 'dataSource', level: 'error', message: '应为对象' })
  }

  return issues
}
