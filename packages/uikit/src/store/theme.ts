import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

/** 动画强度等级 */
export type AnimationLevel = 'subtle' | 'normal' | 'expressive'

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

  // ===== 动画配置 =====
  const animationEnabled = ref(true)
  const animationLevel = ref<AnimationLevel>('normal')
  const animationRipple = ref(true)

  watchEffect(() => {
    document.documentElement.style.setProperty(
      '--uikit-primary-color',
      `hsl(${primaryColor.value}, 100%, 60%)`
    )
    document.documentElement.setAttribute('data-uikit-theme', mode.value)
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
    animationEnabled,
    animationLevel,
    animationRipple,
    setPrimaryColor,
    setMode,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
    setAnimationEnabled,
    setAnimationLevel,
    setAnimationRipple,
    applyAnimationConfig,
  }
})
