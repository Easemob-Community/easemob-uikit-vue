import { computed } from 'vue'
import { useUIKit } from './use-uikit'

export function useTheme() {
  const { theme: themeStore } = useUIKit()

  const mode = computed(() => themeStore.mode)
  const primaryColor = computed(() => themeStore.primaryColor)
  const isDark = computed(() => themeStore.mode === 'dark')

  function setMode(value: 'light' | 'dark') {
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

  function toggleMode() {
    themeStore.setMode(themeStore.mode === 'light' ? 'dark' : 'light')
  }

  return {
    mode,
    primaryColor,
    isDark,
    avatarShape: computed(() => themeStore.avatarShape),
    bubbleShape: computed(() => themeStore.bubbleShape),
    componentsShape: computed(() => themeStore.componentsShape),
    setMode,
    setPrimaryColor,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
    toggleMode,
  }
}
