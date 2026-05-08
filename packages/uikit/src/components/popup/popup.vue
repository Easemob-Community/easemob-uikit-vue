<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

export interface PopupProps {
  show: boolean
  position?: 'center' | 'bottom' | 'top' | 'left' | 'right'
  zIndex?: number
  overlay?: boolean
  closeOnClickOverlay?: boolean
  showClose?: boolean
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
})

const emit = defineEmits<PopupEmits>()

const transitionName = computed(() => {
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

onClickOutside(contentRef, () => {
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
            :class="`uikit-popup__content--${props.position}`"
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
