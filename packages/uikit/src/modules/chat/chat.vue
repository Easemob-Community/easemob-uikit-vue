<script setup lang="ts">
import { useChat } from '../../composables/use-chat'
import MessageList from './message-list.vue'
import MessageInput from './message-input.vue'

const { currentConversation } = useChat()
</script>

<template>
  <div class="chat">
    <div class="chat__header">
      <span class="chat__title">{{ currentConversation?.name || '聊天' }}</span>
    </div>
    <MessageList class="chat__messages" />
    <MessageInput class="chat__input" />
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

.chat__header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat__messages {
  flex: 1;
  overflow-y: auto;
}

.chat__input {
  border-top: 1px solid #e5e7eb;
}
</style>
