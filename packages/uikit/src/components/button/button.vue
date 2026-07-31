<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../store/theme'
import { useRipple } from '../../composables/use-ripple'

export interface ButtonProps {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'danger-outline' | 'default'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

export interface ButtonEmits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
})

const emit = defineEmits<ButtonEmits>()

const themeStore = useThemeStore()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'uikit-button--square' : ''
)

// Ripple 波纹：危险系按钮使用红色波纹，其余使用主题主色
const buttonRef = ref<HTMLElement>()
const rippleColor = computed(() =>
  props.type === 'danger' || props.type === 'danger-outline'
    ? 'rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.25)'
    : 'var(--uikit-primary-color)',
)
useRipple(buttonRef, { color: rippleColor.value })

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    ref="buttonRef"
    class="uikit-button"
    :class="[
      `uikit-button--${props.type}`,
      `uikit-button--${props.size}`,
      shapeClass,
      { 'uikit-button--block': props.block, 'uikit-button--loading': props.loading },
    ]"
    :disabled="props.disabled || props.loading"
    @click="handleClick"
  >
    <span v-if="props.loading" class="uikit-button__loading" />
    <slot />
  </button>
</template>

<style scoped>
.uikit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
              transform 150ms var(--uikit-anim-easing),
              background-color 150ms var(--uikit-anim-easing);
  font-size: 14px;
  /* 为 Ripple 波纹提供定位上下文 */
  position: relative;
  overflow: hidden;
}

.uikit-button:active:not(:disabled):not(.uikit-button--loading) {
  transform: scale(var(--uikit-anim-scale-press));
}

.uikit-button--square {
  border-radius: 4px;
}

/* 当全局为 square 时，保持按钮的 square 样式 */
[data-uikit-components-radius="4px"] .uikit-button:not(.uikit-button--square) {
  border-radius: var(--uikit-components-radius, 8px);
}

.uikit-button--small {
  padding: 6px 12px;
  font-size: 12px;
}

.uikit-button--medium {
  padding: 8px 16px;
}

.uikit-button--large {
  padding: 12px 24px;
  font-size: 16px;
}

.uikit-button--primary {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.uikit-button--success {
  background-color: var(--uikit-success-color);
  color: #fff;
}

.uikit-button--warning {
  background-color: var(--uikit-warning-color);
  color: #fff;
}

.uikit-button--danger {
  background-color: var(--uikit-danger-color);
  color: #fff;
}

.uikit-button--danger-outline {
  background-color: var(--uikit-bg-base);
  color: var(--uikit-danger-color, #ef4444);
}

.uikit-button--danger-outline:hover {
  background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
}

.uikit-button--default {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

.uikit-button--block {
  display: flex;
  width: 100%;
}

.uikit-button--loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.uikit-button__loading {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: uikit-spin 0.8s linear infinite;
}

/* 浅色背景按钮上的 loading 使用深色轨迹 */
.uikit-button--default .uikit-button__loading,
.uikit-button--danger-outline .uikit-button__loading {
  border-color: rgba(0, 0, 0, 0.1);
  border-top-color: var(--uikit-text-primary);
}

@keyframes uikit-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
