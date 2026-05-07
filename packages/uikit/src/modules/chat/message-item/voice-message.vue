<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../../store/theme'
import type { Message } from '../../../store/message'

export interface VoiceMessageProps {
  message: Message
}

const props = defineProps<VoiceMessageProps>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'voice-message__bubble--square' : ''
)
</script>

<template>
  <div class="voice-message" :class="{ 'voice-message--self': props.message.isSelf }">
    <div class="voice-message__bubble" :class="bubbleClass">
      <span class="voice-message__icon">&#9658;</span>
      <span class="voice-message__duration">{{ props.message.body.duration || 0 }}"</span>
    </div>
  </div>
</template>

<style scoped>
.voice-message {
  display: flex;
  max-width: 60%;
}

.voice-message--self {
  justify-content: flex-end;
}

.voice-message__bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
}

.voice-message__bubble--square {
  border-radius: 4px;
}

.voice-message--self .voice-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.voice-message__icon {
  font-size: 12px;
}
</style>
