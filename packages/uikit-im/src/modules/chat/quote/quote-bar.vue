<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar, EmIcon as Icon, MESSAGE_TYPE, useLocale } from '@easemob/uikit-core'
import type { ImageMessageBody, UiMessage, VideoMessageBody } from '@easemob/uikit-core'
import { getQuotePreview } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'

export interface QuoteBarProps {
  message: UiMessage
  /** 是否展示原消息发送人头像，默认 false */
  showAvatar?: boolean
}

export interface QuoteBarEmits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<QuoteBarProps>(), {
  showAvatar: false,
})
const emit = defineEmits<QuoteBarEmits>()
const { t } = useLocale()

/** 发送人显示名：内置用户属性展示链（联系人备注 > 用户资料昵称 > userId） */
const { displayName, avatarUrl } = useUserInfo(() => props.message.from)
const sender = computed(() => displayName.value || props.message.from || '')

/** 是否为图片/视频（有缩略图时直接展示缩略图） */
const isMedia = computed(() => props.message.type === MESSAGE_TYPE.IMAGE || props.message.type === MESSAGE_TYPE.VIDEO)

/** 图片/视频缩略图 URL */
const thumbUrl = computed(() => {
  if (props.message.type === MESSAGE_TYPE.IMAGE) {
    const body = props.message.body as ImageMessageBody
    return body.thumbnailUrl || body.localUrl || body.originalImageUrl || ''
  }
  if (props.message.type === MESSAGE_TYPE.VIDEO) {
    const body = props.message.body as VideoMessageBody
    return body.thumbnailUrl || ''
  }
  return ''
})

/** 分类型前置图标（有缩略图的媒体类型不占 icon 位） */
const typeIcon = computed(() => {
  if (isMedia.value && thumbUrl.value)
    return ''
  switch (props.message.type) {
    case MESSAGE_TYPE.IMAGE:
      return 'file/img'
    case MESSAGE_TYPE.VIDEO:
      return 'file/video'
    case MESSAGE_TYPE.VOICE:
      return 'mic'
    case MESSAGE_TYPE.FILE:
      return 'doc'
    default:
      return 'circle/quote'
  }
})

/**
 * 预览文本：语音带时长、文件带文件名（getQuotePreview 已组装）；
 * 图片/视频无缩略图时按设计师稿提示「缩略图未获取」。
 */
const preview = computed(() => {
  if (isMedia.value && !thumbUrl.value)
    return t('quote.thumbUnavailable', '[缩略图未获取]')
  return getQuotePreview(props.message)
})

function onClose() {
  emit('close')
}
</script>

<template>
  <div class="quote-bar">
    <span class="quote-bar__bar" aria-hidden="true" />
    <img
      v-if="isMedia && thumbUrl"
      class="quote-bar__thumb"
      :src="thumbUrl"
      alt="quote-thumb"
    >
    <Icon v-else-if="typeIcon" class="quote-bar__icon" :name="typeIcon" :size="14" />
    <Avatar
      v-if="showAvatar"
      class="quote-bar__avatar"
      :src="avatarUrl"
      :name="sender"
      :size="20"
    />
    <div class="quote-bar__text">
      <span class="quote-bar__sender">{{ sender }}：</span>
      <span class="quote-bar__preview">{{ preview }}</span>
    </div>
    <button
      type="button"
      class="quote-bar__close"
      :title="t('quote.cancel', '取消引用')"
      @click.stop="onClose"
    >
      <Icon name="circle/xmark" :size="18" />
    </button>
  </div>
</template>

<style scoped>
/* 设计稿：无边框无底色，竖杠 + 类型 icon + 昵称 + 内容 + 18×18 关闭 */
.quote-bar {
  display: flex;
  align-items: center;
  /* 设计稿 msg_input quotes 态：sndtext 行内容间距 8px */
  gap: 8px;
  padding: 2px 0;
  /* 竖杠与卡片 padding 左缘对齐（设计稿 sndtext border-l 起始于卡片 px-12 处） */
  margin: 4px 0;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
  /* 设计稿：正文 Regular 14px / 行高 18px */
  line-height: 18px;
  min-height: 24px;
}

/* 竖杠：设计稿 msg_input 引用预览条 2px 左竖条 */
.quote-bar__bar {
  flex-shrink: 0;
  align-self: stretch;
  width: 2px;
  border-radius: 2px;
  background-color: var(--uikit-quote-line-color, #C9CDCF);
}

.quote-bar__icon {
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}

.quote-bar__avatar {
  flex-shrink: 0;
}

.quote-bar__thumb {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.quote-bar__text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 用户名：设计稿 Medium 14px */
.quote-bar__sender {
  color: var(--uikit-text-secondary, #5E686E);
  font-size: var(--uikit-font-size-14);
  font-weight: var(--uikit-font-weight-medium);
  flex-shrink: 0;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 摘录：设计稿 Regular 14px，单行省略 */
.quote-bar__preview {
  font-size: var(--uikit-font-size-14);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 关闭按钮：18×18 纯图标，无底色，hover 加深 */
.quote-bar__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .quote-bar__close:hover {
    color: var(--uikit-text-primary);
  }
}
</style>
