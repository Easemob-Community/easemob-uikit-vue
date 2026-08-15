import { computed, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useCoreUIKit } from './use-uikit'

/**
 * 视口状态。
 *
 * 在 <UIKitProvider> 内部时，直接复用 context 中统一的 H5 适配状态，
 * 避免多处重复监听 resize/visualViewport；在 Provider 外部使用时降级为本地实例。
 */
export function useViewport() {
  // 优先尝试从 core UIKitContext 读取；不在 Provider 内时不抛错，降级到本地
  let ctx: ReturnType<typeof useCoreUIKit> | undefined
  try {
    ctx = useCoreUIKit()
  }
  catch {
    ctx = undefined
  }

  if (ctx) {
    const { h5 } = ctx
    return {
      width: h5.viewport.width,
      height: h5.viewport.height,
      isMobile: h5.isMobile,
      // H5 适配相关扩展字段，方便组件直接读取
      keyboardHeight: h5.keyboardHeight,
      isKeyboardOpen: h5.isKeyboardOpen,
      safeAreaInsets: h5.safeAreaInsets,
    }
  }

  // Provider 外部 fallback
  const width = ref(typeof window === 'undefined' ? 0 : window.innerWidth)
  const height = ref(typeof window === 'undefined' ? 0 : window.innerHeight)
  const isMobile = computed(() => width.value < 768)

  useEventListener(window, 'resize', () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  })

  return {
    width,
    height,
    isMobile,
    keyboardHeight: ref(0),
    isKeyboardOpen: ref(false),
    safeAreaInsets: ref({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
}
