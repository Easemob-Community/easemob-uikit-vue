import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export function useViewport() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  const isMobile = ref(width.value < 768)

  useEventListener(window, 'resize', () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
    isMobile.value = width.value < 768
  })

  return {
    width,
    height,
    isMobile,
  }
}
