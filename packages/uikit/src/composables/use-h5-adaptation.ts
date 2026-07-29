import { type MaybeRef, computed, ref, toValue, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useKeyboard } from './use-keyboard'

export interface H5AdaptationConfig {
  /** 是否启用 H5 安全区适配，默认 true */
  safeArea?: boolean
  /** 是否启用软键盘弹起时的布局适配，默认 true */
  keyboardAdapt?: boolean
  /** 会话列表在 H5 是否默认开启下拉刷新，默认 'auto'（触屏设备自动开启） */
  pullRefresh?: boolean | 'auto'
  /** 预留：字体缩放倍数，默认 1（暂不生效，为 P2 预留接口） */
  fontScale?: number
}

const DEFAULT_CONFIG: Required<H5AdaptationConfig> = {
  safeArea: true,
  keyboardAdapt: true,
  pullRefresh: 'auto',
  fontScale: 1,
}

/** 读取已生效的 CSS 变量数值（带 px 单位），失败返回 0 */
function readCssVarAsPx(name: string): number {
  if (typeof document === 'undefined')
    return 0
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  if (!value)
    return 0
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

let viewportFitWarned = false

/**
 * safeArea 开启时检测宿主 viewport meta 是否包含 viewport-fit=cover，
 * 缺失时 iOS 上 env(safe-area-inset-*) 恒为 0，warn 一次提示宿主接入。
 */
function warnIfViewportFitMissing() {
  if (viewportFitWarned || typeof document === 'undefined')
    return
  const meta = document.querySelector('meta[name="viewport"]')
  const content = meta?.getAttribute('content') ?? ''
  if (!content.includes('viewport-fit=cover')) {
    viewportFitWarned = true
    console.warn('[useH5Adaptation] safeArea 已开启，但宿主页面 viewport meta 缺少 viewport-fit=cover，env(safe-area-inset-*) 将恒为 0，请在宿主 HTML 的 viewport meta 中补充。')
  }
}

/**
 * H5 适配核心状态。
 *
 * 集中管理安全区、键盘高度、viewport 尺寸等移动端 H5 专属状态，
 * 并通过 UIKitContext 注入，避免各组件各自监听 resize/visualViewport。
 */
export function useH5Adaptation(config: MaybeRef<H5AdaptationConfig> = {}) {
  const resolved = computed(() => ({
    ...DEFAULT_CONFIG,
    ...toValue(config),
  }))

  const width = ref(typeof window === 'undefined' ? 0 : window.innerWidth)
  const height = ref(typeof window === 'undefined' ? 0 : window.innerHeight)
  const isMobile = computed(() => width.value < 768)

  const safeAreaInsets = ref({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  function updateViewportAndSafeArea() {
    // SSR 环境无 window，直接跳过
    if (typeof window === 'undefined')
      return
    width.value = window.innerWidth
    height.value = window.innerHeight

    if (!resolved.value.safeArea) {
      safeAreaInsets.value = { top: 0, right: 0, bottom: 0, left: 0 }
      return
    }

    safeAreaInsets.value = {
      top: readCssVarAsPx('--uikit-safe-top'),
      right: readCssVarAsPx('--uikit-safe-right'),
      bottom: readCssVarAsPx('--uikit-safe-bottom'),
      left: readCssVarAsPx('--uikit-safe-left'),
    }
  }

  useEventListener(window, 'resize', updateViewportAndSafeArea)
  if (window.visualViewport) {
    useEventListener(window.visualViewport, 'resize', updateViewportAndSafeArea)
  }
  // 初始化一次
  updateViewportAndSafeArea()
  if (resolved.value.safeArea)
    warnIfViewportFitMissing()

  // 安全区开关变化时重置
  watch(() => resolved.value.safeArea, (enabled) => {
    updateViewportAndSafeArea()
    if (enabled)
      warnIfViewportFitMissing()
  })

  const { keyboardHeight, isKeyboardOpen } = useKeyboard()

  /** 预留：字体缩放，后续 P2 接入 rem 体系时消费 */
  const fontScale = computed(() => resolved.value.fontScale ?? 1)

  // 将 fontScale 同步到 CSS 变量 --uikit-font-scale，驱动全局字号缩放
  watch(fontScale, (scale) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--uikit-font-scale', String(scale))
    }
  }, { immediate: true })

  return {
    config: resolved,
    viewport: { width, height },
    isMobile,
    safeAreaInsets,
    keyboardHeight: computed(() =>
      resolved.value.keyboardAdapt ? keyboardHeight.value : 0,
    ),
    isKeyboardOpen: computed(() =>
      resolved.value.keyboardAdapt ? isKeyboardOpen.value : false,
    ),
    /** 当前是否应启用下拉刷新（auto 模式下触屏设备开启） */
    enablePullRefresh: computed(() => {
      const pr = resolved.value.pullRefresh
      if (typeof pr === 'boolean')
        return pr
      // 'auto': 有触摸能力则开启
      return typeof window !== 'undefined'
        && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }),
    fontScale,
  }
}
