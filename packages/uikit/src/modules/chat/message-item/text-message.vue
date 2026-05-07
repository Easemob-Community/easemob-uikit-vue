<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../../store/theme'
import type { Message } from '../../../store/message'

export interface TextMessageProps {
  message: Message
}

const props = defineProps<TextMessageProps>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'text-message__bubble--square' : ''
)
</script>

<template>
  <div class="text-message" :class="{ 'text-message--self': props.message.isSelf }">
    <div class="text-message__bubble" :class="bubbleClass">
      {{ props.message.body.msg }}
    </div>
  </div>
</template>

<style scoped>
.text-message {
  display: flex;
  max-width: 70%;
}

.text-message--self {
  justify-content: flex-end;
}

.text-message__bubble {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  word-break: break-word;
}

.text-message__bubble--square {
  border-radius: 4px;
}

.text-message--self .text-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}
</style>
