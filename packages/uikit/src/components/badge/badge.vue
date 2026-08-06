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

const isSingleDigit = computed(() => !props.dot && displayCount.value.length === 1)
</script>

<template>
  <div class="uikit-badge">
    <slot />
    <span
      v-if="props.count || props.dot"
      class="uikit-badge__content"
      :class="{
        'uikit-badge__content--dot': props.dot,
        'uikit-badge__content--single': isSingleDigit,
      }"
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
  /* 使用 em 尺寸，使徽章容器随字号 token 联动缩放，避免适老版下数字溢出或过于拥挤 */
  min-width: 1.6em;
  height: 1.6em;
  padding: 0 0.25em;
  border-radius: 0.8em;
  font-size: var(--uikit-font-size-10);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  box-sizing: border-box;
}

.uikit-badge__content--single {
  width: 1.6em;
  min-width: 1.6em;
  padding: 0;
  border-radius: 50%;
}

.uikit-badge__content--dot {
  width: 7px;
  height: 7px;
  min-width: 7px;
  padding: 0;
  border-radius: 50%;
}
</style>
