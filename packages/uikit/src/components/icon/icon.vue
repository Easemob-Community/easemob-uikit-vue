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

/** 当 name 在 icon-map 中能找到且没有默认 slot 时，使用内联 SVG */
const iconSvg = computed(() => getIconSvg(props.name))

/** 是否使用 name 解析的内联 SVG（有 slot 内容时优先 slot） */
const useInlineSvg = computed(() => iconSvg.value && !slots.default)
</script>

<template>
  <svg
    v-if="useInlineSvg || slots.default"
    class="uikit-icon"
    :width="props.size"
    :height="props.size"
    :fill="props.color"
    viewBox="0 0 24 24"
  >
    <slot />
    <g v-if="useInlineSvg && iconSvg" v-html="iconSvg" />
  </svg>
</template>

<style scoped>
.uikit-icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
