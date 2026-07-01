<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import { useToast } from '../../../composables/use-toast'
import { detectEnvironment, downloadFile } from '../../../utils/download'
import type { FileMessageBody, UiMessage } from '../../../sdk/types'

export interface FileMessageProps {
  message: UiMessage
}

const props = defineProps<FileMessageProps>()
const { t } = useLocale()
const { show: showToast } = useToast()

const body = computed(() => props.message.body as FileMessageBody)

/** 文件名 */
const fileName = computed(() => body.value.filename || t('message.file') || '未知文件')

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

/** 根据文件名推断文件类型图标 */
const fileIcon = computed(() => {
  const name = fileName.value.toLowerCase()
  if (/\.(?:jpg|jpeg|png|gif|webp|svg)$/.test(name))
    return 'files-media/img'
  if (/\.(?:mp4|mov|avi|mkv)$/.test(name))
    return 'audio-video/video_camera'
  if (/\.(?:mp3|wav|aac|flac|ogg|m4a)$/.test(name))
    return 'audio-video/speaker_wave_2'
  if (/\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(name))
    return 'files-media/doc'
  if (/\.(?:zip|rar|7z|tar|gz)$/.test(name))
    return 'files-media/archives'
  return 'files-media/file'
})

async function handleDownload() {
  const url = body.value.url
  if (!url) {
    showToast(t('message.download.failed') || '下载失败')
    return
  }

  const env = detectEnvironment()

  try {
    await downloadFile({
      url,
      filename: fileName.value,
      env,
      onSuccess: () => {
        showToast(t('message.download.success') || '下载成功')
      },
      onError: (err) => {
        if (err.name === 'WechatNotSupported') {
          showToast(t('message.download.wechatHint') || '请在浏览器中打开以下载文件')
        }
        else {
          showToast(t('message.download.failed') || '下载失败')
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
    <div class="file-message__bubble">
      <div class="file-message__info">
        <div class="file-message__name" :title="fileName">
          {{ fileName }}
        </div>
        <div v-if="fileSize" class="file-message__size">
          {{ fileSize }}
        </div>
      </div>
      <div class="file-message__icon">
        <Icon :name="fileIcon" :size="36" />
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
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  width: 240px;
  max-width: 240px;
  box-sizing: border-box;
}

.file-message__bubble:hover {
  background-color: var(--uikit-bg-hover);
}

.file-message__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-primary-color);
}

.file-message__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.file-message__name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.file-message__size {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

/* 己方气泡保持主色调 */
.file-message--self .file-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.file-message--self .file-message__bubble:hover {
  background-color: var(--uikit-primary-color);
  opacity: 0.9;
}

.file-message--self .file-message__icon {
  color: rgba(255, 255, 255, 0.85);
}

.file-message--self .file-message__size {
  color: rgba(255, 255, 255, 0.7);
}
</style>
