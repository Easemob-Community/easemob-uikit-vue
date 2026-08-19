<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../icon/icon.vue'

export interface EmptyProps {
  /** 图标名，格式 "category/icon-name"，如 "empty/contact" */
  icon?: string
  /** 标题文本 */
  title?: string
  /** 描述/副标题文本 */
  description?: string
  /** 尺寸：small 用于弹窗内 / normal 用于列表 / large 用于页面级 */
  size?: 'small' | 'normal' | 'large'
  /** 是否展示默认线描插画（覆盖普通 icon 展示） */
  illustration?: boolean
}

const props = withDefaults(defineProps<EmptyProps>(), {
  size: 'normal',
  illustration: false,
})

const iconSize = computed(() => {
  if (props.size === 'small')
    return 32
  if (props.size === 'large')
    return 64
  return 48
})
</script>

<template>
  <div class="uikit-empty" :class="`size-${props.size}`">
    <div v-if="props.illustration || $slots.illustration" class="uikit-empty__illustration">
      <slot name="illustration">
        <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="48" stroke="currentColor" stroke-width="1.5" opacity="0.15" />
          <rect x="38" y="44" width="44" height="44" rx="8" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
          <path d="M42 88L78 44" stroke="currentColor" stroke-width="1.5" opacity="0.35" stroke-linecap="round" />
          <circle cx="52" cy="58" r="5" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
        </svg>
      </slot>
    </div>
    <Icon
      v-else-if="props.icon"
      :name="props.icon"
      :size="iconSize"
      class="uikit-empty__icon"
    />
    <div class="uikit-empty__content">
      <div v-if="props.title || $slots.title" class="uikit-empty__title">
        <slot name="title">{{ props.title }}</slot>
      </div>
      <div
        v-if="props.description || $slots.description"
        class="uikit-empty__description"
      >
        <slot name="description">{{ props.description }}</slot>
      </div>
    </div>
    <div v-if="$slots.action" class="uikit-empty__action">
      <slot name="action" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.uikit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 16px;
  text-align: center;
  color: var(--uikit-text-secondary);
}

.uikit-empty__icon {
  color: var(--uikit-text-secondary);
  opacity: 0.5;
}

.uikit-empty__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.uikit-empty__title {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.uikit-empty__description {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.uikit-empty__illustration {
  width: 96px;
  height: 96px;
  color: var(--uikit-text-secondary);
  opacity: 0.7;
}

.uikit-empty__action {
  margin-top: 8px;
}

/* 小尺寸：用于弹窗/抽屉内，减少留白 */
.uikit-empty.size-small {
  padding: 24px 16px;
  gap: 8px;
}

.uikit-empty.size-small .uikit-empty__illustration {
  width: 56px;
  height: 56px;
}

.uikit-empty.size-small .uikit-empty__title {
  font-size: var(--uikit-font-size-13);
}

.uikit-empty.size-small .uikit-empty__description {
  font-size: var(--uikit-font-size-12);
}

.uikit-empty.size-large .uikit-empty__illustration {
  width: 128px;
  height: 128px;
}
</style>
