import { defineStore } from 'pinia'
import { computed, watchEffect } from 'vue'
import { useStorage, usePreferredColorScheme } from '@vueuse/core'

/** 动画强度等级 */
export type AnimationLevel = 'subtle' | 'normal' | 'expressive'

/** 列表项 hover 风格 */
export type HoverStyle = 'default' | 'rounded' | 'square'

/** 主题模式：light / dark / auto(跟随系统) */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 字号档位 */
export type FontSizePreset = 'normal' | 'large' | 'xlarge'

/** 密度档位 */
export type Density = 'compact' | 'normal' | 'comfortable'

/**
 * 主色输入：色相数字（0-360，保留当前 S/L）或完整 HSL 对象。
 * 完整 HSL 对象用于「取色器选完整颜色」场景；数字则只改色相、保留饱和度与亮度。
 */
export type PrimaryColorInput =
  | number
  | { h: number; s: number; l: number }

/** 预设主题档位 */
export type ThemePreset = 'default' | 'business' | 'fresh'

/** 预设主题配置：一次应用多个维度 */
export interface ThemePresetConfig {
  /** 主色相（0-360，hsl hue） */
  primaryColor: number
  /** 组件圆角模式 */
  componentsShape: 'ground' | 'square'
  /** 气泡形状 */
  bubbleShape: 'ground' | 'square'
  /** 容器间距（px） */
  containerGap: number
  /** 密度档位 */
  density: Density
  /** 列表项 hover 风格 */
  hoverStyle: HoverStyle
  /** 可选：对方气泡背景 */
  bubbleBgOther?: string
  /** 可选：自己气泡背景 */
  bubbleBgSelf?: string
  /** 可选：聊天背景 */
  chatBg?: string
}

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
  /** 主色饱和度（0-100 %），默认 100 */
  primaryColorSat: number
  /** 主色亮度（0-100 %），默认 60 */
  primaryColorLum: number
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
  /** 密度档位 */
  density: Density
  /** 预设主题档位 */
  preset: ThemePreset
  /** 对方气泡背景色 */
  bubbleBgOther?: string
  /** 自己气泡背景色 */
  bubbleBgSelf?: string
  /** 聊天背景（支持颜色/渐变/图片 url） */
  chatBg?: string
  /** 输入区背景 */
  inputBg?: string
  /** 自定义 hover 背景色（可选；不配置时走内置浅/深默认 --uikit-bg-hover） */
  hoverColor?: string
  /** 自定义 active（选中）背景色（可选；不配置时走内置 rgba(primary-rgb, α) 跟随主色） */
  activeColor?: string
  /** 自定义弱化/占位图标色（可选；不配置时走内置浅/深默认 --uikit-icon-muted） */
  iconMutedColor?: string
}

const defaultState: ThemeStorageState = {
  primaryColor: 203,
  primaryColorSat: 100,
  primaryColorLum: 60,
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
  density: 'normal',
  preset: 'default',
  bubbleBgOther: undefined,
  bubbleBgSelf: undefined,
  chatBg: undefined,
  inputBg: undefined,
  hoverColor: undefined,
  activeColor: undefined,
  iconMutedColor: undefined,
}

/** 字号档位 → scale 映射 */
const FONT_SIZE_PRESET_MAP: Record<FontSizePreset, number> = {
  normal: 1,
  large: 1.125,
  xlarge: 1.25,
}

/** 预设主题表：setPreset 时批量应用到各维度（对外导出，便于 docs / 业务读取可用预设） */
export const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  default: {
    primaryColor: 203,
    componentsShape: 'ground',
    bubbleShape: 'ground',
    containerGap: 8,
    density: 'normal',
    hoverStyle: 'default',
  },
  business: {
    primaryColor: 217,
    componentsShape: 'square',
    bubbleShape: 'ground',
    containerGap: 4,
    density: 'compact',
    hoverStyle: 'square',
  },
  fresh: {
    primaryColor: 150,
    componentsShape: 'ground',
    bubbleShape: 'ground',
    containerGap: 12,
    density: 'comfortable',
    hoverStyle: 'rounded',
  },
}

/** 数值夹取到 [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
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
  // 主色饱和度/亮度（兼容旧 localStorage：旧缓存无这些字段，回落到 100 / 60）
  const primaryColorSat = computed({
    get: () => storage.value.primaryColorSat ?? 100,
    set: (v: number) => { storage.value.primaryColorSat = v },
  })
  const primaryColorLum = computed({
    get: () => storage.value.primaryColorLum ?? 60,
    set: (v: number) => { storage.value.primaryColorLum = v },
  })
  const primaryColorHsl = computed(() => ({
    h: primaryColor.value,
    s: primaryColorSat.value,
    l: primaryColorLum.value,
  }))
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
    // 兼容旧 localStorage：旧缓存无该字段时回落到圆形（全局默认）
    get: () => storage.value.avatarShape ?? 'circle',
    set: (v: 'circle' | 'square') => { storage.value.avatarShape = v },
  })
  const bubbleShape = computed({
    // 兼容旧 localStorage：旧缓存无该字段时回落到 round 档（16px 圆角）
    get: () => storage.value.bubbleShape ?? 'ground',
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
  const density = computed({
    // 兼容旧 localStorage：旧缓存中可能无 density 字段，回落到 normal
    get: () => storage.value.density ?? 'normal',
    set: (v: Density) => { storage.value.density = v },
  })
  const preset = computed({
    // 兼容旧 localStorage：旧缓存中可能无 preset 字段，回落到 default
    get: () => storage.value.preset ?? 'default',
    set: (v: ThemePreset) => { storage.value.preset = v },
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
  const hoverColor = computed({
    get: () => storage.value.hoverColor,
    set: (v: string | undefined) => { storage.value.hoverColor = v },
  })
  const activeColor = computed({
    get: () => storage.value.activeColor,
    set: (v: string | undefined) => { storage.value.activeColor = v },
  })
  const iconMutedColor = computed({
    get: () => storage.value.iconMutedColor,
    set: (v: string | undefined) => { storage.value.iconMutedColor = v },
  })

  // watchEffect 首次会同步执行一遍，初始值与后续变更统一由这里写入 DOM，不再单独直写
  watchEffect(() => {
    const h = primaryColor.value
    const s = clamp(primaryColorSat.value, 0, 100)
    const l = clamp(primaryColorLum.value, 0, 100)
    document.documentElement.style.setProperty(
      '--uikit-primary-color',
      `hsl(${h}, ${s}%, ${l}%)`
    )
    document.documentElement.style.setProperty(
      '--uikit-primary-color-opacity',
      `hsla(${h}, ${s}%, ${l}%, 0.25)`
    )
    // 同步重算 primary-rgb，保证 rgba(var(--uikit-primary-rgb), α) 跟随主题色
    document.documentElement.style.setProperty(
      '--uikit-primary-rgb',
      hslToRgbString(h, s, l)
    )
    // hover 态：保留主色饱和度，亮度略降（默认 60→50，与既有视觉一致）
    document.documentElement.style.setProperty(
      '--uikit-primary-hover',
      `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`
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

  // 密度档：通过 data-uikit-density 驱动 CSS 变量覆盖
  watchEffect(() => {
    document.documentElement.setAttribute('data-uikit-density', density.value)
  })

  // 高频语义 token：气泡色、聊天背景、输入区背景。
  // 注意：值为空（未自定义）时不能用 setProperty 写入空串——空串以 inline 覆盖
  // 样式表里的 :root/[data-uikit-theme] 默认值（如 --uikit-chat-bg: var(--uikit-bg-base)），
  // 导致 background: var(--uikit-chat-bg) 替换成空值后在计算值阶段非法，回落为 transparent，
  // 使聊天容器/空态背景透出父容器，与使用 --uikit-bg-base 的列表容器在深色下不一致。
  // 统一改写：有值才写入，没值则移除 inline 覆盖，让主题 CSS 默认值（随明暗模式切换）生效。
  function applySemanticToken(name: string, value: string | undefined) {
    if (value) {
      document.documentElement.style.setProperty(name, value)
    }
    else {
      document.documentElement.style.removeProperty(name)
    }
  }
  watchEffect(() => {
    applySemanticToken('--uikit-bubble-bg-other', bubbleBgOther.value)
    applySemanticToken('--uikit-bubble-bg-self', bubbleBgSelf.value)
    applySemanticToken('--uikit-chat-bg', chatBg.value)
    applySemanticToken('--uikit-input-bg', inputBg.value)
  })

  // 自定义 hover / active / 弱化图标色：有值才写入，无值则移除 inline，让主题 CSS 的
  // 浅/深默认值（--uikit-bg-hover / --uikit-bg-active / --uikit-icon-muted）生效。
  // 注意：自定义值为单值，同时作用于浅色与深色模式（inline 优先级高于 [data-uikit-theme="dark"]）。
  watchEffect(() => {
    applySemanticToken('--uikit-bg-hover', hoverColor.value)
    applySemanticToken('--uikit-bg-active', activeColor.value)
    applySemanticToken('--uikit-icon-muted', iconMutedColor.value)
  })

  // Hover 风格 DOM 属性联动（三档）：
  // - default（内置默认）：圆角 8px 整行高亮，无左右缩进；
  // - rounded：圆角 + 卡片式左右缩进（8px）与内容内缩；
  // - square：直角整行高亮（方正风格，供 business 预设等场景）。
  watchEffect(() => {
    const isRounded = hoverStyle.value === 'rounded'
    const isSquare = hoverStyle.value === 'square'
    document.documentElement.style.setProperty(
      '--uikit-item-hover-radius',
      isSquare ? '0px' : '8px'
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
      isSquare ? '0px' : '8px'
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

  function setPrimaryColor(color: PrimaryColorInput) {
    if (typeof color === 'number') {
      primaryColor.value = color
    }
    else {
      primaryColor.value = color.h
      primaryColorSat.value = color.s
      primaryColorLum.value = color.l
    }
  }

  function setPrimaryColorSat(value: number) {
    primaryColorSat.value = clamp(value, 0, 100)
  }

  function setPrimaryColorLum(value: number) {
    primaryColorLum.value = clamp(value, 0, 100)
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

  function setDensity(value: Density) {
    density.value = value
  }

  /**
   * 应用预设主题：一次性覆盖主色 / 形状 / 间距 / 密度 / hover 风格。
   * 预设是基底，应用后仍可用单项 setter 继续微调（单项覆盖优先）。
   */
  function setPreset(key: ThemePreset) {
    preset.value = key
    const config = THEME_PRESETS[key]
    if (!config)
      return
    primaryColor.value = config.primaryColor
    componentsShape.value = config.componentsShape
    bubbleShape.value = config.bubbleShape
    containerGap.value = config.containerGap
    density.value = config.density
    hoverStyle.value = config.hoverStyle
    if (config.bubbleBgOther !== undefined)
      bubbleBgOther.value = config.bubbleBgOther
    if (config.bubbleBgSelf !== undefined)
      bubbleBgSelf.value = config.bubbleBgSelf
    if (config.chatBg !== undefined)
      chatBg.value = config.chatBg
  }

  function setBubbleBg(other?: string | null, self?: string | null) {
    if (other !== undefined) bubbleBgOther.value = other ?? undefined
    if (self !== undefined) bubbleBgSelf.value = self ?? undefined
  }

  function setChatBg(value?: string) {
    chatBg.value = value
  }

  function setInputBg(value?: string) {
    inputBg.value = value
  }

  /** 设置自定义 hover 背景色；传 undefined 恢复内置浅/深默认 */
  function setHoverColor(value?: string) {
    hoverColor.value = value
  }

  /** 设置自定义 active（选中）背景色；传 undefined 恢复内置跟随主色 */
  function setActiveColor(value?: string) {
    activeColor.value = value
  }

  /** 设置自定义弱化/占位图标色；传 undefined 恢复内置浅/深默认 */
  function setIconMutedColor(value?: string) {
    iconMutedColor.value = value
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
    primaryColorSat,
    primaryColorLum,
    primaryColorHsl,
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
    density,
    preset,
    bubbleBgOther,
    bubbleBgSelf,
    chatBg,
    inputBg,
    hoverColor,
    activeColor,
    iconMutedColor,
    setPrimaryColor,
    setPrimaryColorSat,
    setPrimaryColorLum,
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
    setDensity,
    setPreset,
    setBubbleBg,
    setChatBg,
    setInputBg,
    setHoverColor,
    setActiveColor,
    setIconMutedColor,
    applyAnimationConfig,
  }
})
