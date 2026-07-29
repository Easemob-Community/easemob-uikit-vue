<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { getIconSvg } from './icon-map'

export interface IconProps {
  /** 图标名称，格式 "category/icon-name"，如 "actions/trash"；传入 name 后无需 slot */
  name: string
  size?: number
  color?: string
}

const props = withDefaults(defineProps<IconProps>(), {
  size: 20,
  color: 'currentColor',
})

const slots = useSlots()

/** 已告警过的缺失图标名，避免重复 warn */
const warnedMissNames = new Set<string>()

/** 当 name 在 icon-map 中能找到且没有默认 slot 时，使用内联 SVG */
const iconSvg = computed(() => {
  const svg = getIconSvg(props.name)
  // 图标 miss 且无 slot 兜底时整个 svg 静默不渲染，开发期 warn 一次提示排查
  if (!svg && !slots.default && !warnedMissNames.has(props.name)) {
    warnedMissNames.add(props.name)
    console.warn(`[EmIcon] 图标 "${props.name}" 未在 icon-map 中注册，svg 将不渲染`)
  }
  return svg
})

/** 是否使用 name 解析的内联 SVG（有 slot 内容时优先 slot） */
const useInlineSvg = computed(() => iconSvg.value && !slots.default)

/** 使用图标原始 viewBox，避免非 24x24 画布的图标被裁切；缺失时回退 24x24 */
const viewBox = computed(() => iconSvg.value?.viewBox ?? '0 0 24 24')

/**
 * 根节点绘制属性：
 * - 描边式图标（Lucide 等）：透传源 svg 的 fill="none"/stroke/stroke-width 等，
 *   stroke 为 currentColor 时改绑 props.color，保证 color prop 对描边图标同样生效；
 * - 填充式图标（无 stroke）：维持原行为 fill = props.color。
 */
const svgPaintAttrs = computed<Record<string, string | undefined>>(() => {
  const data = iconSvg.value
  if (data?.stroke) {
    return {
      fill: data.fill ?? 'none',
      stroke: data.stroke === 'currentColor' ? props.color : data.stroke,
      'stroke-width': data.strokeWidth,
      'stroke-linecap': data.strokeLinecap,
      'stroke-linejoin': data.strokeLinejoin,
    }
  }
  return { fill: data?.fill ?? props.color }
})
</script>

<template>
  <svg
    v-if="useInlineSvg || slots.default"
    class="uikit-icon"
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
</style>
