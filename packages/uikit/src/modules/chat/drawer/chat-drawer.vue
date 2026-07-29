<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useThemeStore } from '../../../store/theme'

export interface ChatDrawerProps {
  show: boolean
  overlay?: boolean
  closeOnClickOverlay?: boolean
  width?: string | number
  offsetTop?: string | number
}

const props = withDefaults(defineProps<ChatDrawerProps>(), {
  overlay: true,
  closeOnClickOverlay: true,
  width: 320,
  offsetTop: 0,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}>()

const themeStore = useThemeStore()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'chat-drawer__panel--square' : '',
)

const panelRef = ref<HTMLElement>()

const offsetTopStyle = computed(() => {
  if (typeof props.offsetTop === 'number')
    return `${props.offsetTop}px`
  return props.offsetTop
})

function close() {
  emit('update:show', false)
  emit('close')
}

function onOverlayClick() {
  if (props.closeOnClickOverlay) {
    close()
  }
}

/** 点击 panel 外部关闭（无论是否有 overlay） */
/**
 * 使用 capture: false 确保 bubble 阶段的 event.stopPropagation()（如内层
 * Teleport Popup 上的 @click.stop/@pointerdown.stop）能够阻止此监听器触发，
 * 避免内层弹窗内的点击误关闭外层 Drawer。
 *
 * 另外，Popup/Modal 通常通过 Teleport 挂载到 body，其 DOM 不在 panelRef
 * 内部，因此 onClickOutside 会将其判定为外部点击。这里通过
 * target.closest('.uikit-popup') 忽略所有弹窗容器内的点击，保证从
 * Drawer 中打开 Modal 时不会误关 Drawer。
 */
onClickOutside(panelRef, (event) => {
  if (!props.show || !props.closeOnClickOverlay) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.uikit-popup')) return
  close()
}, { capture: false })
</script>

<template>
  <Transition name="chat-drawer-fade">
    <div v-if="show" class="chat-drawer">
      <!-- 遮罩层（visible overlay） -->
      <div v-if="overlay" class="chat-drawer__overlay" @click="onOverlayClick" />
      <!-- 透明点击层（overlay=false 时覆盖外部区域，支持点击关闭） -->
      <div v-else class="chat-drawer__click-layer" @click="onOverlayClick" />
      <Transition name="chat-drawer-slide">
        <div
          v-if="show"
          ref="panelRef"
          class="chat-drawer__panel"
          :class="shapeClass"
          :style="{ width: typeof width === 'number' ? `${width}px` : width }"
        >
          <div v-if="$slots.header" class="chat-drawer__header">
            <slot name="header" />
          </div>
          <div class="chat-drawer__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="chat-drawer__footer">
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.chat-drawer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;
}

.chat-drawer__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-drawer__click-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.chat-drawer__panel {
  position: absolute;
  top: v-bind(offsetTopStyle);
  right: 0;
  height: calc(100% - v-bind(offsetTopStyle));
  background-color: var(--uikit-bg-base);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  border-radius: var(--uikit-components-radius, 12px) 0 0 var(--uikit-components-radius, 12px);
}

.chat-drawer__panel--square {
  border-radius: 0;
}

.chat-drawer__header {
  flex-shrink: 0;
}

.chat-drawer__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.chat-drawer__footer {
  flex-shrink: 0;
}

/* overlay 淡入淡出 */
.chat-drawer-fade-enter-active,
.chat-drawer-fade-leave-active {
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-drawer-fade-enter-from,
.chat-drawer-fade-leave-to {
  opacity: 0;
}

/* panel 从右侧滑入 */
.chat-drawer-slide-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.chat-drawer-slide-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.chat-drawer-slide-enter-from,
.chat-drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
