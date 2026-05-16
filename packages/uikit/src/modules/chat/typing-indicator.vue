<script setup lang="ts">
import { useLocale } from '../../locale'

export interface TypingIndicatorProps {
  /** 是否显示 */
  show?: boolean
}

const props = defineProps<TypingIndicatorProps>()
const { t } = useLocale()
</script>

<template>
  <transition name="typing-fade">
    <div v-if="props.show" class="typing-indicator">
      <div class="typing-indicator__dots">
        <span class="typing-indicator__dot" />
        <span class="typing-indicator__dot" />
        <span class="typing-indicator__dot" />
      </div>
      <span class="typing-indicator__text">{{ t('chat.typing') ?? '对方正在输入...' }}</span>
    </div>
  </transition>
</template>

<style scoped>
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  user-select: none;
}

.typing-indicator__dots {
  display: flex;
  align-items: center;
  gap: 3px;
}

.typing-indicator__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--uikit-text-secondary);
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-indicator__dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator__dot:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-indicator__dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 淡入淡出过渡 */
.typing-fade-enter-active,
.typing-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.typing-fade-enter-from,
.typing-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
