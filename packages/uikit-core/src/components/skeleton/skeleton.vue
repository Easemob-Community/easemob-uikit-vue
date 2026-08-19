<script setup lang="ts">
export interface SkeletonProps {
  /** 变体：avatar 头像 / text 单行文字 / paragraph 多行段落 / card 卡片 */
  variant?: 'avatar' | 'text' | 'paragraph' | 'card'
  /** avatar 形状：circle（默认）/ square / rounded */
  shape?: 'circle' | 'square' | 'rounded'
  /** 段落行数，默认 3 */
  rows?: number
  /** 是否启用闪烁动画，默认 true */
  animated?: boolean
  /** 自定义宽度（CSS 值），默认按变体自适应 */
  width?: string
  /** 自定义高度（CSS 值），默认按变体自适应 */
  height?: string
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  variant: 'text',
  shape: 'circle',
  rows: 3,
  animated: true,
})
</script>

<template>
  <div
    class="uikit-skeleton"
    :class="{
      'uikit-skeleton--animated': props.animated,
      [`uikit-skeleton--${props.variant}`]: true,
      [`uikit-skeleton--${props.shape}`]: props.variant === 'avatar',
    }"
    :style="{ width: props.width, height: props.height }"
  >
    <template v-if="props.variant === 'paragraph'">
      <div
        v-for="i in props.rows"
        :key="i"
        class="uikit-skeleton__line"
        :style="{ width: i === props.rows ? '60%' : '100%' }"
      />
    </template>
    <template v-if="props.variant === 'card'">
      <div class="uikit-skeleton__header">
        <div class="uikit-skeleton__avatar uikit-skeleton--circle" />
        <div class="uikit-skeleton__meta">
          <div class="uikit-skeleton__line" style="width: 40%;" />
          <div class="uikit-skeleton__line" style="width: 70%;" />
        </div>
      </div>
      <div class="uikit-skeleton__body">
        <div class="uikit-skeleton__line" />
        <div class="uikit-skeleton__line" style="width: 80%;" />
        <div class="uikit-skeleton__line" style="width: 60%;" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.uikit-skeleton {
  display: inline-block;
  background-color: var(--uikit-bg-hover);
  border-radius: var(--uikit-components-radius, 8px);
  position: relative;
  overflow: hidden;
}

.uikit-skeleton--animated::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.25) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: uikit-skeleton-shimmer 1.5s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .uikit-skeleton--animated::after {
    animation: none;
  }
}

[data-uikit-theme="dark"] .uikit-skeleton--animated::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
}

@keyframes uikit-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.uikit-skeleton--avatar {
  width: 40px;
  height: 40px;
}

.uikit-skeleton--circle {
  border-radius: 50%;
}

.uikit-skeleton--rounded {
  border-radius: var(--uikit-components-radius, 8px);
}

.uikit-skeleton--text {
  width: 100%;
  height: 1em;
  border-radius: 4px;
}

.uikit-skeleton--paragraph {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  background-color: transparent;
  border-radius: 0;
  overflow: visible;
}

.uikit-skeleton--paragraph::after {
  display: none;
}

.uikit-skeleton__line {
  height: 1em;
  background-color: var(--uikit-bg-hover);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.uikit-skeleton--animated .uikit-skeleton__line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.25) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: uikit-skeleton-shimmer 1.5s infinite;
}

[data-uikit-theme="dark"] .uikit-skeleton--animated .uikit-skeleton__line::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .uikit-skeleton--animated .uikit-skeleton__line::after {
    animation: none;
  }
}

.uikit-skeleton--card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: var(--uikit-bg-secondary);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: visible;
}

.uikit-skeleton--card::after {
  display: none;
}

.uikit-skeleton__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.uikit-skeleton__meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uikit-skeleton__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
