// @easemob/uikit-core 共享基座入口
// P1 Step 1 已迁入：sdk 基座层（client / wire 类型 / user-info & presence domain /
// 连接级事件 / notice 工具）、store（client/theme/user-info/presence）、
// composables/types（Provider 契约）、constants、locale、通用 utils（logger/log-store/
// sdk-log-capture/sdk-error）。
// P1 Step 3 已迁入：共享 composables（client/theme/presence/toast/notification/
// long-press/pull-refresh/viewport/bottom-sheet/ripple/key-bindings/resizable/
// uikit-storage）+ components/notification/types。
// P1 Step 4 已迁入：24 个原子组件（含 story / assets/icons）、theme 变量
//（src/theme/index.css）、通用 utils（download / z-index）。
// P1 Step 6 已迁入：Provider 容器（EmUIKitProvider）+ Provider 共享副作用
// composable（use-provider-side-effects）。
// 详见 docs/CORE-MIGRATION-CHECKLIST.md。

// 主题 CSS 变量入口（构建时经 vite 收拢为 dist/theme/index.css）
import './theme/index.css'

// SDK 基座层
export * from './sdk/client'
export * from './sdk/types'
export { UserInfoDomain } from './sdk/domain/user-info-domain'
export { PresenceDomain, parsePresenceStatus } from './sdk/domain/presence-domain'
export type { PresenceStoreLike } from './sdk/domain/presence-domain'
export * from './sdk/event/connection-events'
export * from './sdk/event/notice-utils'

// Pinia Stores（client / theme / user-info / presence）
export * from './store/client'
export * from './store/theme'
export * from './store/user-info'
export * from './store/presence'

// Provider 契约类型（UIKitDataSource / UIKitFeatures / ContactFetchMode）
export * from './composables/types'

// core Provider 生命周期（client / core stores / presence & userInfo domain）
export { useCoreUIKitProvider, useCoreUIKit, CORE_UIKIT_CONTEXT_KEY } from './composables/use-uikit'
export type { CoreUIKitContext, CoreUIKitLoginParams, CoreStores, CoreUIKitProviderOptions } from './composables/use-uikit'

// Provider 场景无关共享副作用（P1 Step 6 新增，core 与场景 Provider 共用同一实现）
export { useProviderSideEffects, createUserInfoSubscriptionErrorHandler } from './composables/use-provider-side-effects'
export type { ProviderSideEffectsOptions, ProviderThemeConfig, ProviderNotificationConfig, ProviderLoggerConfig, ThemeFontSize } from './composables/use-provider-side-effects'

// H5 适配 / 键盘状态
export { useH5Adaptation } from './composables/use-h5-adaptation'
export type { H5AdaptationConfig } from './composables/use-h5-adaptation'
export { useKeyboard } from './composables/use-keyboard'

// 共享 composables（P1 Step 3 自 uikit-im 迁入，注入点已切换为 useCoreUIKit）
export { useClient } from './composables/use-client'
export { useTheme } from './composables/use-theme'
export { useUserInfo } from './composables/use-user-info'
export { useOwnUserInfo } from './composables/use-own-user-info'
export { usePresence } from './composables/use-presence'
export { useToast } from './composables/use-toast'
export { useNotification, emitNotificationDelivered } from './composables/use-notification'
export type { NotificationChannel, NotificationConfig, NotificationHandler, NotificationTriggerMode } from './composables/use-notification'
export { useLongPress } from './composables/use-long-press'
export type { UseLongPressOptions } from './composables/use-long-press'
export { usePullRefresh } from './composables/use-pull-refresh'
export type { UsePullRefreshOptions } from './composables/use-pull-refresh'
export { useViewport } from './composables/use-viewport'
export { useBottomSheet } from './composables/use-bottom-sheet'
export type { UseBottomSheetOptions } from './composables/use-bottom-sheet'
export { useRipple } from './composables/use-ripple'
export type { RippleOptions } from './composables/use-ripple'
export { useArrowNavigation, useEscToClose, useKeyBindings, isKeyboardShortcutsEnabled, setKeyboardShortcutsEnabled } from './composables/use-key-bindings'
export type { KeyBindingsMap, UseArrowNavigationOptions, UseEscToCloseOptions, UseKeyBindingsOptions } from './composables/use-key-bindings'
export { useResizable } from './composables/use-resizable'
export type { UseResizableOptions } from './composables/use-resizable'
export { createUIKitStorageKey, getStorageBackend, useUIKitStorage } from './composables/use-uikit-storage'
export type { UIKitStorageType } from './composables/use-uikit-storage'

// 原子组件（P1 Step 4 自 uikit-im 迁入）
export * from './components'

// Provider 容器（P1 Step 6：core 侧 EmUIKitProvider）
export * from './containers'

// 枚举常量
export * from './constants'

// 多语言
export * from './locale'

// 通用工具（日志 / SDK 错误 / 下载 / z-index）
export * from './utils/logger'
export * from './utils/log-store'
export * from './utils/sdk-log-capture'
export * from './utils/sdk-error'
export * from './utils/download'
export * from './utils/z-index'
export * from './utils/format-time'
export * from './utils/linkify'
export * from './utils/normalize-user-id'
