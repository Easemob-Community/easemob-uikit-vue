<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../locale'
import Avatar from '../avatar/avatar.vue'
import Icon from '../icon/icon.vue'
import type { NotificationItem } from './types'

export interface NotificationProps {
  /** 通知条目数据 */
  item: NotificationItem
}

const props = defineProps<NotificationProps>()

const emit = defineEmits<{
  (e: 'close', id: string): void
  (e: 'click', item: NotificationItem): void
}>()

const { t } = useLocale()

/** 时间展示：今天显示 HH:mm，否则显示 MM/DD */
const timeText = computed(() => {
  const date = new Date(props.item.timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (!isToday) {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
})

/** 合并多条消息时的未读提示文案 */
const mergedCountText = computed(() => {
  if (props.item.unreadCount <= 1)
    return ''
  return t('notification.messagesCount').replace('{count}', String(props.item.unreadCount))
})
</script>

<template>
  <div
    class="uikit-notification"
    role="alert"
    @click="emit('click', props.item)"
  >
    <Avatar :src="props.item.avatar" :name="props.item.title" :size="36" class="uikit-notification__avatar" />
    <div class="uikit-notification__content">
      <div class="uikit-notification__header">
        <span class="uikit-notification__title">{{ props.item.title }}</span>
        <span class="uikit-notification__time">{{ timeText }}</span>
      </div>
      <p class="uikit-notification__body">{{ props.item.body }}</p>
      <p v-if="mergedCountText" class="uikit-notification__merged">{{ mergedCountText }}</p>
    </div>
    <button
      class="uikit-notification__close"
      type="button"
      :aria-label="t('button.close')"
      @click.stop="emit('close', props.item.id)"
    >
      <Icon name="common/close" :size="14">
        <path d="M18 6L6 18M6 6l12 12" />
      </Icon>
    </button>
  </div>
</template>

<style scoped>
.uikit-notification {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 320px;
  padding: 12px;
  border: 1px solid var(--uikit-border, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-elevated, #ffffff);
  box-shadow: var(--uikit-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
  cursor: pointer;
  transition: box-shadow var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
.uikit-notification:hover {
  box-shadow: var(--uikit-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
}
}

.uikit-notification__avatar {
  flex-shrink: 0;
}

.uikit-notification__content {
  flex: 1;
  min-width: 0;
}

.uikit-notification__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.uikit-notification__title {
  overflow: hidden;
  font-size: var(--uikit-font-size-14, 14px);
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uikit-notification__time {
  flex-shrink: 0;
  font-size: var(--uikit-font-size-12, 12px);
  color: var(--uikit-text-tertiary, #9ca3af);
}

.uikit-notification__body {
  margin-top: 4px;
  overflow: hidden;
  font-size: var(--uikit-font-size-13, 13px);
  line-height: 1.4;
  color: var(--uikit-text-secondary, #6b7280);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uikit-notification__merged {
  margin-top: 4px;
  font-size: var(--uikit-font-size-12, 12px);
  color: var(--uikit-primary-color, #3b82f6);
}

.uikit-notification__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--uikit-text-tertiary, #9ca3af);
  cursor: pointer;
  transition-property: background-color, color;
  transition-duration: var(--uikit-anim-duration, 150ms);
  transition-timing-function: var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
.uikit-notification__close:hover {
  background-color: var(--uikit-bg-hover, #e5e7eb);
  color: var(--uikit-text-primary, #111827);
}
}
</style>
