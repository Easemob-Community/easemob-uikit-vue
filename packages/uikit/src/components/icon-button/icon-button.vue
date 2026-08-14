<script setup lang="ts">
import EmIcon from '../icon/icon.vue'

export interface IconButtonProps {
  /** 图标名称，格式 "category/icon-name" */
  icon: string
  /** 图标尺寸（px）；不传时按按钮 size 回退：small 14 / medium 16 */
  iconSize?: number
  /** 按钮语义类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  /** 视觉变体：solid 实心填充 / outline 描边 / ghost 透明 */
  variant?: 'solid' | 'outline' | 'ghost'
  /** 按钮尺寸：small 28×28 / medium 32×32，默认 'medium'；未传 iconSize 时同时决定图标默认大小 */
  size?: 'small' | 'medium'
  /** 是否禁用；禁用后点击不触发 click，并应用半透明/不可点击样式 */
  disabled?: boolean
  /** hover/tooltip 提示 */
  title?: string
}

export interface IconButtonEmits {
  /** 点击按钮时触发（disabled 时不触发），负载为原生鼠标事件 MouseEvent */
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<IconButtonProps>(), {
  iconSize: undefined,
  type: 'default',
  variant: 'ghost',
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
      `uikit-icon-button--${props.variant}`,
      `uikit-icon-button--${props.size}`,
    ]"
    :disabled="props.disabled"
    :title="props.title"
    @click="handleClick"
  >
    <EmIcon :name="props.icon" :size="props.iconSize ?? (props.size === 'small' ? 14 : 16)" />
  </button>
</template>

<style scoped>
.uikit-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--uikit-components-radius);
  background: transparent;
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
              color var(--uikit-anim-duration) var(--uikit-anim-easing),
              border-color var(--uikit-anim-duration) var(--uikit-anim-easing),
              opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
              transform var(--uikit-anim-duration) var(--uikit-anim-easing),
              box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
  box-sizing: border-box;
}

.uikit-icon-button:active:not(:disabled) {
  transform: translateY(0) scale(var(--uikit-anim-scale-press));
}

.uikit-icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-icon-button--small {
  width: 28px;
  height: 28px;
}

.uikit-icon-button--medium {
  width: 32px;
  height: 32px;
}

/* ---------- solid ---------- */
.uikit-icon-button--default.uikit-icon-button--solid {
  background-color: var(--uikit-bg-base);
  border-color: var(--uikit-border-color);
  color: var(--uikit-text-secondary);
}

.uikit-icon-button--default.uikit-icon-button--solid:hover:not(:disabled) {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

.uikit-icon-button--primary.uikit-icon-button--solid {
  background-color: var(--uikit-primary-color);
  color: #ffffff;
}

.uikit-icon-button--primary.uikit-icon-button--solid:hover:not(:disabled) {
  opacity: 0.9;
}

.uikit-icon-button--success.uikit-icon-button--solid {
  background-color: var(--uikit-success-color);
  color: #ffffff;
}

.uikit-icon-button--success.uikit-icon-button--solid:hover:not(:disabled) {
  opacity: 0.9;
}

.uikit-icon-button--warning.uikit-icon-button--solid {
  background-color: var(--uikit-warning-color);
  color: #ffffff;
}

.uikit-icon-button--warning.uikit-icon-button--solid:hover:not(:disabled) {
  opacity: 0.9;
}

.uikit-icon-button--danger.uikit-icon-button--solid {
  background-color: var(--uikit-danger-color);
  color: #ffffff;
}

.uikit-icon-button--danger.uikit-icon-button--solid:hover:not(:disabled) {
  opacity: 0.9;
}

/* ---------- outline ---------- */
.uikit-icon-button--default.uikit-icon-button--outline {
  background-color: transparent;
  border-color: var(--uikit-border-color);
  color: var(--uikit-text-secondary);
}

.uikit-icon-button--default.uikit-icon-button--outline:hover:not(:disabled) {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

.uikit-icon-button--primary.uikit-icon-button--outline {
  background-color: transparent;
  border-color: var(--uikit-primary-color);
  color: var(--uikit-primary-color);
}

.uikit-icon-button--primary.uikit-icon-button--outline:hover:not(:disabled) {
  background-color: rgba(var(--uikit-primary-rgb), 0.08);
}

.uikit-icon-button--success.uikit-icon-button--outline {
  background-color: transparent;
  border-color: var(--uikit-success-color);
  color: var(--uikit-success-color);
}

.uikit-icon-button--success.uikit-icon-button--outline:hover:not(:disabled) {
  background-color: rgba(var(--uikit-success-rgb), 0.08);
}

.uikit-icon-button--warning.uikit-icon-button--outline {
  background-color: transparent;
  border-color: var(--uikit-warning-color);
  color: var(--uikit-warning-color);
}

.uikit-icon-button--warning.uikit-icon-button--outline:hover:not(:disabled) {
  background-color: rgba(var(--uikit-warning-rgb), 0.08);
}

.uikit-icon-button--danger.uikit-icon-button--outline {
  background-color: transparent;
  border-color: var(--uikit-danger-color);
  color: var(--uikit-danger-color);
}

.uikit-icon-button--danger.uikit-icon-button--outline:hover:not(:disabled) {
  background-color: rgba(var(--uikit-danger-rgb), 0.08);
}

/* ---------- ghost ---------- */
.uikit-icon-button--ghost {
  background-color: transparent;
  border-color: transparent;
}

.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: var(--uikit-bg-hover);
}

.uikit-icon-button--default.uikit-icon-button--ghost {
  color: var(--uikit-text-secondary);
}

.uikit-icon-button--default.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

.uikit-icon-button--primary.uikit-icon-button--ghost {
  color: var(--uikit-primary-color);
}

.uikit-icon-button--primary.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: rgba(var(--uikit-primary-rgb), 0.08);
}

.uikit-icon-button--success.uikit-icon-button--ghost {
  color: var(--uikit-success-color);
}

.uikit-icon-button--success.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: rgba(var(--uikit-success-rgb), 0.08);
}

.uikit-icon-button--warning.uikit-icon-button--ghost {
  color: var(--uikit-warning-color);
}

.uikit-icon-button--warning.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: rgba(var(--uikit-warning-rgb), 0.08);
}

.uikit-icon-button--danger.uikit-icon-button--ghost {
  color: var(--uikit-danger-color);
}

.uikit-icon-button--danger.uikit-icon-button--ghost:hover:not(:disabled) {
  background-color: rgba(var(--uikit-danger-rgb), 0.08);
}
</style>
