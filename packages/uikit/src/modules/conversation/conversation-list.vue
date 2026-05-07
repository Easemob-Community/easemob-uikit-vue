<script setup lang="ts">
import { useConversation } from '../../composables/use-conversation'
import { useLocale } from '../../locale'
import ConversationItem from './conversation-item.vue'

const { conversationList, currentConversation, selectConversation, pinConversation, sendChannelAck, deleteConversation } = useConversation()
const { t } = useLocale()

function handleSelect(id: string) {
  selectConversation(id)
  // 进入会话后发送已读回执
  sendChannelAck(id)
}
</script>

<template>
  <div class="conversation-list">
    <div class="conversation-list__header">
      <span class="conversation-list__title">{{ t('conversation.title') }}</span>
    </div>
    <div class="conversation-list__items">
      <ConversationItem
        v-for="item in conversationList"
        :key="item.id"
        :conversation="item"
        :class="{ 'is-active': currentConversation?.id === item.id }"
        @click="handleSelect(item.id)"
        @pin="pinConversation"
        @delete="deleteConversation"
        @read="sendChannelAck"
      />
    </div>
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
}

.conversation-list__header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.conversation-list__items {
  flex: 1;
  overflow-y: auto;
}
</style>
