<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { createLogger } from '../../utils/logger'
import { getIconSvg } from './icon-map'

export interface IconProps {
  /** 图标名称，格式 "category/icon-name"，如 "actions/trash"；传入 name 后无需 slot */
  name: string
  /** 图标尺寸（px），同时作用于宽高，默认 20 */
  size?: number
  /** 图标颜色，默认 currentColor（跟随文字颜色）；描边图标与填充图标均适用 */
  color?: string
  /** 语义色类型；与 color 同时存在时 color 优先级更高 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /**
   * 内置动画：spin 旋转（无限）/ pulse 脉冲（无限）/ shake 摇摆（一次）/ flash 闪烁（一次）。
   * 时长与曲线跟随主题动画 token（--uikit-anim-duration / --uikit-anim-easing），
   * 全局动画开关与 prefers-reduced-motion 自动生效；触发一次性动画请用 :key 或切换 anim 值。
   */
  anim?: 'spin' | 'pulse' | 'shake' | 'flash'
}

const props = withDefaults(defineProps<IconProps>(), {
  size: 20,
  color: 'currentColor',
})

const logger = createLogger('UIKit:Icon')
const slots = useSlots()

/** 已告警过的缺失图标名，避免重复 warn */
const warnedMissNames = new Set<string>()

/** 当 name 在 icon-map 中能找到且没有默认 slot 时，使用内联 SVG */
const iconSvg = computed(() => {
  const svg = getIconSvg(props.name)
  // 图标 miss 且无 slot 兜底时整个 svg 静默不渲染，开发期 warn 一次提示排查
  if (!svg && !slots.default && !warnedMissNames.has(props.name)) {
    warnedMissNames.add(props.name)
    logger.warn(`[EmIcon] 图标 "${props.name}" 未在 icon-map 中注册，svg 将不渲染`)
  }
  return svg
})

/** 是否使用 name 解析的内联 SVG（有 slot 内容时优先 slot） */
const useInlineSvg = computed(() => iconSvg.value && !slots.default)

/** 使用图标原始 viewBox，避免非 24x24 画布的图标被裁切；缺失时回退 24x24 */
const viewBox = computed(() => iconSvg.value?.viewBox ?? '0 0 24 24')

/**
 * 根节点绘制属性：
 * - 描边式图标：透传源 svg 的 fill="none"/stroke/stroke-width 等，
 *   stroke 为 currentColor 时改绑 props.color，保证 color prop 对描边图标同样生效；
 * - 填充式图标（无 stroke）：维持原行为 fill = props.color。
 */
const svgPaintAttrs = computed<Record<string, string | undefined>>(() => {
  const data = iconSvg.value
  if (data?.stroke) {
    return {
      'fill': data.fill ?? 'none',
      'stroke': data.stroke === 'currentColor' ? props.color : data.stroke,
      'stroke-width': data.strokeWidth,
      'stroke-linecap': data.strokeLinecap,
      'stroke-linejoin': data.strokeLinejoin,
    }
  }
  return { fill: data?.fill ?? props.color }
})

/** 语义色类名 */
const typeClass = computed(() => {
  if (!props.type || props.type === 'default')
    return ''
  return `uikit-icon--${props.type}`
})

/** 内置动画类名 */
const animClass = computed(() => (props.anim ? `uikit-icon--anim-${props.anim}` : ''))
</script>

<template>
  <svg
    v-if="useInlineSvg || slots.default"
    class="uikit-icon"
    :class="[typeClass, animClass]"
    :width="props.size"
    :height="props.size"
    v-bind="svgPaintAttrs"
    :viewBox="viewBox"
  >
    <slot />
    <g v-if="useInlineSvg && iconSvg" v-html="iconSvg.body" />
  </svg>
</template>

<style scoped>
.uikit-icon {
  display: inline-block;
  flex-shrink: 0;
}

.uikit-icon--primary {
  color: var(--uikit-primary-color, #3b82f6);
}

.uikit-icon--success {
  color: var(--uikit-success-color, #22c55e);
}

.uikit-icon--warning {
  color: var(--uikit-warning-color, #f59e0b);
}

.uikit-icon--danger {
  color: var(--uikit-danger-color, #ef4444);
}

.uikit-icon--info {
  color: var(--uikit-info-color, #3b82f6);
}

/* ===== 内置动画：时长/曲线跟随主题动画 token，全局开关与 reduced-motion 自动归零 ===== */
.uikit-icon--anim-spin {
  animation: uikit-icon-spin calc(var(--uikit-anim-duration, 300ms) * 2.6) linear infinite;
}

.uikit-icon--anim-pulse {
  animation: uikit-icon-pulse calc(var(--uikit-anim-duration, 300ms) * 2) var(--uikit-anim-easing, ease) infinite;
}

.uikit-icon--anim-shake {
  animation: uikit-icon-shake calc(var(--uikit-anim-duration, 300ms) * 2.6) var(--uikit-anim-easing, ease);
}

.uikit-icon--anim-flash {
  animation: uikit-icon-flash calc(var(--uikit-anim-duration, 300ms) * 2) var(--uikit-anim-easing, ease);
}

@keyframes uikit-icon-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes uikit-icon-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes uikit-icon-shake {
  0%,
  100% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(18deg);
  }
  20% {
    transform: rotate(-15deg);
  }
  30% {
    transform: rotate(12deg);
  }
  40% {
    transform: rotate(-9deg);
  }
  50% {
    transform: rotate(6deg);
  }
  60% {
    transform: rotate(-4deg);
  }
  70% {
    transform: rotate(2deg);
  }
}

@keyframes uikit-icon-flash {
  0%,
  50%,
  100% {
    opacity: 1;
  }
  25%,
  75% {
    opacity: 0.3;
  }
}
</style>
