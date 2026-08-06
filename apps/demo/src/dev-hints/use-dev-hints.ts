/**
 * Dev Hints 悬停引擎（v2）
 *
 * 在 .demo-layout 根上做 mouseover/mouseout 事件委托：
 * - 统一模式：hover 目标区域出 💡 角标（默认 500ms，气泡类 2000ms），点击打开详情抽屉；
 * - 高亮边框：部分容器区域（会话列表等）hover 时加固定边框 overlay；
 * - scroll/resize 时隐藏所有覆盖层；
 * - 开关关闭或根元素不存在时整体不响应。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import { resolveDevHint } from './registry'
import type { DevHintBadgeState, DevHintContext } from './types'

/** 💡 角标默认延时（ms），气泡类可通过 entry.badgeDelay 覆盖 */
const BADGE_DELAY_DEFAULT = 500
/** 离开命中区域后的延迟隐藏时长（ms）：给「鼠标移向角标」留出路径时间 */
const HIDE_DELAY_MS = 300

export function useDevHints(enabled: Ref<boolean>) {
  /** 事件委托挂载根（.demo-layout） */
  const rootRef = ref<HTMLElement | null>(null)
  /** 💡 角标状态（null = 不显示） */
  const badge = ref<DevHintBadgeState | null>(null)
  /** 高亮边框目标元素（null = 不显示；组件根据 getBoundingClientRect 定位） */
  const highlightEl = ref<HTMLElement | null>(null)
  /** 详情抽屉内容（null = 关闭） */
  const detail = ref<DevHintContext | null>(null)

  /** 当前悬停命中的元素（用于判断是否切到新目标） */
  let hoverEl: HTMLElement | null = null
  let badgeTimer: ReturnType<typeof setTimeout> | null = null
  /** 延迟隐藏定时器（鼠标离开命中区域后启动，移入覆盖层则取消） */
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (badgeTimer) {
      clearTimeout(badgeTimer)
      badgeTimer = null
    }
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function hideOverlays() {
    clearTimers()
    badge.value = null
    highlightEl.value = null
  }

  /** 取消待执行的延迟隐藏（鼠标已移入角标时调用） */
  function cancelHide() {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  /** 延迟隐藏：离开命中区域后不立即收起，给移向角标留时间 */
  function scheduleHide() {
    cancelHide()
    hideTimer = setTimeout(() => {
      hideTimer = null
      hoverEl = null
      hideOverlays()
    }, HIDE_DELAY_MS)
  }

  /** 打开详情抽屉（点击 💡 角标触发） */
  function openDetail(entry: DevHintContext) {
    detail.value = entry
    hideOverlays()
  }

  function closeDetail() {
    detail.value = null
  }

  function onMouseOver(e: MouseEvent) {
    if (!enabled.value)
      return
    const target = e.target as Element | null
    if (!target)
      return
    // 移入覆盖层自身（角标/抽屉）：取消待执行的隐藏，保持当前提示
    if (target.closest('.demo-dev-hint')) {
      cancelHide()
      return
    }

    const hit = resolveDevHint(target)
    if (!hit) {
      // 悬停到未注册区域：延迟隐藏，给「移向角标」的路径留时间
      scheduleHide()
      return
    }
    const { entry, el } = hit

    // 已悬停在同一个元素上：保持当前提示不重置（区域内移动不打断延时）
    if (el === hoverEl)
      return
    hoverEl = el

    const rect = el.getBoundingClientRect()
    // 切换到新目标：先收起旧提示
    hideOverlays()

    const delay = entry.badgeDelay ?? BADGE_DELAY_DEFAULT
    badgeTimer = setTimeout(() => {
      badgeTimer = null
      badge.value = { entry, x: rect.right + 6, y: rect.top - 6 }
      if (entry.highlight)
        highlightEl.value = el
    }, delay)
  }

  function onMouseOut(e: MouseEvent) {
    const related = e.relatedTarget as Node | null
    if (related) {
      // 移入覆盖层自身（角标）：取消延迟隐藏，保持显示
      if (related instanceof Element && related.closest('.demo-dev-hint')) {
        cancelHide()
        return
      }
      // 仍在命中元素内（子元素间移动）则不算离开
      if (hoverEl && hoverEl.contains(related))
        return
    }
    // 真正离开命中区域：延迟隐藏，给「移向角标」留时间
    scheduleHide()
  }

  /** 容器滚动 / 窗口变化：fixed 定位失效，直接隐藏 */
  function onViewportChange() {
    if (hoverEl)
      hoverEl = null
    hideOverlays()
  }

  function onDocumentClick(e: MouseEvent) {
    // 点击覆盖层以外区域关闭提示
    const target = e.target as Element | null
    if (target && !target.closest('.demo-dev-hint'))
      hideOverlays()
  }

  onMounted(() => {
    const root = rootRef.value
    if (!root)
      return
    root.addEventListener('mouseover', onMouseOver, { passive: true })
    root.addEventListener('mouseout', onMouseOut, { passive: true })
    // scroll 不冒泡，需在捕获阶段监听根容器
    root.addEventListener('scroll', onViewportChange, { capture: true, passive: true })
    window.addEventListener('resize', onViewportChange, { passive: true })
    window.addEventListener('click', onDocumentClick, { passive: true })
  })

  onUnmounted(() => {
    const root = rootRef.value
    if (root) {
      root.removeEventListener('mouseover', onMouseOver)
      root.removeEventListener('mouseout', onMouseOut)
      root.removeEventListener('scroll', onViewportChange, { capture: true })
    }
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('click', onDocumentClick)
    clearTimers()
  })

  return {
    rootRef,
    badge,
    highlightEl,
    detail,
    openDetail,
    closeDetail,
  }
}
