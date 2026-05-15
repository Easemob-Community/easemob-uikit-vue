<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import type { FileMessageType } from '../../../store/message'

export interface FileMessageProps {
  message: FileMessageType
}

const props = defineProps<FileMessageProps>()

/** 文件名 */
const fileName = computed(() => props.message.filename || '未知文件')

/** 文件大小格式化 */
const fileSize = computed(() => {
  const size = props.message.file_length || 0
  if (size === 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

/** 根据文件名推断文件类型图标 */
const fileIcon = computed(() => {
  const name = fileName.value.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'files-media/img'
  if (/\.(mp4|mov|avi|mkv)$/.test(name)) return 'audio-video/video_camera'
  if (/\.(mp3|wav|aac|flac|ogg|m4a)$/.test(name)) return 'audio-video/speaker_wave_2'
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(name)) return 'files-media/doc'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'files-media/archives'
  return 'files-media/file'
})

function handleDownload() {
  // TODO: 接入真实下载逻辑
  const url = props.message.url
  if (url) {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.value
    a.click()
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
        <div class="file-message__name" :title="fileName">{{ fileName }}</div>
        <div v-if="fileSize" class="file-message__size">{{ fileSize }}</div>
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
  background-color: var(--uikit-bg-hover, #e5e7eb);
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
