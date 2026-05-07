import { ref, onMounted, onUnmounted } from 'vue'

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

  onMounted(() => {
    window.visualViewport?.addEventListener('resize', handleResize)
    document.addEventListener('focusin', handleFocusIn)
  })

  onUnmounted(() => {
    window.visualViewport?.removeEventListener('resize', handleResize)
    document.removeEventListener('focusin', handleFocusIn)
  })

  return {
    keyboardHeight,
    isKeyboardOpen,
  }
}
