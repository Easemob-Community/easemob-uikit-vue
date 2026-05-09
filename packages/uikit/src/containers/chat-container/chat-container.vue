<script setup lang="ts">
import Chat from '../../modules/chat/chat.vue'
import type { ChatConfig } from '../../modules/chat/types'

export interface ChatContainerProps {
  /** 聊天页面配置 */
  config?: ChatConfig
}

const props = defineProps<ChatContainerProps>()
</script>

<template>
  <div class="chat-container">
    <Chat :config="props.config">
      <!-- 透传插槽 -->
      <template #header="slotProps">
        <slot name="header" v-bind="slotProps" />
      </template>
      <template #header-avatar="slotProps">
        <slot name="header-avatar" v-bind="slotProps" />
      </template>
      <template #header-title="slotProps">
        <slot name="header-title" v-bind="slotProps" />
      </template>
      <template #header-extra="slotProps">
        <slot name="header-extra" v-bind="slotProps" />
      </template>
    </Chat>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}
</style>
