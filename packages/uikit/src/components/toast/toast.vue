<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import Icon from '../icon/icon.vue'
import type { IconProps } from '../icon/icon.vue'

export interface ToastProps {
  /** 是否显示 toast（v-model:show 受控） */
  show: boolean
  /** 提示文案内容 */
  message: string
  /** 提示类型：info 信息 / success 成功 / error 错误 / warning 警告，默认 'info' */
  type?: 'info' | 'success' | 'error' | 'warning'
  /** 自动关闭延时（ms），默认 2000；到点后触发 update:show(false) */
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 2000,
})

const emit = defineEmits<{
  /** 自动关闭计时（duration）到期后触发，负载 false，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
}>()

const iconMap: Record<NonNullable<ToastProps['type']>, { name: string, type: IconProps['type'] }> = {
  info: { name: 'status/info', type: 'info' },
  success: { name: 'status/success', type: 'success' },
  error: { name: 'status/error', type: 'danger' },
  warning: { name: 'status/warning', type: 'warning' },
}

const iconMeta = computed(() => iconMap[props.type])

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// show 为 true 时启动 duration 定时器，到点自动关闭；与 use-toast 单例行为保持一致
watch(() => props.show, (show) => {
  clearTimer()
  if (show) {
    timer = setTimeout(() => {
      timer = null
      emit('update:show', false)
    }, props.duration)
  }
}, { immediate: true })

onBeforeUnmount(clearTimer)
</script>

<template>
  <Teleport to="body">
    <Transition name="uikit-toast">
      <div v-if="props.show" class="uikit-toast">
        <div class="uikit-toast__content" :class="`uikit-toast__content--${props.type}`">
          <Icon :name="iconMeta.name" :size="28" :type="iconMeta.type" class="uikit-toast__icon" />
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
  border-radius: var(--uikit-components-radius, 12px);
  background-color: rgba(0, 0, 0, 0.75);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-14);
  min-width: 120px;
}

.uikit-toast__icon {
  color: var(--uikit-text-inverse);
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
