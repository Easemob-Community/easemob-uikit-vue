<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { EmIcon as Icon, EmText } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { useThemeStore } from '@easemob/uikit-core'
import { detectEnvironment, downloadFile } from '@easemob/uikit-core'
import { INJECTION_KEY } from '@easemob/uikit-core'
import type { FileMessageBody, UiMessage } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'

export interface FileMessageProps {
  message: UiMessage
}

const props = defineProps<FileMessageProps>()
const { t } = useLocale()
const { show: showToast } = useToast()

/**
 * 圆角 class：config.messageList.bubbleShape（message-bubble-wrapper provide）优先；
 * 未配置时回落主题全局 bubbleShape（默认 round 16px，与其他类型气泡同一配置链）
 */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'file-message__bubble--square'
    : '',
)

const body = computed(() => props.message.body as FileMessageBody)

/** 文件名 */
const fileName = computed(() => body.value.filename || t('message.file', '未知文件'))

/** 文件大小格式化 */
const fileSize = computed(() => {
  const size = body.value.fileSize || body.value.fileLength || 0
  if (size === 0)
    return ''
  if (size < 1024)
    return `${size} B`
  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

/** 文件类型 key：与 --uikit-file-icon-{key} token 一一对应；'file' 为未识别兜底 */
type FileTypeKey = 'pdf' | 'xls' | 'doc' | 'ppt' | 'md' | 'img' | 'video' | 'audio' | 'file'

/** 按扩展名归类：音频/图片/视频按类别，明确格式按明确图标，其余回落 file/empty */
const FILE_TYPE_RULES: Array<{ key: Exclude<FileTypeKey, 'file'>, icon: string, pattern: RegExp }> = [
  { key: 'pdf', icon: 'file/pdf', pattern: /\.pdf$/ },
  { key: 'xls', icon: 'file/xls', pattern: /\.(?:xls|xlsx|csv|et)$/ },
  { key: 'doc', icon: 'doc', pattern: /\.(?:doc|docx|txt|rtf|wps)$/ },
  { key: 'ppt', icon: 'file/ppt', pattern: /\.(?:ppt|pptx|dps)$/ },
  { key: 'md', icon: 'file/md', pattern: /\.(?:md|markdown)$/ },
  { key: 'img', icon: 'file/img', pattern: /\.(?:jpe?g|png|gif|webp|svg|bmp|ico|heic)$/ },
  { key: 'video', icon: 'file/video', pattern: /\.(?:mp4|mov|avi|mkv|webm|flv|wmv)$/ },
  { key: 'audio', icon: 'file/audio', pattern: /\.(?:mp3|wav|aac|flac|ogg|m4a|wma)$/ },
]

const fileTypeRule = computed(
  () => FILE_TYPE_RULES.find(rule => rule.pattern.test(fileName.value.toLowerCase())),
)

/** 类型 key（驱动图标底色 token） */
const fileType = computed<FileTypeKey>(() => fileTypeRule.value?.key ?? 'file')

/** 类型图标（未识别回落 file/empty） */
const fileIcon = computed(() => fileTypeRule.value?.icon ?? 'file/empty')

async function handleDownload() {
  const url = body.value.url
  if (!url) {
    showToast(t('message.download.failed', '下载失败'), 'error')
    return
  }

  const env = detectEnvironment()

  try {
    await downloadFile({
      url,
      filename: fileName.value,
      env,
      onSuccess: () => {
        showToast(t('message.download.success', '下载成功'), 'success')
      },
      onError: (err) => {
        if (err.name === 'WechatNotSupported') {
          showToast(t('message.download.wechatHint', '请在浏览器中打开以下载文件'), 'warning')
        }
        else {
          showToast(t('message.download.failed', '下载失败'), 'error')
        }
      },
    })
  }
  catch {
    // 错误已在 onError 回调中处理，此处静默捕获避免未处理的 Promise  rejection
  }
}
</script>

<template>
  <div
    class="file-message"
    :class="{ 'file-message--self': props.message.isSelf }"
    @click="handleDownload"
  >
    <div class="file-message__bubble" :class="bubbleClass">
      <div
        class="file-message__icon"
        :style="{ backgroundColor: `var(--uikit-file-icon-${fileType})` }"
      >
        <Icon :name="fileIcon" :size="20" />
      </div>
      <div class="file-message__info">
        <EmText
          level="body"
          weight="medium"
          ellipsis
          class="file-message__name"
          :title="fileName"
        >
          {{ fileName }}
        </EmText>
        <div v-if="fileSize" class="file-message__size">
          {{ fileSize }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-message {
  display: flex;
  max-width: 100%;
}

.file-message--self {
  justify-content: flex-end;
}

.file-message__bubble {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--uikit-bubble-radius, 16px);
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  width: 240px;
  max-width: 240px;
  box-sizing: border-box;
}

.file-message__bubble--square {
  border-radius: var(--uikit-bubble-radius-square, 8px);
}

@media (hover: hover) {
  .file-message__bubble:hover {
    background-color: var(--uikit-bg-hover);
  }
}

/* 类型图标底色块：双方均固定在左侧，底色为类型品牌色 token，图标本体白色 */
.file-message__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-file-icon-file);
  color: var(--uikit-text-inverse, #FFFFFF);
}

.file-message__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

/* 标题跟随气泡文字色（覆盖 EmText 默认 primary，与设计稿 #171A1C / 己方白字一致） */
.file-message__bubble .file-message__name {
  color: var(--uikit-bubble-text-other);
}

.file-message__size {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

/* 己方气泡保持主色调 */
.file-message--self .file-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}


@media (hover: hover) {
  .file-message--self .file-message__bubble:hover {
    background-color: var(--uikit-bubble-bg-self);
    opacity: 0.9;
  }
}

.file-message--self .file-message__bubble .file-message__name {
  color: var(--uikit-bubble-text-self);
}

.file-message--self .file-message__size {
  color: var(--uikit-bubble-text-self);
  opacity: 0.7;
}
</style>
