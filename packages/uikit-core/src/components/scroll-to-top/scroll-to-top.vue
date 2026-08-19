<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Icon from '../icon/icon.vue'

export interface ScrollToTopProps {
  /** 监听滚动的目标元素，默认 null 表示监听 window */
  target?: HTMLElement | null
  /** 滚动多少像素后显示按钮，默认 200 */
  visibilityHeight?: number
  /** 滚动到顶部的动画持续时间（ms），默认 300 */
  duration?: number
  /** 按钮右侧偏移量，默认 16px */
  right?: number
  /** 按钮底部偏移量，默认 16px */
  bottom?: number
  /** 自定义图标名称，默认 arrows/arrow_up_thick */
  icon?: string
  /** 按钮大小，默认 36 */
  size?: number
}

const props = withDefaults(defineProps<ScrollToTopProps>(), {
  target: null,
  visibilityHeight: 200,
  duration: 300,
  right: 16,
  bottom: 16,
  icon: 'arrow/up',
  size: 36,
})

const emit = defineEmits<{
  /** 点击按钮时触发（在滚动动画开始前发出，无负载） */
  (e: 'click'): void
}>()

const visible = ref(false)
const scrolling = ref(false)
let scrollEl: HTMLElement | Window = window
let animationFrameId: number | null = null

function resolveScrollElement(): HTMLElement | Window {
  return props.target ?? window
}

function getScrollTop(): number {
  if (scrollEl instanceof Window) {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
  }
  return scrollEl.scrollTop
}

function setScrollTop(top: number) {
  if (scrollEl instanceof Window) {
    window.scrollTo(0, top)
  }
  else {
    scrollEl.scrollTop = top
  }
}

function checkVisibility() {
  const scrollTop = getScrollTop()
  visible.value = scrollTop >= props.visibilityHeight
}

function scrollToTop() {
  if (scrolling.value)
    return
  scrolling.value = true
  emit('click')

  const startTop = getScrollTop()
  if (startTop === 0) {
    scrolling.value = false
    return
  }

  const startTime = performance.now()
  const duration = props.duration

  function step(timestamp: number) {
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeInOutQuad
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - (-2 * progress + 2) ** 2 / 2

    setScrollTop(startTop * (1 - ease))

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step)
    }
    else {
      setScrollTop(0)
      scrolling.value = false
      animationFrameId = null
    }
  }

  animationFrameId = requestAnimationFrame(step)
}

function cleanup() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// 核心：通过 watch 监听 target 变化，动态绑定/解绑 scroll 事件
const stopListen = ref<(() => void) | null>(null)

function bindScrollListener() {
  // 先解绑旧的
  if (stopListen.value) {
    stopListen.value()
    stopListen.value = null
  }
  scrollEl = resolveScrollElement()
  stopListen.value = useEventListener(scrollEl, 'scroll', checkVisibility, { passive: true })
  checkVisibility()
}

watch(() => props.target, () => {
  bindScrollListener()
}, { immediate: true })

onUnmounted(() => {
  cleanup()
  if (stopListen.value) {
    stopListen.value()
  }
})
</script>

<template>
  <Transition name="uikit-scroll-top-fade">
    <div
      v-if="visible"
      class="uikit-scroll-to-top"
      :style="{
        right: `${props.right}px`,
        bottom: `calc(${props.bottom}px + var(--uikit-safe-bottom, 0px))`,
        width: `${props.size}px`,
        height: `${props.size}px`,
      }"
      @click="scrollToTop"
    >
      <Icon :name="props.icon" :size="Math.round(props.size * 0.5)" color="var(--uikit-text-secondary)" />
    </div>
  </Transition>
</template>

<style scoped>
.uikit-scroll-to-top {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-bg-base);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
  z-index: 10;
}

@media (hover: hover) {
  .uikit-scroll-to-top:hover {
    background-color: var(--uikit-bg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

.uikit-scroll-to-top:active {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.uikit-scroll-top-fade-enter-active {
  transition:
    opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
    transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-spring);
}

.uikit-scroll-top-fade-leave-active {
  transition:
    opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
    transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-scroll-top-fade-enter-from,
.uikit-scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}
</style>
