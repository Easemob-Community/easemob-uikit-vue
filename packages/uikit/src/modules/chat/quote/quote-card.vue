<script setup lang="ts">
import { computed } from 'vue'
import type { MsgQuotePayload } from '../../../composables/use-quote'

export interface QuoteCardProps {
  quote: MsgQuotePayload
  /** 是否对齐到右侧（己方消息） */
  alignRight?: boolean
}

export interface QuoteCardEmits {
  (e: 'click', quote: MsgQuotePayload): void
}

const props = defineProps<QuoteCardProps>()
const emit = defineEmits<QuoteCardEmits>()

/** 非文本类型的预览前缀图标，用于直观区分引用消息类型 */
const typeIcon = computed(() => {
  switch (props.quote.msgType) {
    case 'img': return '🖼'
    case 'video': return '🎬'
    case 'audio': return '🎙'
    case 'file': return '📎'
    case 'loc': return '📍'
    case 'custom': return '📦'
    case 'cmd': return '⚡'
    default: return ''
  }
})

function onClick() {
  emit('click', props.quote)
}
</script>

<template>
  <div
    class="quote-card"
    :class="{ 'quote-card--right': alignRight }"
    @click.stop="onClick"
  >
    <span class="quote-card__bar" aria-hidden="true" />
    <div class="quote-card__content">
      <span class="quote-card__sender">{{ quote.msgSender }}</span>
      <span class="quote-card__divider">：</span>
      <span v-if="typeIcon" class="quote-card__type">{{ typeIcon }}</span>
      <span class="quote-card__preview">{{ quote.msgPreview }}</span>
    </div>
  </div>
</template>

<style scoped>
.quote-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 6px 10px;
  max-width: 100%;
  border-radius: 6px;
  background-color: var(--uikit-bg-secondary, #f4f4f5);
  color: var(--uikit-text-secondary, #909399);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
  box-sizing: border-box;
}

.quote-card:hover {
  background-color: var(--uikit-bg-hover);
}

.quote-card:active {
  background-color: var(--uikit-bg-active, #e4e4e7);
}

/* 己方消息：右对齐 */
.quote-card--right {
  align-self: flex-end;
}

.quote-card__bar {
  flex-shrink: 0;
  width: 2px;
  align-self: stretch;
  border-radius: 1px;
  background-color: var(--uikit-text-tertiary, #c0c4cc);
}

.quote-card__content {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quote-card__sender {
  color: var(--uikit-text-primary, #303133);
  font-weight: 500;
}

.quote-card__divider {
  color: var(--uikit-text-secondary, #909399);
  margin: 0 2px;
}

.quote-card__type {
  margin-right: 2px;
}

.quote-card__preview {
  color: var(--uikit-text-secondary, #909399);
}
</style>
