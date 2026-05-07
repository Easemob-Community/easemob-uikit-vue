import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export function useKeyboard() {
  const keyboardHeight = ref(0)
  const isKeyboardOpen = ref(false)

  function handleResize() {
    const visualHeight = window.visualViewport?.height || window.innerHeight
    const diff = window.innerHeight - visualHeight
    keyboardHeight.value = diff > 100 ? diff : 0
    isKeyboardOpen.value = diff > 100
  }

  function handleFocusIn() {
    setTimeout(handleResize, 300)
  }

  if (window.visualViewport) {
    useEventListener(window.visualViewport, 'resize', handleResize)
  }
  useEventListener(document, 'focusin', handleFocusIn)

  return {
    keyboardHeight,
    isKeyboardOpen,
  }
}
