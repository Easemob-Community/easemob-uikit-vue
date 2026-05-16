<script setup lang="ts">
import { ref } from 'vue'
import Chat from '../../modules/chat/chat.vue'
import type { ChatConfig } from '../../modules/chat/types'
import type { Message } from '../../store/message'

export interface ChatContainerProps {
  /** 聊天页面配置 */
  config?: ChatConfig
  /** 是否处于全局加载状态 */
  loading?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
}

export interface ChatContainerEmits {
  (e: 'recall-failed', error: any, message: Message): void
  (e: 'at-me-click', userId: string): void
}

const props = defineProps<ChatContainerProps>()
const emit = defineEmits<ChatContainerEmits>()

const chatRef = ref<InstanceType<typeof Chat>>()

defineExpose({
  setText: (text: string) => chatRef.value?.setText?.(text),
  getText: () => chatRef.value?.getText?.() || '',
})
</script>

<template>
  <div class="chat-container">
    <Chat
      ref="chatRef"
      :config="props.config"
      :loading="props.loading"
      :class="props.class"
      :style="props.style"
      @recall-failed="(err: any, msg: Message) => emit('recall-failed', err, msg)"
      @at-me-click="(userId: string) => emit('at-me-click', userId)"
    >
      <!-- 透传空状态插槽 -->
      <template #empty>
        <slot name="empty" />
      </template>
      <!-- 透传加载状态插槽 -->
      <template #loading>
        <slot name="loading" />
      </template>
      <!-- 透传错误边界插槽 -->
      <template #error="slotProps">
        <slot name="error" v-bind="slotProps" />
      </template>
      <!-- 透传 header 插槽 -->
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
      <!-- 透传所有消息类型级插槽（如 #message-txt, #message-footer-txt 等） -->
      <template
        v-for="(_, name) in $slots"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps" />
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
