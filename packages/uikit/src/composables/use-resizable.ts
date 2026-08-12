import { type Ref, onScopeDispose, ref, watchEffect } from 'vue'

export interface UseResizableOptions {
  /** 调整轴：horizontal 沿水平轴（右缘拖宽）/ vertical 沿垂直轴（下缘拖高） */
  axis: 'horizontal' | 'vertical'
  /** 最小尺寸（px），默认 0 */
  min?: number
  /** 最大尺寸（px），默认不限制 */
  max?: number
  /** 初始尺寸（px），默认 200 */
  initial?: number
  /** 动态禁用 getter（响应式）：返回 true 时不绑定拖拽 */
  disabled?: () => boolean
  /** 反向增量：handle 位于左缘/上缘时拖拽方向与尺寸增加方向相反，默认 false */
  invert?: boolean
  /** 拖拽中回调（rAF 节流，尺寸变化 ≥1px 时触发） */
  onChange?: (size: number) => void
  /** 拖拽结束回调（持久化时机） */
  onEnd?: (size: number) => void
}

/**
 * 容器拖拽调整尺寸封装（右缘拖宽 / 下缘拖高；invert 时左缘拖宽 / 上缘拖高）。
 *
 * 实现要点：
 * - Pointer Events + setPointerCapture：拖出窗口不丢事件，无需全局 mousemove/mouseup 监听；
 * - 拖拽期间临时禁止 body 文本选中（user-select: none），结束后恢复；
 * - pointermove 高频回调经 requestAnimationFrame 节流；
 * - min/max 在拖拽过程中 clamp；
 * - onScopeDispose 兜底清理（防拖拽中卸载遗留 user-select / 事件监听）。
 */
export function useResizable(
  handleRef: Ref<HTMLElement | undefined>,
  options: UseResizableOptions,
) {
  const {
    axis,
    min = 0,
    max = Number.POSITIVE_INFINITY,
    initial = 200,
    invert = false,
    disabled,
    onChange,
    onEnd,
  } = options

  const size = ref(clampSize(initial))
  const isResizing = ref(false)

  let startSize = 0
  let startClientX = 0
  let startClientY = 0
  let rafId: number | null = null
  let pendingSize: number | null = null
  let lastEmittedSize = 0
  let originalUserSelect = ''
  let boundEl: HTMLElement | null = null

  function clampSize(value: number) {
    return Math.min(Math.max(value, min), max)
  }

  /** 将 pending 值写入 size 并触发 onChange（pointermove 的 rAF 批次） */
  function flushChange() {
    rafId = null
    if (pendingSize !== null) {
      const clamped = clampSize(pendingSize)
      size.value = clamped
      if (clamped !== lastEmittedSize) {
        lastEmittedSize = clamped
        onChange?.(clamped)
      }
      pendingSize = null
    }
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    const el = handleRef.value
    if (!el)
      return
    el.setPointerCapture(e.pointerId)
    startSize = size.value
    startClientX = e.clientX
    startClientY = e.clientY
    lastEmittedSize = size.value
    isResizing.value = true
    if (typeof document !== 'undefined') {
      originalUserSelect = document.body.style.userSelect
      document.body.style.userSelect = 'none'
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!isResizing.value)
      return
    const delta = axis === 'horizontal' ? e.clientX - startClientX : e.clientY - startClientY
    pendingSize = startSize + (invert ? -delta : delta)
    if (rafId === null) {
      rafId = requestAnimationFrame(flushChange)
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!isResizing.value)
      return
    isResizing.value = false
    const el = handleRef.value
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    flushChange()
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = originalUserSelect
    }
    onEnd?.(size.value)
  }

  function bind(el: HTMLElement) {
    if (boundEl === el)
      return
    unbind()
    boundEl = el
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
  }

  function unbind() {
    if (!boundEl)
      return
    boundEl.removeEventListener('pointerdown', onPointerDown)
    boundEl.removeEventListener('pointermove', onPointerMove)
    boundEl.removeEventListener('pointerup', onPointerUp)
    boundEl.removeEventListener('pointercancel', onPointerUp)
    boundEl = null
  }

  // handle 挂载 / disabled 变化时重新绑定；disabled 或 SSR（无 handle）时不绑定
  watchEffect(() => {
    const el = handleRef.value
    if (!el || disabled?.()) {
      unbind()
      return
    }
    bind(el)
  })

  // 组件卸载兜底清理：防拖拽中卸载遗留 body user-select 与事件监听
  onScopeDispose(() => {
    unbind()
    if (isResizing.value && typeof document !== 'undefined') {
      document.body.style.userSelect = originalUserSelect
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  })

  return {
    size,
    isResizing,
  }
}
