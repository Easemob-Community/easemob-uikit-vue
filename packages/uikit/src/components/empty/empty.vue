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
}

const props = withDefaults(defineProps<EmptyProps>(), {
  size: 'normal',
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
    <Icon
      v-if="props.icon"
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
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.uikit-empty__description {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

/* 小尺寸：用于弹窗/抽屉内，减少留白 */
.uikit-empty.size-small {
  padding: 24px 16px;
  gap: 8px;
}

.uikit-empty.size-small .uikit-empty__title {
  font-size: 13px;
}

.uikit-empty.size-small .uikit-empty__description {
  font-size: 12px;
}
</style>
