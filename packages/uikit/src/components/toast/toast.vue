<script setup lang="ts">
import { computed } from 'vue'

export interface ToastProps {
  show: boolean
  message: string
  type?: 'info' | 'success' | 'error' | 'warning'
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 2000,
})

const iconMap: Record<string, string> = {
  info: 'i',
  success: '✓',
  error: '✕',
  warning: '!',
}

const icon = computed(() => iconMap[props.type])
</script>

<template>
  <Teleport to="body">
    <Transition name="uikit-toast">
      <div v-if="props.show" class="uikit-toast">
        <div class="uikit-toast__content" :class="`uikit-toast__content--${props.type}`">
          <span class="uikit-toast__icon">{{ icon }}</span>
          <span class="uikit-toast__message">{{ props.message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.uikit-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
}

.uikit-toast__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  min-width: 120px;
}

.uikit-toast__icon {
  font-size: 24px;
  font-weight: 600;
}

.uikit-toast__message {
  text-align: center;
  word-break: break-word;
}

.uikit-toast-enter-active {
  transition: opacity var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel),
              transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-spring);
}

.uikit-toast-leave-active {
  transition: opacity var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel),
              transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.uikit-toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.85);
}

.uikit-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}
</style>
