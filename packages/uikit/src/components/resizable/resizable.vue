<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResizable } from '../../composables/use-resizable'

export interface ResizableProps {
  /** 调整方向：horizontal 沿水平轴（右缘拖宽）/ vertical 沿垂直轴（下缘拖高），默认 'horizontal' / Resize axis: horizontal (drag right edge) or vertical (drag bottom edge), default 'horizontal' */
  axis?: 'horizontal' | 'vertical'
  /** 当前尺寸（v-model），单位 px；未传时使用 initial / Current size (v-model) in px; falls back to initial when omitted */
  modelValue?: number
  /** 初始尺寸（px），默认 200 / Initial size in px, default 200 */
  initial?: number
  /** 最小尺寸（px），默认 160 / Minimum size in px, default 160 */
  min?: number
  /** 最大尺寸（px），默认不限制 / Maximum size in px, no limit by default */
  max?: number
  /** 是否禁用拖拽，默认 false / Whether resizing is disabled, default false */
  disabled?: boolean
  /** 手柄命中区尺寸（px），默认 6 / Handle hit area size in px, default 6 */
  handleSize?: number
  /** 是否显示手柄视觉分隔线，默认 false（仅保留光标提示）/ Whether to show the visual divider line on the handle, default false (cursor hint only) */
  showLine?: boolean
}

const props = withDefaults(defineProps<ResizableProps>(), {
  axis: 'horizontal',
  initial: 200,
  min: 160,
  disabled: false,
  handleSize: 6,
  showLine: false,
})

const emit = defineEmits<{
  (e: 'update:model-value', size: number): void
  (e: 'resize-start'): void
  (e: 'resize-end', size: number): void
}>()

const handleRef = ref<HTMLElement>()

/** 手柄命中区尺寸（带单位），供 CSS v-bind 使用 */
const handleSizeVar = computed(() => `${props.handleSize}px`)

const { size, isResizing } = useResizable(handleRef, {
  axis: props.axis,
  min: props.min,
  max: props.max,
  initial: props.modelValue ?? props.initial,
  disabled: () => props.disabled,
  onChange: (s) => {
    emit('update:model-value', s)
  },
  onEnd: (s) => {
    emit('resize-end', s)
  },
})

// 外部受控（v-model）时同步内部尺寸
watch(() => props.modelValue, (v) => {
  if (v !== undefined)
    size.value = v
})

// 拖拽开始事件（isResizing 上升沿触发一次）
watch(isResizing, (v) => {
  if (v)
    emit('resize-start')
})

/** 根元素尺寸：horizontal 控制宽度，vertical 控制高度 */
const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.axis === 'horizontal') {
    style.width = `${size.value}px`
  }
  else {
    style.height = `${size.value}px`
  }
  return style
})
</script>

<template>
  <div class="resizable" :class="{ 'is-resizing': isResizing }" :style="rootStyle">
    <slot />
    <div
      v-if="!props.disabled"
      ref="handleRef"
      class="resizable__handle"
      :class="[`resizable__handle--${props.axis}`, { 'resizable__handle--line': props.showLine }]"
    />
  </div>
</template>

<style scoped>
.resizable {
  position: relative;
  box-sizing: border-box;
}

/* 拖拽中：禁止过渡动画干扰拖拽手感 */
.resizable.is-resizing {
  transition: none;
}

.resizable__handle {
  position: absolute;
  z-index: 1;
  touch-action: none;
  --resizable-handle-size: v-bind(handleSizeVar);
}

.resizable__handle--horizontal {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--resizable-handle-size);
  cursor: col-resize;
}

.resizable__handle--vertical {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--resizable-handle-size);
  cursor: row-resize;
}

/* 视觉分隔线（showLine 开启时显示）：1px 居中于命中区 */
.resizable__handle--line::before {
  content: '';
  position: absolute;
  background-color: var(--uikit-border-color);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.resizable__handle--line.resizable__handle--horizontal::before {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
}

.resizable__handle--line.resizable__handle--vertical::before {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
}

.resizable__handle--line:hover::before,
.resizable__handle--line:active::before {
  background-color: var(--uikit-primary-color);
}
</style>
