<script setup lang="ts">
import { computed } from 'vue'
import type { CustomMessageBody, UiMessage } from '../../../sdk/types'

export interface CustomMessageProps {
  message: UiMessage
}

const props = defineProps<CustomMessageProps>()

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
    <div class="custom-message__bubble">
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
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  word-break: break-all;
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
