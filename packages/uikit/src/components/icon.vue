<script setup lang="ts">
export interface IconProps {
  name: string
  size?: number
  color?: string
}

const props = withDefaults(defineProps<IconProps>(), {
  size: 20,
  color: 'currentColor',
})
</script>

<template>
  <svg
    class="uikit-icon"
    :width="props.size"
    :height="props.size"
    :fill="props.color"
    viewBox="0 0 24 24"
  >
    <slot />
  </svg>
</template>

<style scoped>
.uikit-icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
