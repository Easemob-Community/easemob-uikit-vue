<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar, EmIcon as Icon, MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MsgQuotePayload } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'

export interface QuoteCardProps {
  quote: MsgQuotePayload
  /** 是否对齐到右侧（己方消息） */
  alignRight?: boolean
  /** 是否展示原消息发送人头像，默认 false */
  showAvatar?: boolean
}

export interface QuoteCardEmits {
  (e: 'click', quote: MsgQuotePayload): void
}

const props = withDefaults(defineProps<QuoteCardProps>(), {
  showAvatar: false,
})
const emit = defineEmits<QuoteCardEmits>()

/** 发送人显示名：内置用户属性展示链（联系人备注 > 用户资料昵称 > userId） */
const { displayName, avatarUrl } = useUserInfo(() => props.quote.msgSender)
const senderName = computed(() => displayName.value || props.quote.msgSender)

/** 非文本类型的前置图标（设计师稿：图片/视频/语音/文件带类型 icon，文本不带） */
const typeIcon = computed(() => {
  switch (props.quote.msgType) {
    case MESSAGE_TYPE.IMAGE:
      return 'file/img'
    case MESSAGE_TYPE.VIDEO:
      return 'file/video'
    case MESSAGE_TYPE.VOICE:
      return 'mic'
    case MESSAGE_TYPE.FILE:
      return 'doc'
    default:
      return ''
  }
})

/** 预览文本（语音含时长、文件含文件名，发送时已由 getQuotePreview 组装进 msgPreview） */
const previewText = computed(() => {
  if (props.quote.msgType === MESSAGE_TYPE.IMAGE && !props.quote.msgPreview)
    return '[图片]'
  if (props.quote.msgType === MESSAGE_TYPE.VIDEO && !props.quote.msgPreview)
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
    <!-- 竖杠：接收方在左，己方经 row-reverse 落到右侧 -->
    <span class="quote-card__bar" aria-hidden="true" />
    <Avatar
      v-if="showAvatar"
      class="quote-card__avatar"
      :src="avatarUrl"
      :name="senderName"
      :size="20"
    />
    <div class="quote-card__content">
      <Icon v-if="typeIcon" class="quote-card__type-icon" :name="typeIcon" :size="20" />
      <span class="quote-card__sender">{{ senderName }}</span>
      <span class="quote-card__divider">：</span>
      <span class="quote-card__preview">{{ previewText }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 设计师稿：无背景卡片，竖杠 + 最多两行 */
.quote-card {
  display: inline-flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 4px;
  max-width: 100%;
  color: var(--uikit-text-secondary, #5E686E);
  font-size: var(--uikit-font-size-13);
  line-height: calc(18px * var(--uikit-font-scale));
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}

/* 己方消息：右对齐，竖杠落到右侧 */
.quote-card--right {
  align-self: flex-end;
  flex-direction: row-reverse;
  text-align: right;
}

.quote-card__bar {
  flex-shrink: 0;
  width: 2px;
  border-radius: 2px;
  background-color: var(--uikit-quote-line-color, #C9CDCF);
}

/* 头像与第一行（昵称行）顶对齐，两行内容时不落到行间 */
.quote-card__avatar {
  flex-shrink: 0;
  align-self: flex-start;
}

/* 类型 icon 位于第一行文本流开头（icon + 昵称 + ：+ 内容），与文本基线对齐 */
.quote-card__type-icon {
  margin-right: 4px;
  vertical-align: -2px;
  color: var(--uikit-text-secondary, #5E686E);
}

/* 两行折叠：inline 段（发送人/分隔/预览）整体参与 -webkit-box 裁剪 */
.quote-card__content {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

.quote-card__sender {
  color: var(--uikit-text-secondary, #5E686E);
  font-weight: var(--uikit-font-weight-medium, 500);
}

.quote-card__divider {
  color: var(--uikit-text-secondary, #5E686E);
}

.quote-card__preview {
  color: var(--uikit-text-secondary, #5E686E);
}
</style>
