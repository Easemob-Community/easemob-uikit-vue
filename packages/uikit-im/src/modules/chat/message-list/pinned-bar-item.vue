<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../../locale'
import { MESSAGE_TYPE } from '../../../constants'
import { useUserInfo } from '../../../composables/use-user-info'
import type { TextMessageBody, UiMessage } from '../../../sdk/types'

export interface PinnedBarItemProps {
  /** 置顶消息 */
  message: UiMessage
  /** 预览文本最大长度 */
  maxPreviewLength?: number
}

const props = withDefaults(defineProps<PinnedBarItemProps>(), {
  maxPreviewLength: 30,
})

const { t } = useLocale()

/** 发送人显示名：内置用户属性展示链（联系人备注 > 用户资料昵称 > userId） */
const { displayName } = useUserInfo(() => props.message.from)
const sender = computed(() => displayName.value || props.message.from || '')

/** 单条预览文本（直接复用 locale 中已带方括号的预览文案，避免再拼接） */
const preview = computed(() => {
  const max = props.maxPreviewLength
  const msg = props.message
  if (msg.type === MESSAGE_TYPE.TEXT) {
    const text = (msg.body as TextMessageBody).content || ''
    return text.length > max ? `${text.slice(0, max)}…` : text
  }
  if (msg.type === MESSAGE_TYPE.IMAGE)
    return t('message.image', '[图片]')
  if (msg.type === MESSAGE_TYPE.VOICE)
    return t('message.audio', '[语音]')
  if (msg.type === MESSAGE_TYPE.VIDEO)
    return t('message.video', '[视频]')
  if (msg.type === MESSAGE_TYPE.FILE)
    return t('message.file', '[文件]')
  if (msg.type === MESSAGE_TYPE.COMBINE)
    return t('message.combine', '[聊天记录]')
  return t('message.custom', '[消息]')
})
</script>

<template>
  <span class="pinned-bar__sender">{{ sender }}：</span>
  <span class="pinned-bar__preview">{{ preview }}</span>
</template>

<style scoped>
.pinned-bar__sender {
  flex-shrink: 0;
  font-weight: 500;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pinned-bar__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
