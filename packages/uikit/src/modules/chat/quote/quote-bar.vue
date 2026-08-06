<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import IconButton from '../../../components/icon-button/icon-button.vue'
import { useLocale } from '../../../locale'
import { MESSAGE_TYPE } from '../../../constants'
import { getQuotePreview } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'
import type { ImageMessageBody, UiMessage } from '../../../sdk/types'

export interface QuoteBarProps {
  message: UiMessage
}

export interface QuoteBarEmits {
  (e: 'close'): void
}

const props = defineProps<QuoteBarProps>()
const emit = defineEmits<QuoteBarEmits>()
const { t } = useLocale()

/** 发送人显示名：内置用户属性展示链（联系人备注 > 用户资料昵称 > userId） */
const { displayName } = useUserInfo(() => props.message.from)
const sender = computed(() => displayName.value || props.message.from || '')

/** 预览文本 */
const preview = computed(() => getQuotePreview(props.message))

/** 是否为图片（展示缩略图） */
const isImage = computed(() => props.message.type === MESSAGE_TYPE.IMAGE)

/** 图片缩略图 URL */
const thumbUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  return body.thumbnailUrl || body.localUrl || body.originalImageUrl || ''
})

function onClose() {
  emit('close')
}
</script>

<template>
  <div class="quote-bar">
    <Icon class="quote-bar__icon" name="chat/3lines_n_arrow" :size="14" />
    <img
      v-if="isImage && thumbUrl"
      class="quote-bar__thumb"
      :src="thumbUrl"
      alt="quote-thumb"
    >
    <div class="quote-bar__text">
      <span class="quote-bar__sender">{{ sender }}：</span>
      <span class="quote-bar__preview">{{ preview }}</span>
    </div>
    <IconButton
      class="quote-bar__close"
      icon="actions/close"
      size="small"
      variant="ghost"
      :title="t('quote.cancel') || '取消引用'"
      @click.stop="onClose"
    />
  </div>
</template>

<style scoped>
.quote-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin: 0 12px 4px;
  border-radius: 6px;
  background-color: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
  line-height: 1.4;
  min-height: 32px;
}

.quote-bar__icon {
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}

.quote-bar__thumb {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
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

.quote-bar__sender {
  color: var(--uikit-text-primary);
  flex-shrink: 0;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quote-bar__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-bar__close {
  flex-shrink: 0;
}
</style>
