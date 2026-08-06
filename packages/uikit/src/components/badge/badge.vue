<script setup lang="ts">
import { computed } from 'vue'

export type BadgeSize = 'normal' | 'small'
export type BadgeVariant = 'filled' | 'stroked'

export interface BadgeProps {
  count?: number
  max?: number
  dot?: boolean
  color?: string
  /** 尺寸：normal（默认）/ small */
  size?: BadgeSize
  /** 风格：filled（实心，默认）/ stroked（描边） */
  variant?: BadgeVariant
}

const props = withDefaults(defineProps<BadgeProps>(), {
  max: 99,
  dot: false,
  color: 'var(--uikit-danger-color)',
  size: 'normal',
  variant: 'filled',
})

const displayCount = computed(() => {
  if (props.dot) return ''
  if (!props.count) return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})

const digitCount = computed(() => {
  if (props.dot) return 'dot'
  const len = displayCount.value.length
  if (len <= 1) return 'single'
  if (len === 2) return 'double'
  return 'triple'
})
</script>

<template>
  <div class="uikit-badge">
    <slot />
    <span
      v-if="props.count || props.dot"
      class="uikit-badge__content"
      :class="[
        `uikit-badge__content--${props.size}`,
        `uikit-badge__content--${digitCount}`,
        `uikit-badge__content--${props.variant}`,
      ]"
      :style="{ '--uikit-badge-color': props.color }"
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  box-sizing: border-box;
  white-space: nowrap;
  /* 颜色变量由 props.color 注入，支持 variant 复用 */
  --uikit-badge-color: var(--uikit-danger-color);
}

/* ===== 尺寸规范：按数字位数调整胶囊宽度 ===== */

.uikit-badge__content--normal {
  height: 24px;
  min-width: 24px;
  padding: 0 6px;
  border-radius: 12px;
  font-size: var(--uikit-font-size-10);
}

.uikit-badge__content--normal.uikit-badge__content--single {
  width: 24px;
  min-width: 24px;
  padding: 0;
}

.uikit-badge__content--normal.uikit-badge__content--double {
  min-width: 32px;
  padding: 0 8px;
}

.uikit-badge__content--normal.uikit-badge__content--triple {
  min-width: 42px;
  padding: 0 10px;
}

.uikit-badge__content--small {
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  border-radius: 9px;
  font-size: var(--uikit-font-size-8);
}

.uikit-badge__content--small.uikit-badge__content--single {
  width: 18px;
  min-width: 18px;
  padding: 0;
}

.uikit-badge__content--small.uikit-badge__content--double {
  min-width: 24px;
  padding: 0 5px;
}

.uikit-badge__content--small.uikit-badge__content--triple {
  min-width: 32px;
  padding: 0 6px;
}

/* 红点模式 */
.uikit-badge__content--dot {
  padding: 0;
  border-radius: 50%;
}

.uikit-badge__content--normal.uikit-badge__content--dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
}

.uikit-badge__content--small.uikit-badge__content--dot {
  width: 6px;
  height: 6px;
  min-width: 6px;
}

/* ===== 风格：filled / stroked ===== */

.uikit-badge__content--filled {
  background-color: var(--uikit-badge-color);
  color: #fff;
  border: none;
}

.uikit-badge__content--stroked {
  background-color: transparent;
  color: var(--uikit-badge-color);
  border-style: solid;
  border-color: var(--uikit-badge-color);
}

.uikit-badge__content--stroked.uikit-badge__content--normal {
  border-width: 1.5px;
}

.uikit-badge__content--stroked.uikit-badge__content--small {
  border-width: 1px;
}
</style>
