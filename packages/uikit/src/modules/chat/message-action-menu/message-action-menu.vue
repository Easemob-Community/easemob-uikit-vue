<script setup lang="ts">
import Icon from '../../../components/icon/icon.vue'
import type { MessageActionItem } from '../types'

export interface MessageActionMenuProps {
  /** 菜单项列表 */
  actions: MessageActionItem[]
}

export interface MessageActionMenuEmits {
  (e: 'select', action: MessageActionItem): void
}

const props = defineProps<MessageActionMenuProps>()
const emit = defineEmits<MessageActionMenuEmits>()

function onItemClick(action: MessageActionItem) {
  emit('select', action)
}
</script>

<template>
  <div class="message-action-menu">
    <div
      v-for="action in props.actions"
      :key="action.type"
      class="message-action-menu__item"
      :class="{ 'message-action-menu__item--danger': action.danger }"
      @click="onItemClick(action)"
    >
      <Icon v-if="action.icon" :name="action.icon" :size="16" />
      <span>{{ action.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.message-action-menu {
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 4px 0;
  background-color: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.message-action-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.message-action-menu__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.message-action-menu__item--danger {
  color: #ef4444;
}

.message-action-menu__item--danger:hover {
  background-color: #fef2f2;
}
</style>
