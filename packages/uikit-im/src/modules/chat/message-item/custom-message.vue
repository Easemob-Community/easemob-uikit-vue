<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { INJECTION_KEY, useThemeStore } from '@easemob/uikit-core'
import type { CustomMessageBody, UiMessage } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'

export interface CustomMessageProps {
  message: UiMessage
}

const props = defineProps<CustomMessageProps>()

const themeStore = useThemeStore()

/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'custom-message__bubble--square'
    : '',
)

const body = computed(() => props.message.body as CustomMessageBody)

/** 提取自定义消息展示内容 */
const displayContent = computed(() => {
  const event = body.value.event || ''
  const params = body.value.params
  if (params && Object.keys(params).length > 0) {
    return `${event}: ${JSON.stringify(params)}`
  }
  return event || '[自定义消息]'
})
</script>

<template>
  <div class="custom-message" :class="{ 'custom-message--self': props.message.isSelf }">
    <div class="custom-message__bubble" :class="bubbleClass">
      <span class="custom-message__label">{{ displayContent }}</span>
    </div>
  </div>
</template>

<style scoped>
.custom-message {
  display: flex;
  max-width: 70%;
}

.custom-message--self {
  justify-content: flex-end;
}

.custom-message__bubble {
  padding: 10px 14px;
  border-radius: var(--uikit-bubble-radius, 16px);
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  word-break: break-all;
}

.custom-message__bubble--square {
  border-radius: var(--uikit-bubble-radius-square, 8px);
}

.custom-message--self .custom-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

.custom-message__label {
  font-family: monospace;
  font-size: var(--uikit-font-size-13);
}
</style>
