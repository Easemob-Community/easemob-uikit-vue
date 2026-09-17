import { computed } from 'vue'
import { useThemeStore } from '../store/theme'
import type { AnimationConfig, AnimationLevel, Density, FontSizePreset, HoverStyle, PrimaryColorInput, ThemeMode, ThemePreset } from '../store/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  const mode = computed(() => themeStore.mode)
  const effectiveMode = computed(() => themeStore.effectiveMode)
  const primaryColor = computed(() => themeStore.primaryColor)
  const primaryColorSat = computed(() => themeStore.primaryColorSat)
  const primaryColorLum = computed(() => themeStore.primaryColorLum)
  const primaryColorHsl = computed(() => themeStore.primaryColorHsl)
  const isDark = computed(() => themeStore.effectiveMode === 'dark')

  function setMode(value: ThemeMode) {
    themeStore.setMode(value)
  }

  function setPrimaryColor(color: PrimaryColorInput) {
    themeStore.setPrimaryColor(color)
  }

  function setPrimaryColorSat(value: number) {
    themeStore.setPrimaryColorSat(value)
  }

  function setPrimaryColorLum(value: number) {
    themeStore.setPrimaryColorLum(value)
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

  // ===== 字号配置 =====
  const fontSizeScale = computed(() => themeStore.fontSizeScale)

  function setFontSizeScale(scale: number) {
    themeStore.setFontSizeScale(scale)
  }

  function setFontSize(preset: FontSizePreset) {
    themeStore.setFontSize(preset)
  }

  // ===== 密度配置 =====
  const density = computed(() => themeStore.density)

  function setDensity(value: Density) {
    themeStore.setDensity(value)
  }

  // ===== Header 底部分隔线开关 =====
  const headerBorder = computed(() => themeStore.headerBorder)

  function setHeaderBorder(value: boolean) {
    themeStore.setHeaderBorder(value)
  }

  // ===== 消息辅助信息胶囊背景开关 =====
  const messageChipBg = computed(() => themeStore.messageChipBg)

  function setMessageChipBg(value: boolean) {
    themeStore.setMessageChipBg(value)
  }

  // ===== 预设主题 =====
  const preset = computed(() => themeStore.preset)

  function setPreset(key: ThemePreset) {
    themeStore.setPreset(key)
  }

  // ===== 高频语义 token =====
  const bubbleBgOther = computed(() => themeStore.bubbleBgOther)
  const bubbleBgSelf = computed(() => themeStore.bubbleBgSelf)
  const chatBg = computed(() => themeStore.chatBg)
  const inputBg = computed(() => themeStore.inputBg)

  // ===== 自定义 hover / active / 弱化图标色 =====
  /** 自定义 hover 背景色（undefined 时走内置浅/深默认） */
  const hoverColor = computed(() => themeStore.hoverColor)
  /** 自定义 active（选中）背景色（undefined 时走内置跟随主色） */
  const activeColor = computed(() => themeStore.activeColor)
  /** 自定义弱化/占位图标色（undefined 时走内置浅/深默认） */
  const iconMutedColor = computed(() => themeStore.iconMutedColor)

  function setBubbleBg(other?: string | null, self?: string | null) {
    themeStore.setBubbleBg(other, self)
  }

  function setChatBg(value?: string) {
    themeStore.setChatBg(value)
  }

  function setInputBg(value?: string) {
    themeStore.setInputBg(value)
  }

  /** 设置自定义 hover 背景色；传 undefined 恢复内置浅/深默认 */
  function setHoverColor(value?: string) {
    themeStore.setHoverColor(value)
  }

  /** 设置自定义 active（选中）背景色；传 undefined 恢复内置跟随主色 */
  function setActiveColor(value?: string) {
    themeStore.setActiveColor(value)
  }

  /** 设置自定义弱化/占位图标色；传 undefined 恢复内置浅/深默认 */
  function setIconMutedColor(value?: string) {
    themeStore.setIconMutedColor(value)
  }

  return {
    mode,
    effectiveMode,
    primaryColor,
    primaryColorSat,
    primaryColorLum,
    primaryColorHsl,
    isDark,
    avatarShape: computed(() => themeStore.avatarShape),
    bubbleShape: computed(() => themeStore.bubbleShape),
    componentsShape: computed(() => themeStore.componentsShape),
    containerGap: computed(() => themeStore.containerGap),
    hoverStyle: computed(() => themeStore.hoverStyle),
    fontSizeScale,
    density,
    headerBorder,
    messageChipBg,
    preset,
    bubbleBgOther,
    bubbleBgSelf,
    chatBg,
    inputBg,
    hoverColor,
    activeColor,
    iconMutedColor,
    setMode,
    setPrimaryColor,
    setPrimaryColorSat,
    setPrimaryColorLum,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
    setContainerGap,
    setHoverStyle,
    setFontSizeScale,
    setFontSize,
    setDensity,
    setHeaderBorder,
    setMessageChipBg,
    setPreset,
    setBubbleBg,
    setChatBg,
    setInputBg,
    setHoverColor,
    setActiveColor,
    setIconMutedColor,
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
