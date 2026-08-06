<script setup lang="ts">
import { ref } from 'vue'
import Chat from '../../modules/chat/chat.vue'
import { useUIKit } from '../../composables/use-uikit'
import type { ChatConfig } from '../../modules/chat/types'
import type { LocationMessageBody, UiMessage } from '../../sdk/types'

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
  (e: 'recall-failed', error: any, message: UiMessage): void
  (e: 'at-me-click', userId: string): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
}

const props = defineProps<ChatContainerProps>()
const emit = defineEmits<ChatContainerEmits>()

const chatRef = ref<InstanceType<typeof Chat>>()

const { h5 } = useUIKit()

defineExpose({
  setText: (text: string) => chatRef.value?.setText?.(text),
  getText: () => chatRef.value?.getText?.() || '',
})
</script>

<template>
  <div
    class="chat-container"
    :class="{ 'chat-container--keyboard-open': h5.isKeyboardOpen.value }"
  >
    <Chat
      ref="chatRef"
      :config="props.config"
      :loading="props.loading"
      :class="props.class"
      :style="props.style"
      @recall-failed="(err: any, msg: UiMessage) => emit('recall-failed', err, msg)"
      @at-me-click="(userId: string) => emit('at-me-click', userId)"
      @location-click="(body: LocationMessageBody, msg: UiMessage) => emit('location-click', body, msg)"
      @custom-message-action="(action: string, payload: any, msg: UiMessage) => emit('custom-message-action', action, payload, msg)"
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
  /* 使用 background 简写，支持颜色/渐变/图片 */
  background: var(--uikit-chat-bg);
  padding-bottom: var(--uikit-safe-bottom, 0px);
}

/* 键盘弹起时输入框已由 keyboardHeight padding 顶起，去掉容器这份 safe-bottom，避免双重叠加 */
.chat-container--keyboard-open {
  padding-bottom: 0;
}
</style>
