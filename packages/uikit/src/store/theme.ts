import { defineStore } from 'pinia'
import { computed, watchEffect } from 'vue'
import { useStorage, usePreferredColorScheme } from '@vueuse/core'

/** 动画强度等级 */
export type AnimationLevel = 'subtle' | 'normal' | 'expressive'

/** 列表项 hover 风格 */
export type HoverStyle = 'default' | 'rounded'

/** 主题模式：light / dark / auto(跟随系统) */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 动画配置 */
export interface AnimationConfig {
  /** 全局动画开关，默认 true */
  enabled?: boolean
  /** 动画强度等级，默认 'normal' */
  level?: AnimationLevel
  /** 按钮波纹效果，默认 true */
  ripple?: boolean
}

/** localStorage key */
const THEME_STORAGE_KEY = 'easemob_uikit_theme'

/** 持久化的主题状态 */
interface ThemeStorageState {
  primaryColor: number
  mode: ThemeMode
  avatarShape: 'circle' | 'square'
  bubbleShape: 'ground' | 'square'
  componentsShape: 'ground' | 'square'
  containerGap: number
  hoverStyle: HoverStyle
  animationEnabled: boolean
  animationLevel: AnimationLevel
  animationRipple: boolean
}

const defaultState: ThemeStorageState = {
  primaryColor: 203,
  mode: 'auto',
  avatarShape: 'circle',
  bubbleShape: 'ground',
  componentsShape: 'ground',
  containerGap: 8,
  hoverStyle: 'default',
  animationEnabled: true,
  animationLevel: 'normal',
  animationRipple: true,
}

export const useThemeStore = defineStore('theme', () => {
  const storage = useStorage<ThemeStorageState>(THEME_STORAGE_KEY, defaultState)

  // 使用 computed 保持响应性，同时支持读写
  const primaryColor = computed({
    get: () => storage.value.primaryColor,
    set: (v: number) => { storage.value.primaryColor = v },
  })
  const mode = computed({
    get: () => storage.value.mode,
    set: (v: ThemeMode) => { storage.value.mode = v },
  })

  // 系统偏好颜色方案（light / dark）
  const systemMode = usePreferredColorScheme()

  // 实际生效的模式：auto 时跟随系统
  const effectiveMode = computed<'light' | 'dark'>(() => {
    if (mode.value === 'auto') {
      return systemMode.value === 'dark' ? 'dark' : 'light'
    }
    return mode.value
  })
  const avatarShape = computed({
    get: () => storage.value.avatarShape,
    set: (v: 'circle' | 'square') => { storage.value.avatarShape = v },
  })
  const bubbleShape = computed({
    get: () => storage.value.bubbleShape,
    set: (v: 'ground' | 'square') => { storage.value.bubbleShape = v },
  })
  const componentsShape = computed({
    get: () => storage.value.componentsShape,
    set: (v: 'ground' | 'square') => { storage.value.componentsShape = v },
  })
  const containerGap = computed({
    get: () => storage.value.containerGap,
    set: (v: number) => { storage.value.containerGap = v },
  })
  const hoverStyle = computed({
    get: () => storage.value.hoverStyle,
    set: (v: HoverStyle) => { storage.value.hoverStyle = v },
  })
  const animationEnabled = computed({
    get: () => storage.value.animationEnabled,
    set: (v: boolean) => { storage.value.animationEnabled = v },
  })
  const animationLevel = computed({
    get: () => storage.value.animationLevel,
    set: (v: AnimationLevel) => { storage.value.animationLevel = v },
  })
  const animationRipple = computed({
    get: () => storage.value.animationRipple,
    set: (v: boolean) => { storage.value.animationRipple = v },
  })

  // 初始化：立即将当前值写入 CSS 变量，确保懒加载 store 时也有样式
  document.documentElement.style.setProperty('--uikit-primary-color', `hsl(${primaryColor.value}, 100%, 60%)`)
  document.documentElement.style.setProperty('--uikit-primary-color-opacity', `hsla(${primaryColor.value}, 100%, 60%, 0.25)`)
  document.documentElement.setAttribute('data-uikit-theme', effectiveMode.value)
  document.documentElement.style.setProperty('--uikit-item-hover-radius', hoverStyle.value === 'rounded' ? '8px' : '0px')
  document.documentElement.style.setProperty('--uikit-item-hover-margin-x', hoverStyle.value === 'rounded' ? '8px' : '0px')
  document.documentElement.style.setProperty('--uikit-item-hover-padding-x', hoverStyle.value === 'rounded' ? '8px' : '16px')
  document.documentElement.style.setProperty('--uikit-item-active-radius', hoverStyle.value === 'rounded' ? '8px' : '0px')
  document.documentElement.style.setProperty('--uikit-components-radius', componentsShape.value === 'ground' ? '8px' : '4px')
  document.documentElement.style.setProperty('--uikit-components-radius-hover', componentsShape.value === 'ground' ? '14px' : '10px')
  document.documentElement.style.setProperty('--uikit-container-gap', `${Math.max(0, containerGap.value)}px`)
  document.documentElement.setAttribute('data-uikit-anim-enabled', String(animationEnabled.value))
  document.documentElement.setAttribute('data-uikit-anim-level', animationLevel.value)

  watchEffect(() => {
    const hue = primaryColor.value
    document.documentElement.style.setProperty(
      '--uikit-primary-color',
      `hsl(${hue}, 100%, 60%)`
    )
    document.documentElement.style.setProperty(
      '--uikit-primary-color-opacity',
      `hsla(${hue}, 100%, 60%, 0.25)`
    )
    document.documentElement.setAttribute('data-uikit-theme', effectiveMode.value)
  })

  // Hover 风格 DOM 属性联动
  watchEffect(() => {
    const isRounded = hoverStyle.value === 'rounded'
    document.documentElement.style.setProperty(
      '--uikit-item-hover-radius',
      isRounded ? '8px' : '0px'
    )
    document.documentElement.style.setProperty(
      '--uikit-item-hover-margin-x',
      isRounded ? '8px' : '0px'
    )
    document.documentElement.style.setProperty(
      '--uikit-item-hover-padding-x',
      isRounded ? '8px' : '16px'
    )
    document.documentElement.style.setProperty(
      '--uikit-item-active-radius',
      isRounded ? '8px' : '0px'
    )
  })

  // 组件形状 / 圆角 DOM 属性联动
  watchEffect(() => {
    const isRounded = componentsShape.value === 'ground'
    document.documentElement.style.setProperty(
      '--uikit-components-radius',
      isRounded ? '8px' : '4px'
    )
    document.documentElement.style.setProperty(
      '--uikit-components-radius-hover',
      isRounded ? '14px' : '10px'
    )
  })

  // 容器间距 DOM 属性联动
  watchEffect(() => {
    document.documentElement.style.setProperty(
      '--uikit-container-gap',
      `${Math.max(0, containerGap.value)}px`
    )
  })

  // 动画相关 DOM 属性联动
  watchEffect(() => {
    document.documentElement.setAttribute(
      'data-uikit-anim-enabled',
      String(animationEnabled.value)
    )
  })

  watchEffect(() => {
    document.documentElement.setAttribute(
      'data-uikit-anim-level',
      animationLevel.value
    )
  })

  function setPrimaryColor(hue: number) {
    primaryColor.value = hue
  }

  function setMode(value: ThemeMode) {
    mode.value = value
  }

  function setAvatarShape(shape: 'circle' | 'square') {
    avatarShape.value = shape
  }

  function setBubbleShape(shape: 'ground' | 'square') {
    bubbleShape.value = shape
  }

  function setComponentsShape(shape: 'ground' | 'square') {
    componentsShape.value = shape
  }

  // ===== Container gap setter =====
  function setContainerGap(gap: number) {
    containerGap.value = Math.max(0, gap)
  }

  // ===== Hover setters =====
  function setHoverStyle(style: HoverStyle) {
    hoverStyle.value = style
  }

  // ===== 动画 setters =====
  function setAnimationEnabled(value: boolean) {
    animationEnabled.value = value
  }

  function setAnimationLevel(level: AnimationLevel) {
    animationLevel.value = level
  }

  function setAnimationRipple(value: boolean) {
    animationRipple.value = value
  }

  /**
   * 批量应用动画配置
   */
  function applyAnimationConfig(config: AnimationConfig) {
    if (config.enabled !== undefined) animationEnabled.value = config.enabled
    if (config.level !== undefined) animationLevel.value = config.level
    if (config.ripple !== undefined) animationRipple.value = config.ripple
  }

  return {
    primaryColor,
    mode,
    effectiveMode,
    avatarShape,
    bubbleShape,
    componentsShape,
    containerGap,
    hoverStyle,
    animationEnabled,
    animationLevel,
    animationRipple,
    setPrimaryColor,
    setMode,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
    setContainerGap,
    setHoverStyle,
    setAnimationEnabled,
    setAnimationLevel,
    setAnimationRipple,
    applyAnimationConfig,
  }
})
