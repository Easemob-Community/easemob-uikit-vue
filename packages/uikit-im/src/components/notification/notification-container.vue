<script setup lang="ts">
import { computed } from 'vue'
import Notification from './notification.vue'
import type { NotificationItem } from './types'

export interface NotificationContainerProps {
  /** 通知条目列表（由 useNotification 单例提供，只读） */
  items: readonly NotificationItem[]
  /** 弹窗容器位置（默认右上角） */
  position?: 'top-right' | 'top-left' | 'top-center'
  /** 同时展示的最大条数，超出丢弃最旧（默认 5） */
  maxVisible?: number
}

const props = withDefaults(defineProps<NotificationContainerProps>(), {
  position: 'top-right',
  maxVisible: 5,
})

const emit = defineEmits<{
  (e: 'close', id: string): void
  (e: 'click', item: NotificationItem): void
}>()

/** 超出上限时丢弃最旧的条目，保证容器高度可控 */
const visibleItems = computed(() => props.items.slice(-props.maxVisible))

const positionClass = computed(() => `uikit-notification-container--${props.position}`)
</script>

<template>
  <Teleport to="body">
    <div class="uikit-notification-container" :class="positionClass">
      <TransitionGroup name="uikit-notification">
        <Notification
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
          @close="emit('close', $event)"
          @click="emit('click', item)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.uikit-notification-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.uikit-notification-container > * {
  pointer-events: auto;
}

.uikit-notification-container--top-left {
  right: auto;
  left: 16px;
}

.uikit-notification-container--top-center {
  right: 0;
  left: 0;
  align-items: center;
}

.uikit-notification-enter-active,
.uikit-notification-leave-active {
  transition-property: opacity, transform;
  transition-timing-function: var(--uikit-anim-easing-decel, cubic-bezier(0, 0, 0.2, 1));
}

.uikit-notification-enter-active {
  transition-duration: var(--uikit-anim-duration-enter, 350ms);
}

.uikit-notification-leave-active {
  transition-duration: var(--uikit-anim-duration-leave, 250ms);
}

.uikit-notification-enter-from {
  opacity: 0;
  transform: translateX(120%);
}

.uikit-notification-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.uikit-notification-leave-to {
  opacity: 0;
  transform: translateX(120%);
}
</style>
