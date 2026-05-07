import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const primaryColor = ref<number>(203)
  const mode = ref<'light' | 'dark'>('light')
  const avatarShape = ref<'circle' | 'square'>('circle')
  const bubbleShape = ref<'ground' | 'square'>('ground')
  const componentsShape = ref<'ground' | 'square'>('ground')

  watchEffect(() => {
    document.documentElement.style.setProperty(
      '--uikit-primary-color',
      `hsl(${primaryColor.value}, 100%, 60%)`
    )
    document.documentElement.setAttribute('data-uikit-theme', mode.value)
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

  return {
    primaryColor,
    mode,
    avatarShape,
    bubbleShape,
    componentsShape,
    setPrimaryColor,
    setMode,
    setAvatarShape,
    setBubbleShape,
    setComponentsShape,
  }
})
