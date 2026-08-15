import { type Ref, computed, ref } from 'vue'

export interface UseBottomSheetOptions {
  /** 下滑多少 px 后触发关闭，默认 100 */
  dismissThreshold?: number
  /** 关闭后的回调 */
  onDismiss?: () => void
}

/**
 * 底部面板下滑关闭手势（H5 touch/drag）。
 *
 * 监听 touch 事件，实现底部面板的下拉关闭交互：
 * - 下拉超过 threshold 触发 onDismiss；
 * - 未超过 threshold 则回弹；
 * - 使用 CSS transform 驱动动画，性能友好。
 *
 * @example
 * ```ts
 * const sheetRef = ref<HTMLElement>()
 * const { translateY, progress, onTouchStart, onTouchMove, onTouchEnd } = useBottomSheet(sheetRef, {
 *   dismissThreshold: 120,
 *   onDismiss: () => emit('close'),
 * })
 * ```
 */
export function useBottomSheet(
  target: Ref<HTMLElement | undefined>,
  options: UseBottomSheetOptions = {},
) {
  const dismissThreshold = options.dismissThreshold ?? 100

  const isDragging = ref(false)
  const translateY = ref(0)
  const startY = ref(0)
  /** 初始触摸点 Y，用于多指时忽略 */
  const initialTouchY = ref(0)

  /** 下拉进度 0~1，>=1 表示超过关闭阈值 */
  const progress = computed(() =>
    Math.min(1, translateY.value / dismissThreshold),
  )

  function onTouchStart(e: TouchEvent) {
    // 仅响应单指拖拽
    if (e.touches.length !== 1) {
      return
    }
    isDragging.value = true
    initialTouchY.value = e.touches[0].clientY
    startY.value = e.touches[0].clientY
    translateY.value = 0
    if (target.value) {
      target.value.style.transition = 'none'
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDragging.value || e.touches.length !== 1) {
      return
    }
    const currentY = e.touches[0].clientY
    const diff = currentY - startY.value
    // 仅允许向下拖拽（正方向）
    if (diff > 0) {
      // 阻尼：拉得越远阻力越大
      const resistance = 1 - Math.min(0.5, diff / (dismissThreshold * 2))
      translateY.value = diff * resistance
    }
  }

  function onTouchEnd() {
    if (!isDragging.value) {
      return
    }
    isDragging.value = false

    if (!target.value) {
      translateY.value = 0
      return
    }

    target.value.style.transition = 'transform 0.3s ease'

    if (translateY.value >= dismissThreshold) {
      // 触发关闭：动画到面板高度
      const panelHeight = target.value.offsetHeight || 400
      translateY.value = panelHeight
      options.onDismiss?.()
      // 动画结束后自动重置，使面板可安全复用
      setTimeout(() => {
        translateY.value = 0
        if (target.value) {
          target.value.style.transition = ''
        }
      }, 300)
    }
    else {
      // 回弹
      translateY.value = 0
    }
  }

  /** 编程式重置（外部调用后恢复初始状态） */
  function reset() {
    translateY.value = 0
    isDragging.value = false
    if (target.value) {
      target.value.style.transition = ''
    }
  }

  return {
    isDragging,
    translateY,
    progress,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    reset,
  }
}
