import { type Ref, onUnmounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useThemeStore } from '../store/theme'

export interface RippleOptions {
  /** 波纹颜色，默认跟随主题 primary 色 */
  color?: string
  /** 是否在动画结束后自动移除 DOM，默认 true */
  autoRemove?: boolean
}

/**
 * 为元素附加 Ripple 波纹效果
 * - 仅 transform + opacity，GPU 合成层，零 layout/paint 开销
 * - 受 ThemeStore animationEnabled / animationRipple 控制
 * - 受 prefers-reduced-motion CSS 兜底（0ms 时长自动降级）
 */
export function useRipple(
  el: Ref<HTMLElement | undefined>,
  options: RippleOptions = {}
) {
  const themeStore = useThemeStore()
  const autoRemove = options.autoRemove ?? true

  function createRipple(e: PointerEvent) {
    const target = el.value
    if (!target) return

    // 全局动画关闭 或 ripple 关闭 → 跳过
    if (!themeStore.animationEnabled || !themeStore.animationRipple) return

    const rect = target.getBoundingClientRect()
    const diameter = Math.max(rect.width, rect.height) * 2
    const radius = diameter / 2

    // 计算点击坐标（相对元素左上角）
    const left = e.clientX - rect.left - radius
    const top = e.clientY - rect.top - radius

    const ripple = document.createElement('span')
    ripple.className = 'uikit-ripple'

    // 读取 CSS 变量以保持一致性
    const rippleColor =
      options.color || 'var(--uikit-primary-color)'

    Object.assign(ripple.style, {
      width: `${diameter}px`,
      height: `${diameter}px`,
      left: `${left}px`,
      top: `${top}px`,
      backgroundColor: rippleColor,
      // 关键帧从 scale(0) → scale(1)，见 theme/index.css
    })

    // 确保父元素可做定位基准
    const position = getComputedStyle(target).position
    if (position === 'static') {
      target.style.position = 'relative'
    }
    target.style.overflow = 'hidden'

    target.appendChild(ripple)

    if (autoRemove) {
      const onEnd = () => {
        ripple.remove()
      }
      ripple.addEventListener('animationend', onEnd, { once: true })
      // 兜底：如果动画被 CSS 变量禁用（0ms），animationend 可能不触发
      // 注意：parseFloat('0ms') = 0，不应被 || 覆盖为默认值
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--uikit-anim-ripple-duration')
      const parsed = parseFloat(raw)
      const duration = Number.isNaN(parsed) ? 600 : parsed
      // 动画时长为 0 时直接同步移除，不设定时器
      if (duration === 0) {
        onEnd()
      } else {
        const fallback = setTimeout(onEnd, duration + 50)
        ripple.addEventListener('animationend', () => clearTimeout(fallback), {
          once: true,
        })
      }
    }
  }

  // cleanup 由 useEventListener 内部处理
  const stop = useEventListener(el, 'pointerdown', createRipple)

  onUnmounted(() => {
    stop()
  })
}
