<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'

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
  /** 与锚点的间距（px），默认 8 */
  offset?: number
  /** 边界约束元素，传入后 popup 将被限制在该元素范围内 */
  boundary?: HTMLElement
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
  offset: 8,
})

const emit = defineEmits<PopupEmits>()

const isAnchored = computed(() => !!props.anchor)

const transitionName = computed(() => {
  if (isAnchored.value) {
    return 'uikit-fade'
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

  // 计算初始位置
  switch (props.placement) {
    case 'bottom':
      x = anchorRect.left + (anchorRect.width - contentRect.width) / 2
      y = anchorRect.bottom + offset
      break
    case 'top':
      x = anchorRect.left + (anchorRect.width - contentRect.width) / 2
      y = anchorRect.top - contentRect.height - offset
      break
    case 'left':
      x = anchorRect.left - contentRect.width - offset
      y = anchorRect.top + (anchorRect.height - contentRect.height) / 2
      break
    case 'right':
      x = anchorRect.right + offset
      y = anchorRect.top + (anchorRect.height - contentRect.height) / 2
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

watch(() => [props.show, props.anchor], ([show]) => {
  if (show && isAnchored.value) {
    ignoreClickOutside.value = true
    nextTick(() => {
      updateAnchorPosition()
      requestAnimationFrame(() => {
        ignoreClickOutside.value = false
      })
    })
  }
})

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
</script>

<template>
  <Teleport to="body">
    <Transition name="uikit-fade">
      <div v-if="props.show" class="uikit-popup" :style="{ zIndex: props.zIndex }">
        <div v-if="props.overlay" class="uikit-popup__overlay" />
        <Transition :name="transitionName">
          <div
            v-if="props.show"
            ref="contentRef"
            class="uikit-popup__content"
            :class="isAnchored ? 'uikit-popup__content--anchored' : `uikit-popup__content--${props.position}`"
            :style="isAnchored ? contentStyle : undefined"
          >
            <div v-if="props.showClose" class="uikit-popup__close" @click="onCloseClick">
              &times;
            </div>
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

.uikit-popup__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity var(--uikit-anim-overlay-duration) var(--uikit-anim-easing);
}

.uikit-popup__content {
  position: relative;
  background-color: var(--uikit-bg-base);
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.uikit-popup__content--center {
  margin: auto;
}

.uikit-popup__content--bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-radius: 12px 12px 0 0;
  max-width: 100%;
  max-height: 80vh;
}

.uikit-popup__content--top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  border-radius: 0 0 12px 12px;
  max-width: 100%;
}

.uikit-popup__content--left {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 0 12px 12px 0;
  max-height: 100%;
}

.uikit-popup__content--right {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  border-radius: 12px 0 0 12px;
  max-height: 100%;
}

.uikit-popup__content--anchored {
  position: fixed;
  margin: 0;
}

.uikit-popup__close {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 20px;
  cursor: pointer;
  color: var(--uikit-text-secondary);
  z-index: 1;
}

.uikit-fade-enter-active,
.uikit-fade-leave-active {
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-fade-enter-from,
.uikit-fade-leave-to {
  opacity: 0;
}

.uikit-slide-up-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.uikit-slide-up-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-slide-up-enter-from,
.uikit-slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.uikit-slide-down-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.uikit-slide-down-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-slide-down-enter-from,
.uikit-slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.uikit-slide-left-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.uikit-slide-left-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-slide-left-enter-from,
.uikit-slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.uikit-slide-right-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.uikit-slide-right-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-slide-right-enter-from,
.uikit-slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* ===== Center 弹窗：fade + scale 缩放 ===== */
.uikit-fade-scale-enter-active {
  transition: opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-spring);
}

.uikit-fade-scale-leave-active {
  transition: opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-fade-scale-enter-from {
  opacity: 0;
  transform: scale(var(--uikit-anim-scale-enter));
}

.uikit-fade-scale-leave-to {
  opacity: 0;
  transform: scale(var(--uikit-anim-scale-enter));
}
</style>
