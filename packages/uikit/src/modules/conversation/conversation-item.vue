<script setup lang="ts">
import { ref } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Badge from '../../components/badge/badge.vue'
import Icon from '../../components/icon/icon.vue'
import type { Conversation } from '../../store/conversation'

export interface ConversationItemProps {
  conversation: Conversation
}

const props = defineProps<ConversationItemProps>()

const emit = defineEmits<{
  (e: 'pin', id: string, isPinned: boolean): void
  (e: 'delete', id: string): void
  (e: 'read', id: string): void
}>()

const showActions = ref(false)

function toggleActions(e: Event) {
  e.stopPropagation()
  showActions.value = !showActions.value
}

function onPin() {
  emit('pin', props.conversation.id, !props.conversation.isPinned)
  showActions.value = false
}

function onDelete() {
  emit('delete', props.conversation.id)
  showActions.value = false
}

function onRead() {
  emit('read', props.conversation.id)
  showActions.value = false
}
</script>

<template>
  <div class="conversation-item" :class="{ 'is-pinned': conversation.isPinned }">
    <Avatar :name="props.conversation.name" :size="48" />
    <div class="conversation-item__info">
      <div class="conversation-item__top">
        <div class="conversation-item__name-wrap">
          <span class="conversation-item__name">{{ props.conversation.name }}</span>
          <span v-if="props.conversation.isPinned" class="conversation-item__pin-badge">
            <Icon name="pin" :size="12" />
          </span>
        </div>
        <span v-if="props.conversation.lastMessageTime" class="conversation-item__time">
          {{ new Date(props.conversation.lastMessageTime).toLocaleTimeString() }}
        </span>
      </div>
      <div class="conversation-item__bottom">
        <span class="conversation-item__message">{{ props.conversation.lastMessage }}</span>
        <div class="conversation-item__actions">
          <Badge v-if="props.conversation.unreadCount" :count="props.conversation.unreadCount" />
          <button class="conversation-item__menu-btn" @click="toggleActions">
            <Icon name="more-horizontal" :size="16" />
          </button>
          <div v-if="showActions" class="conversation-item__action-menu">
            <div v-if="props.conversation.unreadCount" class="action-menu__item" @click.stop="onRead">
              标记已读
            </div>
            <div class="action-menu__item" @click.stop="onPin">
              {{ props.conversation.isPinned ? '取消置顶' : '置顶' }}
            </div>
            <div class="action-menu__item is-danger" @click.stop="onDelete">
              删除会话
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.conversation-item.is-pinned {
  background-color: rgba(var(--uikit-primary-rgb, 59, 130, 246), 0.04);
}

.conversation-item:hover {
  background-color: var(--uikit-bg-secondary);
}

.conversation-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-item__top,
.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.conversation-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item__pin-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-primary, #3b82f6);
  flex-shrink: 0;
}

.conversation-item__time {
  font-size: 11px;
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.conversation-item__message {
  font-size: 13px;
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.conversation-item__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  flex-shrink: 0;
}

.conversation-item__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--uikit-text-secondary);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.conversation-item:hover .conversation-item__menu-btn,
.conversation-item__menu-btn:focus {
  opacity: 1;
}

.conversation-item__menu-btn:hover {
  background-color: var(--uikit-bg-secondary);
}

.conversation-item__action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  background: var(--uikit-bg-primary, #fff);
  border: 1px solid var(--uikit-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 100px;
  overflow: hidden;
}

.action-menu__item {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s;
}

.action-menu__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.action-menu__item.is-danger {
  color: #ef4444;
}

.action-menu__item.is-danger:hover {
  background-color: #fef2f2;
}
</style>
