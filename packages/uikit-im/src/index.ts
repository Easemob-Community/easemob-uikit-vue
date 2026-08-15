import type { App, Component, Plugin } from 'vue'
// side-effect：注册 UIKit logger → 日志持久化内核的 sink（见 utils/logger-binding.ts）
import './utils/logger-binding'

// Components
export * from './components'

// Modules
export * from './modules'

// Containers
export * from './containers'

// Composables
export * from './composables'

// Store
export * from './store'

// SDK
export * from './sdk'

// Constants（已迁入 @easemob/uikit-core，此处显式具名 re-export 保持对外 API 不变）
export {
  ACK_TYPE,
  CONVERSATION_TYPE,
  FORWARD_MODE,
  GROUP_INFO_LIMIT,
  GROUP_MEMBER_ROLE,
  HEADER_ALIGN,
  INJECTION_KEY,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  NOTICE_EVENT_TYPE,
  PRESENCE_STATUS,
  STREAM_CUSTOM_TYPE,
  STREAM_MESSAGE_STATUS,
} from '@easemob/uikit-core'
export type {
  AckTypeValue,
  ConversationTypeValue,
  ForwardModeValue,
  GroupMemberRoleValue,
  HeaderAlignValue,
  MessageStatusValue,
  MessageTypeValue,
  NoticeEventTypeValue,
  PresenceStatusValue,
  StreamCustomTypeValue,
  StreamMessageStatusValue,
} from '@easemob/uikit-core'

// Utils
export * from './utils/resolve-last-message-text'
export {
  clearPersistedLogs,
  configureLogPersistence,
  exportPersistedLogs,
  formatPersistedLogs,
  getPersistedLogs,
} from '@easemob/uikit-core'
export type {
  LogPersistenceConfig,
  PersistedLogEntry,
  PersistedLogFilter,
  PersistedLogLevel,
  PersistedLogSource,
  SdkPersistedLogLevel,
} from '@easemob/uikit-core'

// Locale（已迁入 @easemob/uikit-core，此处显式具名 re-export 保持对外 API 不变）
export {
  createLocale,
  findLocaleKey,
  mergeLocaleMessages,
  t,
  useLocale,
} from '@easemob/uikit-core'
export type {
  FindLocaleKeyOptions,
  LocaleMessages,
} from '@easemob/uikit-core'

// Theme
import './theme/index.css'

// 用于全量扫描的命名空间导入
import * as components from './components'
import * as containers from './containers'
import * as modules from './modules'

/**
 * `app.use(UIKit, options)` 的可选参数。
 */
export interface UIKitInstallOptions {
  /**
   * 全局注册组件时使用的前缀，默认 `'Em'`，与 `EasemobUIKitResolver` 保持一致。
   *
   * - 默认情况下，组件以 `Em*` 形式注册（如 `EmButton`、`EmChatContainer`）。
   * - 传入自定义前缀时，会将原 `Em` 前缀替换为该前缀。
   *   例如 `prefix: 'My'` → `EmButton` 注册为 `MyButton`。
   */
  prefix?: string
}

function isVueComponent(value: unknown): boolean {
  if (!value) return false
  const t = typeof value
  if (t === 'function') return true
  if (t !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    'render' in obj ||
    'setup' in obj ||
    'template' in obj ||
    '__file' in obj ||
    '__name' in obj
  )
}

/**
 * Vue 插件安装函数。
 *
 * 支持两种使用方式：
 * 1. `app.use(UIKit)` —— 一把梭全局注册，组件名带默认 `Em` 前缀。
 * 2. `app.use(UIKit, { prefix: 'My' })` —— 自定义前缀全局注册。
 *
 * 注：若追求更优的 tree-shaking，请改用 `EasemobUIKitResolver` 实现按需导入，
 * 此时无需调用 `app.use(UIKit)`。Pinia 仍需使用方自行创建并注册。
 */
export function install(app: App, options: UIKitInstallOptions = {}) {
  const prefix = options.prefix ?? 'Em'
  const allExports: Record<string, unknown> = {
    ...components,
    ...containers,
    ...modules,
  }
  for (const [name, value] of Object.entries(allExports)) {
    // 仅注册以 Em 开头的具名导出（其余为类型 / 常量 / 工具函数）
    if (!name.startsWith('Em')) continue
    if (!isVueComponent(value)) continue
    const finalName = prefix === 'Em' ? name : `${prefix}${name.slice(2)}`
    app.component(finalName, value as Component)
  }
}

const UIKit: Plugin = { install }
export default UIKit
