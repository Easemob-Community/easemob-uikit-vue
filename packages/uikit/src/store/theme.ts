import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

/** 动画强度等级 */
export type AnimationLevel = 'subtle' | 'normal' | 'expressive'

/** 列表项 hover 风格 */
export type HoverStyle = 'default' | 'rounded'

/** 动画配置 */
export interface AnimationConfig {
  /** 全局动画开关，默认 true */
  enabled?: boolean
  /** 动画强度等级，默认 'normal' */
  level?: AnimationLevel
  /** 按钮波纹效果，默认 true */
  ripple?: boolean
}

export const useThemeStore = defineStore('theme', () => {
  const primaryColor = ref<number>(203)
  const mode = ref<'light' | 'dark'>('light')
  const avatarShape = ref<'circle' | 'square'>('circle')
  const bubbleShape = ref<'ground' | 'square'>('ground')
  const componentsShape = ref<'ground' | 'square'>('ground')

  // ===== 容器间距配置 =====
  const containerGap = ref<number>(8)

  // ===== Hover 风格配置 =====
  const hoverStyle = ref<HoverStyle>('default')

  // ===== 动画配置 =====
  const animationEnabled = ref(true)
  const animationLevel = ref<AnimationLevel>('normal')
  const animationRipple = ref(true)

  // 初始化：立即将默认值写入 CSS 变量，确保懒加载 store 时也有初始样式
  document.documentElement.style.setProperty('--uikit-primary-color', `hsl(${primaryColor.value}, 100%, 60%)`)
  document.documentElement.style.setProperty('--uikit-primary-color-opacity', `hsla(${primaryColor.value}, 100%, 60%, 0.25)`)
  document.documentElement.setAttribute('data-uikit-theme', mode.value)
  document.documentElement.style.setProperty('--uikit-item-hover-radius', '0px')
  document.documentElement.style.setProperty('--uikit-item-hover-margin-x', '0px')
  document.documentElement.style.setProperty('--uikit-item-hover-padding-x', '16px')
  document.documentElement.style.setProperty('--uikit-item-active-radius', '0px')
  document.documentElement.style.setProperty('--uikit-components-radius', '8px')
  document.documentElement.style.setProperty('--uikit-container-gap', '8px')
  document.documentElement.setAttribute('data-uikit-anim-enabled', 'true')
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
    document.documentElement.setAttribute('data-uikit-theme', mode.value)
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

  function setMode(value: 'light' | 'dark') {
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
