<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import IconButton from '../icon-button/icon-button.vue'
import { useLocale } from '../../locale'

export interface PopupProps {
  show: boolean
  position?: 'center' | 'bottom' | 'top' | 'left' | 'right'
  zIndex?: number
  overlay?: boolean
  closeOnClickOverlay?: boolean
  showClose?: boolean
  /** 相对定位的锚点元素，传入后 popup 将相对于该元素定位 */
  anchor?: HTMLElement
  /** 相对锚点的位置，默认 'bottom' */
  placement?: 'bottom' | 'top' | 'left' | 'right'
  /** 锚定轴上的对齐方式，默认 'center' */
  align?: 'start' | 'center' | 'end'
  /** 与锚点的间距（px），默认 8 */
  offset?: number
  /** 边界约束元素，传入后 popup 将被限制在该元素范围内 */
  boundary?: HTMLElement
  /** 互斥分组：同一 group 内同时只能有一个 popup 打开，打开新的会自动关闭其他的 */
  group?: string
}

export interface PopupEmits {
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<PopupProps>(), {
  position: 'center',
  zIndex: 2000,
  overlay: true,
  closeOnClickOverlay: true,
  showClose: false,
  placement: 'bottom',
  align: 'center',
  offset: 8,
})

const emit = defineEmits<PopupEmits>()
const { t } = useLocale()

const isAnchored = computed(() => !!props.anchor)

const transitionName = computed(() => {
  if (isAnchored.value) {
    return 'uikit-anchor-scale'
  }
  const map: Record<string, string> = {
    center: 'uikit-fade-scale',
    bottom: 'uikit-slide-up',
    top: 'uikit-slide-down',
    left: 'uikit-slide-right',
    right: 'uikit-slide-left',
  }
  return map[props.position] || 'uikit-fade'
})

const contentRef = ref<HTMLElement>()
const contentStyle = ref<Record<string, string>>({})
const ignoreClickOutside = ref(false)

function updateAnchorPosition() {
  if (!isAnchored.value || !props.anchor || !contentRef.value) return

  const anchorRect = props.anchor.getBoundingClientRect()
  const contentRect = contentRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const offset = props.offset

  let x = 0
  let y = 0

  // 计算锚定轴上的对齐偏移
  const alignStart = props.align === 'start'
  const alignEnd = props.align === 'end'

  // 计算初始位置
  switch (props.placement) {
    case 'bottom':
      x = alignStart
        ? anchorRect.left
        : alignEnd
            ? anchorRect.right - contentRect.width
            : anchorRect.left + (anchorRect.width - contentRect.width) / 2
      y = anchorRect.bottom + offset
      break
    case 'top':
      x = alignStart
        ? anchorRect.left
        : alignEnd
            ? anchorRect.right - contentRect.width
            : anchorRect.left + (anchorRect.width - contentRect.width) / 2
      y = anchorRect.top - contentRect.height - offset
      break
    case 'left':
      x = anchorRect.left - contentRect.width - offset
      y = alignStart
        ? anchorRect.top
        : alignEnd
            ? anchorRect.bottom - contentRect.height
            : anchorRect.top + (anchorRect.height - contentRect.height) / 2
      break
    case 'right':
      x = anchorRect.right + offset
      y = alignStart
        ? anchorRect.top
        : alignEnd
            ? anchorRect.bottom - contentRect.height
            : anchorRect.top + (anchorRect.height - contentRect.height) / 2
      break
  }

  // 边界检测与翻转
  if (props.placement === 'bottom' && y + contentRect.height > vh) {
    y = anchorRect.top - contentRect.height - offset
  } else if (props.placement === 'top' && y < 0) {
    y = anchorRect.bottom + offset
  } else if (props.placement === 'right' && x + contentRect.width > vw) {
    x = anchorRect.left - contentRect.width - offset
  } else if (props.placement === 'left' && x < 0) {
    x = anchorRect.right + offset
  }

  // 边界约束（优先使用 boundary，否则回退到视口）
  const boundaryRect = props.boundary?.getBoundingClientRect()
  const minX = boundaryRect ? boundaryRect.left + offset : offset
  const maxX = boundaryRect
    ? boundaryRect.right - contentRect.width - offset
    : vw - contentRect.width - offset
  const minY = boundaryRect ? boundaryRect.top + offset : offset
  const maxY = boundaryRect
    ? boundaryRect.bottom - contentRect.height - offset
    : vh - contentRect.height - offset

  // 水平边界约束
  if (contentRect.width <= (boundaryRect ? boundaryRect.width : vw)) {
    x = Math.max(minX, Math.min(x, maxX))
  }

  // 垂直边界约束
  if (contentRect.height <= (boundaryRect ? boundaryRect.height : vh)) {
    y = Math.max(minY, Math.min(y, maxY))
  }

  contentStyle.value = {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
  }
}

// 使用 sync flush，确保 ignoreClickOutside 在同步代码中立即生效，
// 避免被右键后随之而来的合成 click 事件（Mac 触控板双指点击会同时派发 contextmenu 和 click）抢先触发外部点击关闭。
watch(() => [props.show, props.anchor], ([show]) => {
  if (show && isAnchored.value) {
    ignoreClickOutside.value = true
    nextTick(() => {
      updateAnchorPosition()
    })
    // 250ms 后解除忽略，足以覆盖右键打开后浏览器可能补发的 click 事件
    window.setTimeout(() => {
      ignoreClickOutside.value = false
    }, 250)
  }
}, { flush: 'sync' })

useEventListener(window, 'resize', () => {
  if (props.show && isAnchored.value) updateAnchorPosition()
})

useEventListener(window, 'scroll', () => {
  if (props.show && isAnchored.value) updateAnchorPosition()
}, { capture: true })

onClickOutside(contentRef, (event) => {
  if (ignoreClickOutside.value) return
  // 锚定模式下点击 anchor 本身不关闭 popup
  if (isAnchored.value && props.anchor && props.anchor.contains(event.target as Node)) return
  if (props.closeOnClickOverlay && props.show) {
    emit('update:show', false)
    emit('close')
  }
})

function onCloseClick() {
  emit('update:show', false)
  emit('close')
}

// ===== 互斥分组：同一 group 内只能有一个 popup 打开 =====
const POPUP_GROUP_EVENT = 'uikit:popup-group-open'
const instanceId = Symbol('popup-instance')

interface PopupGroupEventDetail {
  group: string
  id: symbol
}

function onGroupOpen(event: Event) {
  const { detail } = event as CustomEvent<PopupGroupEventDetail>
  const isSelf = detail.id === instanceId
  if (
    props.group
    && detail.group === props.group
    && !isSelf
    && props.show
  ) {
    emit('update:show', false)
    emit('close')
  }
}

watch(() => props.show, (show) => {
  if (show && props.group) {
    document.dispatchEvent(
      new CustomEvent<PopupGroupEventDetail>(POPUP_GROUP_EVENT, {
        detail: { group: props.group, id: instanceId },
      }),
    )
  }
})

onMounted(() => {
  document.addEventListener(POPUP_GROUP_EVENT, onGroupOpen)
})

onUnmounted(() => {
  document.removeEventListener(POPUP_GROUP_EVENT, onGroupOpen)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="uikit-fade">
      <div
        v-if="props.show"
        class="uikit-popup"
        :class="{ 'uikit-popup--pass-through': isAnchored && !props.overlay }"
        :style="{ zIndex: props.zIndex }"
      >
        <!-- 遮罩层拦截 touchmove，防止弹层打开时背景滚动穿透（内容区不拦截，保证弹层内可滚动） -->
        <div v-if="props.overlay" class="uikit-popup__overlay" @touchmove.prevent />
        <Transition :name="transitionName">
          <div
            v-if="props.show"
            ref="contentRef"
            class="uikit-popup__content"
            :class="isAnchored ? 'uikit-popup__content--anchored' : `uikit-popup__content--${props.position}`"
            :style="isAnchored ? contentStyle : undefined"
          >
            <IconButton
              v-if="props.showClose"
              class="uikit-popup__close"
              icon="actions/close"
              size="small"
              variant="ghost"
              :title="t('button.close') || '关闭'"
              @click="onCloseClick"
            />
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.uikit-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 锚定模式且无遮罩时，容器不拦截点击事件，让它穿透到下层元素 */
.uikit-popup--pass-through {
  pointer-events: none;
}

.uikit-popup--pass-through .uikit-popup__content {
  pointer-events: auto;
}

.uikit-popup__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity var(--uikit-anim-overlay-duration) var(--uikit-anim-easing);
  /* 阻止滚动链穿透到背景页面 */
  overscroll-behavior: contain;
}

.uikit-popup__content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 90vh */
  max-height: 90dvh;
  /* 统一裁剪子元素到圆角内，避免子组件直角背景/边框顶出圆角 */
  overflow: hidden;
  /* 弹层内容滚动到边界时不把滚动链穿透给背景页面 */
  overscroll-behavior: contain;
}

.uikit-popup__content--center {
  margin: auto;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 8px);
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  overflow: auto;
}

.uikit-popup__content--bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  max-width: 100%;
  max-height: 80vh;
  padding-bottom: var(--uikit-safe-bottom, 0px);
  overflow: auto;
}

.uikit-popup__content--top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-radius: 0 0 var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px);
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  max-width: 100%;
  overflow: auto;
}

.uikit-popup__content--left {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-radius: 0 var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0;
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  max-height: 100%;
  overflow: auto;
}

.uikit-popup__content--right {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-left: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 12px) 0 0 var(--uikit-components-radius, 12px);
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  max-height: 100%;
  overflow: auto;
}

.uikit-popup__close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

/* 锚定内容默认以左上角为 transform-origin，通过 CSS 变量支持动态调整 */
.uikit-popup__content--anchored {
  position: fixed;
  margin: 0;
  transform-origin: var(--uikit-anim-anchor-origin-x) var(--uikit-anim-anchor-origin-y);
  /* 为锚定 Popup 提供统一外壳：背景、圆角、阴影、裁剪。
     避免子组件（菜单、表情面板等）的透明外层露出页面背景，
     从而解决“内层圆角、外层灰色直角”的问题。 */
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 12px);
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  overflow: hidden;
}
</style>
