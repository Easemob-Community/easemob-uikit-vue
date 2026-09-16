<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../store/theme'
import { useRipple } from '../../composables/use-ripple'

export interface ButtonProps {
  /** 语义类型：primary / success / warning / danger / danger-outline / outline（中性描边）/ default（默认） */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'danger-outline' | 'outline' | 'default'
  /** 尺寸：small / medium（默认）/ large */
  size?: 'small' | 'medium' | 'large'
  /** 是否禁用；禁用时按钮不可点击且不触发 click */
  disabled?: boolean
  /** 是否加载中；显示加载动画并禁止点击（行为同 disabled） */
  loading?: boolean
  /** 是否块级展示，占满父容器整行宽度 */
  block?: boolean
  /** 是否全圆角（pill）形态，默认 false；优先级高于全局 componentsShape 的 square 修饰 */
  pill?: boolean
}

export interface ButtonEmits {
  /** 按钮可点击（非 disabled / 非 loading）时触发，负载为原生点击事件 MouseEvent */
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
  pill: false,
})

const emit = defineEmits<ButtonEmits>()

const themeStore = useThemeStore()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'uikit-button--square' : '',
)

// Ripple 波纹：危险系按钮使用红色波纹，其余使用主题主色
const buttonRef = ref<HTMLElement>()
const rippleColor = computed(() =>
  props.type === 'danger' || props.type === 'danger-outline'
    ? 'rgba(var(--uikit-danger-rgb), 0.25)'
    : 'var(--uikit-primary-color)',
)
useRipple(buttonRef, { color: rippleColor.value })

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading)
    return
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
      { 'uikit-button--block': props.block, 'uikit-button--loading': props.loading, 'uikit-button--pill': props.pill },
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
  border-radius: var(--uikit-components-radius);
  cursor: pointer;
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  font-size: var(--uikit-font-size-14);
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

/* pill 全圆角：优先级高于全局 square 修饰与 components-radius 覆写 */
.uikit-button--pill,
[data-uikit-components-radius='4px'] .uikit-button--pill {
  border-radius: 9999px;
}

/* 当全局为 square 时，保持按钮的 square 样式 */
[data-uikit-components-radius='4px'] .uikit-button:not(.uikit-button--square) {
  border-radius: var(--uikit-components-radius, 8px);
}

.uikit-button--small {
  padding: calc(var(--uikit-button-padding-y, 8px) - 2px) 12px;
  font-size: var(--uikit-font-size-12);
}

.uikit-button--medium {
  padding: var(--uikit-button-padding-y, 8px) 16px;
}

.uikit-button--large {
  padding: calc(var(--uikit-button-padding-y, 8px) + 4px) 24px;
  font-size: var(--uikit-font-size-16);
}

.uikit-button--primary {
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
}

.uikit-button--success {
  background-color: var(--uikit-success-color);
  color: var(--uikit-text-inverse);
}

.uikit-button--warning {
  background-color: var(--uikit-warning-color);
  color: var(--uikit-text-inverse);
}

.uikit-button--danger {
  background-color: var(--uikit-danger-color);
  color: var(--uikit-text-inverse);
}

.uikit-button--danger-outline {
  background-color: var(--uikit-bg-base);
  color: var(--uikit-danger-color);
}

/* outline 中性描边：白底 + 边框 + 主文字色（设计稿次按钮 Action2 形态） */
.uikit-button--outline {
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  border: 1px solid var(--uikit-border-color);
}

@media (hover: hover) {
  .uikit-button--danger-outline:hover {
    background-color: rgba(var(--uikit-danger-rgb), 0.08);
  }
}

.uikit-button--default {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

/* 各类型 hover 反馈（可点击按钮必须有 hover 态）：
   default 走通用 --uikit-bg-hover；primary 走独立 token；
   success/warning/danger 无独立 token，参照 Switch 的 color-mix 派生模式
   （混入文字色：浅色主题变暗、深色主题变亮） */
@media (hover: hover) {
  .uikit-button--default:hover:not(:disabled) {
    /* bg-secondary 与 --uikit-bg-hover 色值过近（#F3F4F6/#F5F5F5）反馈不可见，
       改用 color-mix 派生（混入文字色：浅主题变暗、深主题变亮），与 Switch 派生模式一致 */
    background-color: color-mix(in srgb, var(--uikit-bg-secondary) 90%, var(--uikit-text-primary));
  }

  .uikit-button--outline:hover:not(:disabled) {
    background-color: var(--uikit-bg-hover);
  }

  .uikit-button--primary:hover:not(:disabled) {
    background-color: var(--uikit-primary-hover);
  }

  .uikit-button--success:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--uikit-success-color) 88%, var(--uikit-text-primary));
  }

  .uikit-button--warning:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--uikit-warning-color) 88%, var(--uikit-text-primary));
  }

  .uikit-button--danger:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--uikit-danger-color) 88%, var(--uikit-text-primary));
  }
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
  border-top-color: var(--uikit-text-inverse);
  border-radius: 50%;
  animation: uikit-spin 0.8s linear infinite;
}

/* 浅色背景按钮上的 loading 使用深色轨迹 */
.uikit-button--default .uikit-button__loading,
.uikit-button--outline .uikit-button__loading,
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
