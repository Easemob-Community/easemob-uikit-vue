<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import type { LocationMessageBody, UiMessage } from '@easemob/uikit-core'
import { MESSAGE_TYPE } from '@easemob/uikit-core'
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

/** 通知文本 */
const noticeText = computed(() => (props.message.body as any).content || (props.message as any).content || '')

/** params 中作为「名称」参与高亮的 key（排除 userId/count/announcement 等非名称字段） */
const NOTICE_HIGHLIGHT_KEYS = ['name', 'names', 'fileName']

/** 转义正则特殊字符 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 通知高亮词表：取 params 里名称类字段的字符串值；`names` 为顿号/逗号拼接，拆成独立名称逐个高亮。
 * 仅高亮在通知文本中实际出现的词，按长度降序避免短词遮蔽长词。
 */
const noticeHighlightTerms = computed(() => {
  const params = (props.message.body as any).params as Record<string, string | number | boolean> | undefined
  if (!params)
    return []
  const terms: string[] = []
  for (const key of NOTICE_HIGHLIGHT_KEYS) {
    const value = params[key]
    if (typeof value !== 'string' || !value.trim())
      continue
    if (key === 'names')
      terms.push(...value.split(/[、,，]/).map(s => s.trim()).filter(Boolean))
    else
      terms.push(value.trim())
  }
  return [...new Set(terms)].filter(t => noticeText.value.includes(t)).sort((a, b) => b.length - a.length)
})

/** 通知文本分段：名称段高亮（蓝色），其余保持中性灰 */
const noticeSegments = computed(() => {
  const text = noticeText.value
  const terms = noticeHighlightTerms.value
  if (!text || terms.length === 0)
    return [{ text, highlight: false }]
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'g')
  return (text.split(pattern) as string[]).filter(Boolean).map(part => ({
    text: part,
    highlight: terms.includes(part),
  }))
})
</script>

<template>
  <div v-if="!isCmd" class="message-renderer">
    <!-- 通知类型消息：居中灰色小字，名称类字段高亮（可通过 #message-notice 插槽完全接管渲染） -->
    <div v-if="isNotice && !$slots[slotName]" class="message-renderer__notice">
      <span
        v-for="(segment, index) in noticeSegments"
        :key="index"
        :class="{ 'message-renderer__notice-name': segment.highlight }"
      >{{ segment.text }}</span>
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
  font-size: var(--uikit-font-size-11);
  text-align: center;
}

/* 通知中的名称（操作者/成员/文件名等）按设计稿高亮为主题色 */
.message-renderer__notice-name {
  color: var(--uikit-primary);
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
  font-size: var(--uikit-font-size-12);
}

.message-renderer__footer {
  margin-top: 4px;
}
</style>
