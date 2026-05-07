<script setup lang="ts">
import { useChat } from '../../composables/use-chat'
import TextMessage from './message-item/text-message.vue'

const { messages } = useChat()
</script>

<template>
  <div class="message-list">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message-list__item"
      :class="{ 'message-list__item--self': msg.isSelf }"
    >
      <TextMessage :message="msg" />
    </div>
  </div>
</template>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.message-list__item {
  display: flex;
  align-items: flex-start;
}

.message-list__item--self {
  flex-direction: row-reverse;
}
</style>
