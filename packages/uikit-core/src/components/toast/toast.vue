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
  /** 自动关闭延时（ms），默认 2000；传 0 表示不自动关闭 */
  duration?: number
  /** 是否显示手动关闭按钮，默认 false */
  closable?: boolean
  /** 位置：top 顶部 / center 居中（默认）/ bottom 底部 */
  position?: 'top' | 'center' | 'bottom'
  /** 操作按钮文案；传入时显示在消息右侧，点击后触发 action 事件 */
  actionText?: string
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 2000,
  closable: false,
  position: 'center',
  actionText: '',
})

const emit = defineEmits<{
  /** 自动关闭计时（duration）到期后触发，负载 false，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
  /** 点击操作按钮时触发 */
  (e: 'action'): void
}>()

const iconMap: Record<NonNullable<ToastProps['type']>, { name: string, type: IconProps['type'] }> = {
  info: { name: 'status/info', type: 'info' },
  success: { name: 'circle/checked', type: 'success' },
  error: { name: 'circle/xmark', type: 'danger' },
  warning: { name: 'triangle/exclamation', type: 'warning' },
}

const iconMeta = computed(() => iconMap[props.type])

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// show 为 true 时启动 duration 定时器，到点自动关闭；duration 为 0 时不自动关闭
watch(() => props.show, (show) => {
  clearTimer()
  if (show && props.duration > 0) {
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
      <div v-if="props.show" class="uikit-toast" :class="`uikit-toast--${props.position}`">
        <div class="uikit-toast__content" :class="`uikit-toast__content--${props.type}`">
          <Icon :name="iconMeta.name" :size="28" :type="iconMeta.type" class="uikit-toast__icon" />
          <span class="uikit-toast__message">{{ props.message }}</span>
          <button
            v-if="props.actionText || $slots.action"
            type="button"
            class="uikit-toast__action"
            @click="emit('action')"
          >
            <slot name="action">{{ props.actionText }}</slot>
          </button>
          <button
            v-if="props.closable"
            type="button"
            class="uikit-toast__close"
            aria-label="close"
            @click="emit('update:show', false)"
          >
            <Icon name="xmark/light" :size="14" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.uikit-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.uikit-toast--center {
  top: 50%;
  transform: translate(-50%, -50%);
}

.uikit-toast--top {
  top: 80px;
}

.uikit-toast--bottom {
  bottom: 80px;
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
  position: relative;
  pointer-events: auto;
}

.uikit-toast__icon {
  color: var(--uikit-text-inverse);
}

.uikit-toast__message {
  text-align: center;
  word-break: break-word;
}

.uikit-toast__action,
.uikit-toast__close {
  border: none;
  background: transparent;
  color: var(--uikit-text-inverse);
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  line-height: inherit;
}

.uikit-toast__action {
  margin-top: 4px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.uikit-toast__close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.8;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .uikit-toast__close:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.15);
  }
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
