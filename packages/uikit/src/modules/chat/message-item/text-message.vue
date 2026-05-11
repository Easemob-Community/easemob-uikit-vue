<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import type { TextMessageType } from '../../../store/message'

export interface TextMessageProps {
  message: TextMessageType
}

export interface TextMessageEmits {
  (e: 'reedit', message: TextMessageType): void
}

const props = defineProps<TextMessageProps>()
const emit = defineEmits<TextMessageEmits>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'text-message__bubble--square' : ''
)

const { t } = useLocale()

/** 是否显示重新编辑 */
const showReedit = computed(() => props.message.recalled && props.message.isSelf && props.message.originalMsg)

function onReedit() {
  emit('reedit', props.message)
}
</script>

<template>
  <div class="text-message" :class="{ 'text-message--self': props.message.isSelf }">
    <!-- 已撤回状态：只显示重新编辑按钮（提示文案在 message-bubble-wrapper 统一处理） -->
    <template v-if="props.message.recalled">
      <button
        v-if="showReedit"
        class="text-message__reedit-btn"
        @click.stop="onReedit"
      >
        {{ t('message.reedit') ?? '重新编辑' }}
      </button>
    </template>
    <!-- 正常文本 -->
    <div v-else class="text-message__bubble" :class="bubbleClass">
      {{ props.message.msg }}
    </div>
  </div>
</template>

<style scoped>
.text-message {
  display: flex;
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
  overflow-wrap: break-word;
  word-break: normal;
}

.text-message__bubble--square {
  border-radius: 4px;
}

.text-message--self .text-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.text-message__reedit-btn {
  padding: 2px 8px;
  font-size: 13px;
  color: var(--uikit-primary-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.text-message__reedit-btn:hover {
  opacity: 0.8;
}
</style>
