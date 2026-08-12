import { type MaybeRefOrGetter, computed, onScopeDispose, ref, toValue, watch } from 'vue'
import { useEventListener } from '@vueuse/core'

/**
 * 键盘快捷键 / 列表导航 hooks
 *
 * 背景：此前 ESC / 方向键等键盘监听散落在 popup、image-viewer、voice-panel 等组件内
 * （各自 useEventListener + if (e.key === 'Escape')），无统一抽象。本文件提供三层能力：
 *
 * - `useKeyBindings`：声明式快捷键注册表（支持组合键、active 开关、输入态豁免）
 * - `useEscToClose`：ESC 关闭语义封装（迁移 popup / image-viewer 用）
 * - `useArrowNavigation`：↑/↓（可配）列表项焦点导航（cell 类型切换 / 弹层选项移动用）
 *
 * 实现基于 vueUse `useEventListener`（自动清理 + SSR 守卫），不重复造监听原语；
 * key 组合解析是本层新增的统一能力（vueUse onKeyStroke 不支持 "Ctrl+K" 这类组合描述）。
 */

// ==================== 内部：组合键解析与匹配 ====================

interface ParsedKeyCombo {
  /** 主键名（KeyboardEvent.key，如 'Escape' / 'ArrowUp' / 'k'） */
  key: string
  /** 修饰键：严格匹配（声明了必须按下，未声明必须未按） */
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  /** Mod 修饰：mac 上等价 meta，其它平台等价 ctrl（与 ctrl/meta 二选一声明） */
  mod: boolean
}

/** 解析 "Ctrl+K" / "Mod+Enter" / "Escape" 形式的组合描述 */
function parseKeyCombo(combo: string): ParsedKeyCombo {
  const parts = combo.split('+').map(s => s.trim()).filter(Boolean)
  const parsed: ParsedKeyCombo = { key: '', ctrl: false, meta: false, alt: false, shift: false, mod: false }
  for (const part of parts) {
    switch (part.toLowerCase()) {
      case 'ctrl':
        parsed.ctrl = true
        break
      case 'meta':
        parsed.meta = true
        break
      case 'alt':
        parsed.alt = true
        break
      case 'shift':
        parsed.shift = true
        break
      case 'mod':
        parsed.mod = true
        break
      default:
        parsed.key = part
    }
  }
  return parsed
}

function matchesKey(e: KeyboardEvent, parsed: ParsedKeyCombo): boolean {
  if (e.key.toLowerCase() !== parsed.key.toLowerCase())
    return false
  if (parsed.mod) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    if (isMac ? !e.metaKey : !e.ctrlKey)
      return false
  }
  else {
    if (e.ctrlKey !== parsed.ctrl || e.metaKey !== parsed.meta)
      return false
  }
  if (e.altKey !== parsed.alt || e.shiftKey !== parsed.shift)
    return false
  return true
}

/** 目标是否为输入控件（input / textarea / select / contenteditable） */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

// ==================== 全局开关：整体启用 / 禁用键盘操作 ====================

/** 全局键盘操作总开关（默认开启）：关闭后所有 useKeyBindings 绑定立即失效 */
const keyboardShortcutsEnabled = ref(true)

/**
 * 全局启用 / 禁用键盘操作（ESC 关闭、方向键导航等全部 useKeyBindings 绑定）。
 *
 * 与各绑定的 active 是「与」关系：任一为 false 即不响应；
 * 关闭时已挂载的监听立即解绑，重新开启后自动恢复。
 */
export function setKeyboardShortcutsEnabled(enabled: boolean) {
  keyboardShortcutsEnabled.value = enabled
}

/** 查询键盘操作当前是否全局启用 */
export function isKeyboardShortcutsEnabled() {
  return keyboardShortcutsEnabled.value
}

// ==================== useKeyBindings：声明式快捷键注册表 ====================

export interface UseKeyBindingsOptions {
  /** 是否启用绑定（可传响应式），默认 true；为 false 时解绑，变 true 重新绑定 */
  active?: MaybeRefOrGetter<boolean>
  /** 焦点在输入控件时是否不响应（避免快捷键抢输入），默认 true；弹层 ESC 等场景传 false */
  ignoreWhenTyping?: boolean
  /** 长按自动重复是否持续触发，默认 true（方向键连续移动）；单击语义的键传 false */
  repeat?: boolean
  /** 命中后调用 stopPropagation（多层弹层时由最内层消费，需配合各层关闭顺序使用） */
  stopPropagation?: boolean
  /** 命中后调用 preventDefault（阻止浏览器默认行为，如方向键在输入框内移动光标） */
  preventDefault?: boolean
}

/** 快捷键映射表：key 支持 "Escape" / "ArrowUp" / "Ctrl+K" / "Mod+Enter" 形式 */
export type KeyBindingsMap = Record<string, (e: KeyboardEvent) => void>

/**
 * 声明式快捷键注册表。
 *
 * 内部基于 vueUse `useEventListener` 挂载**单个** window keydown 监听，
 * 所有绑定在一个监听内解析匹配（N 个快捷键不产生 N 个监听）；
 * active 变化时自动绑定/解绑，组件卸载自动清理。
 *
 * @example
 * ```ts
 * useKeyBindings({
 *   Escape: close,
 *   ArrowUp: () => move(-1),
 *   ArrowDown: () => move(1),
 *   'Ctrl+K': () => emit('search'),
 * }, {
 *   active: computed(() => props.show), // 弹层打开才响应
 *   ignoreWhenTyping: false,            // 输入框聚焦时 ESC 也要能关弹层
 * })
 * ```
 */
export function useKeyBindings(bindings: KeyBindingsMap, options: UseKeyBindingsOptions = {}) {
  const active = options.active ?? true
  const ignoreWhenTyping = options.ignoreWhenTyping ?? true
  const repeat = options.repeat ?? true
  const stopPropagation = options.stopPropagation ?? false
  const preventDefault = options.preventDefault ?? false

  const entries = Object.entries(bindings).map(([combo, handler]) => ({
    parsed: parseKeyCombo(combo),
    handler,
  }))

  function onKeydown(e: KeyboardEvent) {
    if (!repeat && e.repeat)
      return
    if (ignoreWhenTyping && isTypingTarget(e.target))
      return
    for (const { parsed, handler } of entries) {
      if (matchesKey(e, parsed)) {
        if (preventDefault)
          e.preventDefault()
        if (stopPropagation)
          e.stopPropagation()
        handler(e)
      }
    }
  }

  // active 与全局开关共同控制监听：任一关闭即解绑，重新开启自动恢复。
  // 手动持有 stop 以便立即解绑（watch 回调内重复调用 useEventListener 不会清理旧监听）
  const shouldBind = computed(() => toValue(active) && keyboardShortcutsEnabled.value)
  let stopKeydown: (() => void) | undefined
  watch(shouldBind, (val) => {
    stopKeydown?.()
    stopKeydown = undefined
    if (val)
      stopKeydown = useEventListener(window, 'keydown', onKeydown)
  }, { immediate: true })
  onScopeDispose(() => stopKeydown?.())
}

// ==================== useEscToClose：ESC 关闭语义封装 ====================

export interface UseEscToCloseOptions {
  /** 焦点在输入控件时是否不响应，默认 false（弹层 ESC 优先，输入态也允许关闭） */
  ignoreWhenTyping?: boolean
  /** 命中后调用 stopPropagation */
  stopPropagation?: boolean
}

/**
 * ESC 关闭语义封装：active 为 true 时按 ESC 触发 onClose。
 *
 * 迁移 popup / image-viewer 等弹层的 ESC 手写监听用；active 传弹层打开状态即可。
 *
 * @example
 * ```ts
 * useEscToClose(computed(() => props.show && props.closeOnEsc), () => {
 *   emit('update:show', false)
 *   emit('close')
 * })
 * ```
 */
export function useEscToClose(
  active: MaybeRefOrGetter<boolean>,
  onClose: () => void,
  options: UseEscToCloseOptions = {},
) {
  useKeyBindings({ Escape: onClose }, {
    active,
    ignoreWhenTyping: options.ignoreWhenTyping ?? false,
    stopPropagation: options.stopPropagation,
  })
}

// ==================== useArrowNavigation：列表项键盘导航 ====================

export interface UseArrowNavigationOptions {
  /** 列表项数量（可响应式，如异步列表） */
  count: MaybeRefOrGetter<number>
  /** 是否启用键盘导航（可传响应式），默认 true */
  active?: MaybeRefOrGetter<boolean>
  /** 到边界是否回绕，默认 true（false 时在 0 / count-1 处停住） */
  wrap?: boolean
  /** 初始索引，默认 0 */
  initial?: number
  /** 长按自动重复是否持续移动，默认 true */
  repeat?: boolean
  /** 焦点在输入控件时是否不响应，默认 false（导航语义默认接管方向键；页面含输入框时传 true 避免抢光标） */
  ignoreWhenTyping?: boolean
  /** 判断指定索引是否禁用；返回 true 时方向键会自动跳过该项 */
  disabled?: (index: number) => boolean
  /** 索引变化回调（move / setIndex 均触发；直接改返回的 activeIndex 不触发） */
  onActiveChange?: (index: number) => void
}

/**
 * 列表项键盘导航：绑定 ↑/↓（可扩展）移动 activeIndex，支持回绕/边界与 active 开关。
 *
 * 覆盖「上下键切换 cell 类型」「弹层选项切换」等列表焦点移动场景；
 * 配合 useKeyBindings 的其它键（如 Enter 确认）组合使用。
 *
 * @example
 * ```ts
 * const { activeIndex, move, setIndex } = useArrowNavigation({
 *   count: cellTypes.length,
 *   wrap: true,
 *   active: computed(() => boxFocused.value), // 仅区域聚焦时响应
 * })
 * useKeyBindings({ Enter: () => openPreview() }, { active: boxFocused })
 * ```
 */
export function useArrowNavigation(options: UseArrowNavigationOptions) {
  const wrap = options.wrap ?? true
  const activeIndex = ref(options.initial ?? 0)

  function updateIndex(next: number) {
    const total = toValue(options.count)
    if (total <= 0) {
      activeIndex.value = 0
      return
    }
    const clamped = wrap
      ? ((next % total) + total) % total
      : Math.max(0, Math.min(total - 1, next))
    activeIndex.value = clamped
    options.onActiveChange?.(clamped)
  }

  function move(dir: -1 | 1) {
    const total = toValue(options.count)
    if (total <= 0) {
      updateIndex(0)
      return
    }

    // 未配置 disabled 时直接移动一步
    if (!options.disabled) {
      updateIndex(activeIndex.value + dir)
      return
    }

    // 配置了 disabled：沿同一方向跳过禁用项，最多遍历一圈，避免全禁用死循环
    let next = activeIndex.value
    for (let i = 0; i < total; i++) {
      next += dir
      const clamped = wrap
        ? ((next % total) + total) % total
        : Math.max(0, Math.min(total - 1, next))
      if (!options.disabled(clamped)) {
        updateIndex(clamped)
        return
      }
      if (!wrap && (clamped === 0 || clamped === total - 1)) {
        // 非回绕模式到达边界且边界项仍禁用，停住
        return
      }
    }
  }
  function next() {
    move(1)
  }
  function prev() {
    move(-1)
  }
  function setIndex(index: number) {
    updateIndex(index)
  }
  function reset() {
    updateIndex(options.initial ?? 0)
  }

  useKeyBindings({
    ArrowUp: () => move(-1),
    ArrowDown: () => move(1),
  }, {
    active: options.active ?? true,
    repeat: options.repeat ?? true,
    // 输入态豁免可配置：候选列表移动场景默认接管方向键，页面含输入框时传 true
    ignoreWhenTyping: options.ignoreWhenTyping ?? false,
  })

  return { activeIndex, move, next, prev, setIndex, reset }
}
