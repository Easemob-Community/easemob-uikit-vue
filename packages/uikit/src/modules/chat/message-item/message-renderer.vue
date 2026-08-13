<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import type { LocationMessageBody, UiMessage } from '../../../sdk/types'
import { MESSAGE_TYPE } from '../../../constants'
import TextMessage from './text-message.vue'
import ImageMessage from './image-message.vue'
import VoiceMessage from './voice-message.vue'
import VideoMessage from './video-message.vue'
import FileMessage from './file-message.vue'
import CombineMessage from './combine-message.vue'
import CustomMessage from './custom-message.vue'
import LocationMessage from './location-message.vue'

export interface MessageRendererProps {
  message: UiMessage
}

export interface MessageRendererEmits {
  (e: 'reedit', message: UiMessage): void
  (e: 'toggle-translation', message: UiMessage): void
  (e: 'toggle-voice-text', message: UiMessage): void
  (e: 'view-combine', message: UiMessage): void
  (e: 'mention-click', userId: string): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
}

const props = defineProps<MessageRendererProps>()
const emit = defineEmits<MessageRendererEmits>()

/** 消息类型到组件的映射 */
const messageComponentMap: Record<string, Component> = {
  [MESSAGE_TYPE.TEXT]: TextMessage,
  [MESSAGE_TYPE.IMAGE]: ImageMessage,
  [MESSAGE_TYPE.VOICE]: VoiceMessage,
  [MESSAGE_TYPE.VIDEO]: VideoMessage,
  [MESSAGE_TYPE.FILE]: FileMessage,
  [MESSAGE_TYPE.COMBINE]: CombineMessage,
  [MESSAGE_TYPE.CUSTOM]: CustomMessage,
  [MESSAGE_TYPE.LOCATION]: LocationMessage,
}

/** 当前消息对应的渲染组件 */
const renderComponent = computed(() => {
  const type = props.message.type
  return messageComponentMap[type] || null
})

/** 当前消息类型的插槽名称 */
const slotName = computed(() => `message-${props.message.type}` as const)

/** 当前消息类型的底部扩展插槽名称 */
const footerSlotName = computed(() => `message-footer-${props.message.type}` as const)

/** 是否为通知类型消息 */
const isNotice = computed(() => (props.message.type as string) === MESSAGE_TYPE.NOTICE)

/** CMD 透传消息不做任何 UI 渲染 */
const isCmd = computed(() => (props.message.type as string) === MESSAGE_TYPE.CMD)
</script>

<template>
  <div v-if="!isCmd" class="message-renderer">
    <!-- 通知类型消息：居中灰色小字（可通过 #message-notice 插槽完全接管渲染） -->
    <div v-if="isNotice && !$slots[slotName]" class="message-renderer__notice">
      {{ (message.body as any).content || (message as any).content || '' }}
    </div>

    <!-- 类型级插槽覆盖：用户可通过 #message-txt 等完全替换某一类型的渲染 -->
    <div v-else-if="$slots[slotName]" class="message-renderer__slot">
      <slot
        :name="slotName"
        :message="message"
        :emit-action="(action: string, payload?: any) => emit('custom-message-action', action, payload, message)"
      />
    </div>

    <!-- 默认组件渲染 -->
    <component
      :is="renderComponent"
      v-else-if="renderComponent"
      :message="message"
      :is-self="message.isSelf"
      @reedit="emit('reedit', $event)"
      @toggle-translation="emit('toggle-translation', $event)"
      @toggle-voice-text="emit('toggle-voice-text', $event)"
      @view="emit('view-combine', $event)"
      @mention-click="emit('mention-click', $event)"
      @location-click="emit('location-click', $event, message)"
    />

    <!-- 未识别的消息类型 -->
    <div v-else class="message-renderer__unknown">
      [未知消息类型: {{ message.type }}]
    </div>

    <!-- 底部扩展插槽：用于翻译、引用等附加内容 -->
    <div v-if="$slots[footerSlotName]" class="message-renderer__footer">
      <slot :name="footerSlotName" :message="message" />
    </div>
  </div>
</template>

<style scoped>
.message-renderer {
  display: flex;
  flex-direction: column;
}

.message-renderer__notice {
  align-self: center;
  padding: 4px 12px;
  border-radius: 4px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-12);
  text-align: center;
}

.message-renderer__slot {
  display: flex;
  flex-direction: column;
}

.message-renderer__unknown {
  padding: 10px 14px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
}

.message-renderer__footer {
  margin-top: 4px;
}
</style>
