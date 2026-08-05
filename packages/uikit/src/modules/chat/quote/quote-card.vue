<script setup lang="ts">
import { computed } from 'vue'
import { MESSAGE_TYPE } from '../../../constants'
import type { MsgQuotePayload } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'

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

/** 发送人显示名：内置用户属性展示链（联系人备注 > 用户资料昵称 > userId） */
const { displayName } = useUserInfo(() => props.quote.msgSender)
const senderName = computed(() => displayName.value || props.quote.msgSender)

/** 是否展示图片/视频缩略图 */
const isMedia = computed(() => props.quote.msgType === MESSAGE_TYPE.IMAGE || props.quote.msgType === MESSAGE_TYPE.VIDEO)
/** 缩略图地址 */
const thumbUrl = computed(() => props.quote.msgThumbUrl || '')
/** 非媒体类型或没有缩略图时展示的兜底文案 */
const fallbackPreview = computed(() => {
  if (props.quote.msgType === MESSAGE_TYPE.IMAGE)
    return '[图片]'
  if (props.quote.msgType === MESSAGE_TYPE.VIDEO)
    return '[视频]'
  return props.quote.msgPreview
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
      <span class="quote-card__sender">{{ senderName }}</span>
      <span class="quote-card__divider">：</span>
      <template v-if="isMedia && thumbUrl">
        <img class="quote-card__thumb" :src="thumbUrl" alt="quote-thumb">
      </template>
      <template v-else>
        <span class="quote-card__preview">{{ fallbackPreview }}</span>
      </template>
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
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quote-card__sender {
  color: var(--uikit-text-primary, #303133);
  font-weight: 500;
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quote-card__divider {
  color: var(--uikit-text-secondary, #909399);
  flex-shrink: 0;
}

.quote-card__thumb {
  flex-shrink: 0;
  max-width: 80px;
  max-height: 48px;
  border-radius: 4px;
  object-fit: cover;
  background-color: var(--uikit-bg-base);
}

.quote-card__preview {
  color: var(--uikit-text-secondary, #909399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
