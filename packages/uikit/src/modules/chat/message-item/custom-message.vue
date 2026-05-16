<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '../../../store/message'

export interface CustomMessageProps {
  message: Message
}

const props = defineProps<CustomMessageProps>()

/** 提取自定义消息展示内容 */
const displayContent = computed(() => {
  const customMsg = props.message as unknown as {
    customEvent?: string
    customExts?: Record<string, any>
  }
  const event = customMsg.customEvent || ''
  const exts = customMsg.customExts
  if (exts && Object.keys(exts).length > 0) {
    return `${event}: ${JSON.stringify(exts)}`
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
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  word-break: break-all;
}

.custom-message--self .custom-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.custom-message__label {
  font-family: monospace;
  font-size: 13px;
}
</style>
