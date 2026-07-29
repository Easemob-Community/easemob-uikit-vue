import { onScopeDispose, ref } from 'vue'

export interface UseLongPressOptions {
  /** 触发长按所需的按住时长（ms），默认 600 */
  delay?: number
  /** touchmove 取消阈值（px），默认 10 */
  moveThreshold?: number
  /** 长按时是否临时禁止 body 滚动，默认 true */
  preventScroll?: boolean
  /** 长按时开始回调（可用于震动反馈） */
  onStart?: () => void
  /** 长按结束/取消回调 */
  onEnd?: () => void
}

interface TouchPos {
  x: number
  y: number
}

/**
 * 长按手势封装。
 *
 * 解决 H5 上长按与页面滚动冲突的问题：
 * - touchmove 超过阈值自动取消长按；
 * - 长按时临时禁止 body 滚动，避免手指轻微移动触发页面滚动导致菜单无法稳定出现。
 */
export function useLongPress(callback: () => void, options: UseLongPressOptions = {}) {
  const {
    delay = 600,
    moveThreshold = 10,
    preventScroll = true,
    onStart,
    onEnd,
  } = options

  const timer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isPressing = ref(false)
  const startPos = ref<TouchPos | null>(null)
  let originalOverflow = ''

  function setBodyScroll(enabled: boolean) {
    if (!preventScroll || typeof document === 'undefined')
      return
    if (enabled) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    else {
      document.body.style.overflow = originalOverflow
    }
  }

  function start(event?: TouchEvent) {
    isPressing.value = true
    startPos.value = event?.touches?.[0]
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null

    setBodyScroll(false)
    onStart?.()

    timer.value = setTimeout(() => {
      if (isPressing.value) {
        callback()
        isPressing.value = false
        cleanup()
      }
    }, delay)
  }

  function move(event: TouchEvent) {
    if (!isPressing.value || !startPos.value)
      return
    const touch = event.touches[0]
    if (!touch)
      return
    const dx = touch.clientX - startPos.value.x
    const dy = touch.clientY - startPos.value.y
    if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
      cancel()
    }
  }

  function end() {
    cleanup()
  }

  function cancel() {
    cleanup()
  }

  function cleanup() {
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
    if (isPressing.value) {
      isPressing.value = false
      setBodyScroll(true)
      onEnd?.()
    }
    startPos.value = null
  }

  // 组件卸载时兜底清理：防止长按过程中卸载导致 body 永久禁止滚动
  onScopeDispose(() => cleanup())

  return {
    start,
    move,
    end,
    cancel,
    isPressing,
  }
}
