import { defineStore } from 'pinia'
import { computed, watchEffect } from 'vue'
import { useStorage, usePreferredColorScheme } from '@vueuse/core'

/** 动画强度等级 */
export type AnimationLevel = 'subtle' | 'normal' | 'expressive'

/** 列表项 hover 风格 */
export type HoverStyle = 'default' | 'rounded'

/** 主题模式：light / dark / auto(跟随系统) */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 字号档位 */
export type FontSizePreset = 'normal' | 'large' | 'xlarge'

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
  fontSizeScale: number
  /** 对方气泡背景色 */
  bubbleBgOther?: string
  /** 自己气泡背景色 */
  bubbleBgSelf?: string
  /** 聊天背景（支持颜色/渐变/图片 url） */
  chatBg?: string
  /** 输入区背景 */
  inputBg?: string
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
  fontSizeScale: 1,
  bubbleBgOther: undefined,
  bubbleBgSelf: undefined,
  chatBg: undefined,
  inputBg: undefined,
}

/** 字号档位 → scale 映射 */
const FONT_SIZE_PRESET_MAP: Record<FontSizePreset, number> = {
  normal: 1,
  large: 1.125,
  xlarge: 1.25,
}

/** hsl → "r, g, b" 字符串，用于 --uikit-primary-rgb（供 rgba(var(--uikit-primary-rgb), α) 场景） */
function hslToRgbString(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const hp = ((h % 360) + 360) % 360
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 60) { r = c; g = x }
  else if (hp < 120) { r = x; g = c }
  else if (hp < 180) { g = c; b = x }
  else if (hp < 240) { g = x; b = c }
  else if (hp < 300) { r = x; b = c }
  else { r = c; b = x }
  return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`
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
  const fontSizeScale = computed({
    // 兼容旧 localStorage：旧缓存中可能无 fontSizeScale 字段，回落到 1
    get: () => storage.value.fontSizeScale ?? 1,
    set: (v: number) => { storage.value.fontSizeScale = v },
  })
  const bubbleBgOther = computed({
    get: () => storage.value.bubbleBgOther,
    set: (v: string | undefined) => { storage.value.bubbleBgOther = v },
  })
  const bubbleBgSelf = computed({
    get: () => storage.value.bubbleBgSelf,
    set: (v: string | undefined) => { storage.value.bubbleBgSelf = v },
  })
  const chatBg = computed({
    get: () => storage.value.chatBg,
    set: (v: string | undefined) => { storage.value.chatBg = v },
  })
  const inputBg = computed({
    get: () => storage.value.inputBg,
    set: (v: string | undefined) => { storage.value.inputBg = v },
  })

  // watchEffect 首次会同步执行一遍，初始值与后续变更统一由这里写入 DOM，不再单独直写
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
    // 同步重算 primary-rgb，保证 rgba(var(--uikit-primary-rgb), α) 跟随主题色
    document.documentElement.style.setProperty(
      '--uikit-primary-rgb',
      hslToRgbString(hue, 100, 60)
    )
    document.documentElement.style.setProperty(
      '--uikit-primary-hover',
      `hsl(${hue}, 100%, 50%)`
    )
    document.documentElement.setAttribute('data-uikit-theme', effectiveMode.value)
  })

  // 字号缩放：写入 --uikit-font-scale，驱动 --uikit-font-size-* token
  watchEffect(() => {
    const scale = Number.isFinite(fontSizeScale.value) ? fontSizeScale.value : 1
    document.documentElement.style.setProperty(
      '--uikit-font-scale',
      String(Math.max(0.5, scale))
    )
  })

  // 高频语义 token：气泡色、聊天背景、输入区背景
  watchEffect(() => {
    document.documentElement.style.setProperty('--uikit-bubble-bg-other', bubbleBgOther.value || '')
    document.documentElement.style.setProperty('--uikit-bubble-bg-self', bubbleBgSelf.value || '')
    document.documentElement.style.setProperty('--uikit-chat-bg', chatBg.value || '')
    document.documentElement.style.setProperty('--uikit-input-bg', inputBg.value || '')
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

  function setFontSizeScale(scale: number) {
    const value = Number.isFinite(scale) ? scale : 1
    fontSizeScale.value = Math.max(0.5, value)
  }

  function setFontSize(preset: FontSizePreset) {
    const scale = FONT_SIZE_PRESET_MAP[preset]
    if (scale !== undefined) {
      fontSizeScale.value = scale
    }
  }

  function setBubbleBg(other?: string, self?: string) {
    if (other !== undefined) bubbleBgOther.value = other
    if (self !== undefined) bubbleBgSelf.value = self
  }

  function setChatBg(value?: string) {
    chatBg.value = value
  }

  function setInputBg(value?: string) {
    inputBg.value = value
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
    fontSizeScale,
    bubbleBgOther,
    bubbleBgSelf,
    chatBg,
    inputBg,
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
    setFontSizeScale,
    setFontSize,
    setBubbleBg,
    setChatBg,
    setInputBg,
    applyAnimationConfig,
  }
})
