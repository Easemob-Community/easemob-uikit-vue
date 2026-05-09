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
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'files-media/image'
  if (/\.(mp4|mov|avi|mkv)$/.test(name)) return 'files-media/video'
  if (/\.(mp3|wav|aac|flac)$/.test(name)) return 'files-media/audio'
  if (/\.(pdf)$/.test(name)) return 'files-media/file_pdf'
  if (/\.(doc|docx)$/.test(name)) return 'files-media/file_doc'
  if (/\.(xls|xlsx)$/.test(name)) return 'files-media/file_xls'
  if (/\.(ppt|pptx)$/.test(name)) return 'files-media/file_ppt'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'files-media/file_zip'
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
      <div class="file-message__icon">
        <Icon :name="fileIcon" :size="40" />
      </div>
      <div class="file-message__info">
        <div class="file-message__name">{{ fileName }}</div>
        <div v-if="fileSize" class="file-message__size">{{ fileSize }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-message {
  display: flex;
  max-width: 70%;
}

.file-message--self {
  justify-content: flex-end;
}

.file-message__bubble {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  min-width: 200px;
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
  gap: 4px;
  min-width: 0;
}

.file-message__name {
  font-size: 14px;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
}

.file-message__size {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.file-message--self .file-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.file-message--self .file-message__size {
  color: rgba(255, 255, 255, 0.7);
}
</style>
