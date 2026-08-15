// Pinia Stores
// client / presence / theme 已迁入 @easemob/uikit-core，此处显式具名 re-export 保持对外 API 不变
export { useClientStore } from '@easemob/uikit-core'
export * from './conversation'
export * from './message'
export * from './contact'
export * from './group'
export { usePresenceStore } from '@easemob/uikit-core'
export { useThemeStore } from '@easemob/uikit-core'
export type {
  AnimationConfig,
  AnimationLevel,
  Density,
  FontSizePreset,
  HoverStyle,
  ThemeMode,
} from '@easemob/uikit-core'
