<script setup lang="ts">
import EmIcon from '../icon/icon.vue'

export interface IconButtonProps {
  /** 图标名称，格式 "category/icon-name" */
  icon: string
  iconSize?: number
  /** 按钮语义类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'small' | 'medium'
  disabled?: boolean
  /** hover/tooltip 提示 */
  title?: string
}

export interface IconButtonEmits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<IconButtonProps>(), {
  iconSize: 18,
  type: 'default',
  size: 'medium',
  disabled: false,
})

const emit = defineEmits<IconButtonEmits>()

function handleClick(event: MouseEvent) {
  if (props.disabled) return
  emit('click', event)
}
</script>

<template>
  <button
    class="uikit-icon-button"
    :class="[
      `uikit-icon-button--${props.type}`,
      `uikit-icon-button--${props.size}`,
    ]"
    :disabled="props.disabled"
    :title="props.title"
    @click="handleClick"
  >
    <EmIcon :name="props.icon" :size="props.iconSize" />
  </button>
</template>

<style scoped>
.uikit-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s var(--uikit-anim-easing, ease),
              color 0.15s var(--uikit-anim-easing, ease),
              opacity 0.15s var(--uikit-anim-easing, ease),
              transform 0.1s var(--uikit-anim-easing, ease);
  flex-shrink: 0;
}

.uikit-icon-button:hover:not(:disabled) {
  background-color: var(--uikit-bg-secondary);
}

.uikit-icon-button:active:not(:disabled) {
  transform: scale(var(--uikit-anim-scale-press, 0.96));
}

.uikit-icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-icon-button--small {
  width: 24px;
  height: 24px;
}

.uikit-icon-button--medium {
  width: 32px;
  height: 32px;
}

.uikit-icon-button--primary {
  color: var(--uikit-primary-color);
}

.uikit-icon-button--success {
  color: var(--uikit-success-color);
}

.uikit-icon-button--warning {
  color: var(--uikit-warning-color);
}

.uikit-icon-button--danger {
  color: var(--uikit-danger-color);
}
</style>
