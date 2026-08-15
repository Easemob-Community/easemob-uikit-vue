import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export function useKeyboard() {
  const keyboardHeight = ref(0)
  const isKeyboardOpen = ref(false)

  // SSR 守卫：无 window 环境直接返回恒 0 状态
  if (typeof window === 'undefined') {
    return {
      keyboardHeight,
      isKeyboardOpen,
    }
  }

  /** focusin 前的基准视口高度（无 visualViewport 环境的降级方案用） */
  let baselineHeight = window.innerHeight

  /** 基于 visualViewport 计算键盘高度；环境不支持时返回 false */
  function computeByVisualViewport(): boolean {
    const vv = window.visualViewport
    if (!vv)
      return false
    // offsetTop：visualViewport 相对布局视口顶部的偏移（iOS 键盘弹起时可能非 0）
    const diff = window.innerHeight - vv.height - (vv.offsetTop ?? 0)
    keyboardHeight.value = diff > 100 ? diff : 0
    isKeyboardOpen.value = diff > 100
    return true
  }

  function handleResize() {
    if (computeByVisualViewport())
      return
    // 降级：与 focusin 前记录的基准 innerHeight 比较差值
    const diff = baselineHeight - window.innerHeight
    keyboardHeight.value = diff > 100 ? diff : 0
    isKeyboardOpen.value = diff > 100
  }

  /** 判断事件目标是否为可输入元素 */
  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement))
      return false
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
  }

  function handleFocusIn(e: FocusEvent) {
    if (!isEditableTarget(e.target))
      return
    // 记录 focusin 前基准高度（降级方案用）
    baselineHeight = window.innerHeight
    setTimeout(handleResize, 300)
  }

  function handleFocusOut(e: FocusEvent) {
    if (!isEditableTarget(e.target))
      return
    // 焦点可能转移到另一个输入框；延迟到焦点稳定后重算
    setTimeout(() => {
      if (isEditableTarget(document.activeElement)) {
        handleResize()
      }
      else {
        // 非输入焦点：键盘已收起，归零
        keyboardHeight.value = 0
        isKeyboardOpen.value = false
      }
    }, 300)
  }

  if (window.visualViewport) {
    useEventListener(window.visualViewport, 'resize', handleResize)
  }
  else {
    useEventListener(window, 'resize', handleResize)
  }
  useEventListener(document, 'focusin', handleFocusIn)
  useEventListener(document, 'focusout', handleFocusOut)

  return {
    keyboardHeight,
    isKeyboardOpen,
  }
}
