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
  // disabled 项也上抛 select，由调用方统一处理（如弹 disabledTip toast），本组件保持纯展示
  emit('select', action)
}
</script>

<template>
  <div class="message-action-menu">
    <div
      v-for="action in props.actions"
      :key="action.type"
      class="message-action-menu__item"
      :class="{
        'message-action-menu__item--danger': action.danger,
        'message-action-menu__item--disabled': action.disabled,
      }"
      @click="onItemClick(action)"
    >
      <Icon v-if="action.icon" :name="action.icon" :size="16" />
      <span>{{ action.label }}</span>
    </div>
    <slot name="extra" />
  </div>
</template>

<style scoped>
.message-action-menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 6px;
}

.message-action-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
  white-space: nowrap;
}

@media (hover: hover) {
  .message-action-menu__item:hover {
    background-color: var(--uikit-bg-hover, #f3f4f6);
  }
}

.message-action-menu__item--danger {
  color: var(--uikit-danger-color, #ef4444);
}

@media (hover: hover) {
  .message-action-menu__item--danger:hover {
    background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
  }
}

.message-action-menu__item--disabled {
  color: var(--uikit-text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

@media (hover: hover) {
  .message-action-menu__item--disabled:hover {
    background-color: transparent;
  }
}
</style>
