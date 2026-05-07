<script setup lang="ts">
import { computed } from 'vue'

export interface BadgeProps {
  count?: number
  max?: number
  dot?: boolean
  color?: string
}

const props = withDefaults(defineProps<BadgeProps>(), {
  max: 99,
  dot: false,
  color: 'var(--uikit-danger-color)',
})

const displayCount = computed(() => {
  if (props.dot) return ''
  if (!props.count) return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})
</script>

<template>
  <div class="uikit-badge">
    <slot />
    <span
      v-if="props.count || props.dot"
      class="uikit-badge__content"
      :class="{ 'uikit-badge__content--dot': props.dot }"
      :style="{ backgroundColor: props.color }"
    >
      {{ displayCount }}
    </span>
  </div>
</template>

<style scoped>
.uikit-badge {
  position: relative;
  display: inline-flex;
}

.uikit-badge__content {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.uikit-badge__content--dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  padding: 0;
  border-radius: 50%;
}
</style>
