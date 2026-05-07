<script setup lang="ts">
import Avatar from '../../components/avatar/avatar.vue'
import Badge from '../../components/badge/badge.vue'
import type { Conversation } from '../../store/conversation'

export interface ConversationItemProps {
  conversation: Conversation
}

const props = defineProps<ConversationItemProps>()
</script>

<template>
  <div class="conversation-item">
    <Avatar :name="props.conversation.name" :size="48" />
    <div class="conversation-item__info">
      <div class="conversation-item__top">
        <span class="conversation-item__name">{{ props.conversation.name }}</span>
        <span v-if="props.conversation.lastMessageTime" class="conversation-item__time">
          {{ new Date(props.conversation.lastMessageTime).toLocaleTimeString() }}
        </span>
      </div>
      <div class="conversation-item__bottom">
        <span class="conversation-item__message">{{ props.conversation.lastMessage }}</span>
        <Badge v-if="props.conversation.unreadCount" :count="props.conversation.unreadCount" />
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
}

.conversation-item:active {
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

.conversation-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.conversation-item__time {
  font-size: 11px;
  color: var(--uikit-text-secondary);
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
</style>
