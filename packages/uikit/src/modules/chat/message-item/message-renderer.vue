<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import type { Message } from '../../../store/message'
import { MESSAGE_TYPE } from '../../../constants'
import TextMessage from './text-message.vue'
import ImageMessage from './image-message.vue'
import VoiceMessage from './voice-message.vue'
import VideoMessage from './video-message.vue'
import FileMessage from './file-message.vue'
import CombineMessage from './combine-message.vue'
import CustomMessage from './custom-message.vue'

export interface MessageRendererProps {
  message: Message
}

export interface MessageRendererEmits {
  (e: 'reedit', message: Message): void
  (e: 'toggle-translation', message: Message): void
  (e: 'view-combine', message: Message): void
  (e: 'mention-click', userId: string): void
}

const props = defineProps<MessageRendererProps>()
const emit = defineEmits<MessageRendererEmits>()

/** 消息类型到组件的映射 */
const messageComponentMap: Record<string, Component> = {
  [MESSAGE_TYPE.TXT]: TextMessage,
  [MESSAGE_TYPE.IMG]: ImageMessage,
  [MESSAGE_TYPE.AUDIO]: VoiceMessage,
  [MESSAGE_TYPE.VIDEO]: VideoMessage,
  [MESSAGE_TYPE.FILE]: FileMessage,
  combine: CombineMessage,
  [MESSAGE_TYPE.CUSTOM]: CustomMessage,
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
const isNotice = computed(() => (props.message.type as string) === 'notice')
</script>

<template>
  <div class="message-renderer">
    <!-- 通知类型消息：居中灰色小字 -->
    <div v-if="isNotice" class="message-renderer__notice">
      {{ 'msg' in message ? message.msg : '' }}
    </div>

    <!-- 类型级插槽覆盖：用户可通过 #message-txt 等完全替换某一类型的渲染 -->
    <div v-else-if="$slots[slotName]" class="message-renderer__slot">
      <slot :name="slotName" :message="message" />
    </div>

    <!-- 默认组件渲染 -->
    <component
      :is="renderComponent"
      v-else-if="renderComponent"
      :message="message"
      :is-self="message.isSelf"
      @reedit="emit('reedit', $event)"
      @toggle-translation="emit('toggle-translation', $event)"
      @view="emit('view-combine', $event)"
      @mention-click="emit('mention-click', $event)"
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
  font-size: 12px;
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
  font-size: 13px;
}

.message-renderer__footer {
  margin-top: 4px;
}
</style>
