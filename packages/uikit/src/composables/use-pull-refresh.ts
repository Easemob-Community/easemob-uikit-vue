import { ref, type Ref } from 'vue'
import { useScroll, useSwipe } from '@vueuse/core'

export interface UsePullRefreshOptions {
  /** 触发刷新的下拉距离阈值（px），默认 80 */
  threshold?: number
  /** 刷新回调 */
  onRefresh: () => Promise<void>
}

export function usePullRefresh(
  target: Ref<HTMLElement | undefined>,
  options: UsePullRefreshOptions
) {
  const threshold = options.threshold ?? 80
  const isPulling = ref(false)
  const isRefreshing = ref(false)
  const pullDistance = ref(0)

  const { arrivedState } = useScroll(target, { throttle: 50 })

  const { lengthY } = useSwipe(target, {
    threshold: 5,
    onSwipeStart() {
      // 滚动到顶部时，开始下拉
      if (arrivedState.top) {
        isPulling.value = true
      }
    },
    onSwipe() {
      if (isPulling.value) {
        // lengthY 为负值表示向下拉（手指从上往下移动）
        pullDistance.value = Math.max(0, -lengthY.value)
      }
    },
    onSwipeEnd: async () => {
      if (isPulling.value && pullDistance.value >= threshold && !isRefreshing.value) {
        isRefreshing.value = true
        try {
          await options.onRefresh()
        } finally {
          isRefreshing.value = false
        }
      }
      isPulling.value = false
      pullDistance.value = 0
    },
  })

  return {
    isPulling,
    isRefreshing,
    pullDistance,
  }
}
