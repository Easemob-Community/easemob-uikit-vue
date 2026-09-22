// Pinia Stores
// client / presence / theme 已迁入 @easemob-community/uikit-core，此处显式具名 re-export 保持对外 API 不变
export { useClientStore } from '@easemob-community/uikit-core'
export * from './conversation'
export * from './message'
export * from './contact'
export * from './group'
export { usePresenceStore } from '@easemob-community/uikit-core'
export { useThemeStore } from '@easemob-community/uikit-core'
export type {
  AnimationConfig,
  AnimationLevel,
  Density,
  FontSizePreset,
  HoverStyle,
  ThemeMode,
} from '@easemob-community/uikit-core'
