import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import type { AnimationLevel, AnimationConfig, HoverStyle, ThemeMode } from '../store/theme'

export function useTheme() {
  const { theme: themeStore } = useUIKit()

  const mode = computed(() => themeStore.mode)
  const effectiveMode = computed(() => themeStore.effectiveMode)
  const primaryColor = computed(() => themeStore.primaryColor)
  const isDark = computed(() => themeStore.effectiveMode === 'dark')

  function setMode(value: ThemeMode) {
    themeStore.setMode(value)
  }

  function setPrimaryColor(hue: number) {
    themeStore.setPrimaryColor(hue)
  }

  function setAvatarShape(shape: 'circle' | 'square') {
    themeStore.setAvatarShape(shape)
  }

  function setBubbleShape(shape: 'ground' | 'square') {
    themeStore.setBubbleShape(shape)
  }

  function setComponentsShape(shape: 'ground' | 'square') {
    themeStore.setComponentsShape(shape)
  }

  function setContainerGap(gap: number) {
    themeStore.setContainerGap(gap)
  }

  function setHoverStyle(style: HoverStyle) {
    themeStore.setHoverStyle(style)
  }

  function toggleMode() {
    const next = themeStore.mode === 'light' ? 'dark' : themeStore.mode === 'dark' ? 'auto' : 'light'
    themeStore.setMode(next)
  }

  // ===== 动画配置 =====
  const animationEnabled = computed(() => themeStore.animationEnabled)
  const animationLevel = computed(() => themeStore.animationLevel)
  const animationRipple = computed(() => themeStore.animationRipple)

  function setAnimationEnabled(value: boolean) {
    themeStore.setAnimationEnabled(value)
  }

  function setAnimationLevel(level: AnimationLevel) {
    themeStore.setAnimationLevel(level)
  }

  function setAnimationRipple(value: boolean) {
    themeStore.setAnimationRipple(value)
  }

  function applyAnimationConfig(config: AnimationConfig) {
    themeStore.applyAnimationConfig(config)
  }

  return {
    mode,
    effectiveMode,
    primaryColor,
    isDark,
    avatarShape: computed(() => themeStore.avatarShape),
    bubbleShape: computed(() => themeStore.bubbleShape),
    componentsShape: computed(() => themeStore.componentsShape),
    containerGap: computed(() => themeStore.containerGap),
    hoverStyle: computed(() => themeStore.hoverStyle),
    setMode,
    setPrimaryColor,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
    setContainerGap,
    setHoverStyle,
    toggleMode,
    animationEnabled,
    animationLevel,
    animationRipple,
    setAnimationEnabled,
    setAnimationLevel,
    setAnimationRipple,
    applyAnimationConfig,
  }
}
