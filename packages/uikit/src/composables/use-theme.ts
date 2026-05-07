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

  function toggleMode() {
    themeStore.setMode(themeStore.mode === 'light' ? 'dark' : 'light')
  }

  return {
    mode,
    primaryColor,
    isDark,
    setMode,
    toggleMode,
  }
}
