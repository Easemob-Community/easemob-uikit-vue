<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useUserInfo } from '../../../composables/use-user-info'

export interface SharedFileListItemProps {
  file: any
  maxFileNameLength?: number
}

const props = defineProps<SharedFileListItemProps>()

const emit = defineEmits<{
  (e: 'more', file: any, event: MouseEvent): void
}>()

const ownerUserId = computed(() => props.file.fileOwner?.userId || '')

const { displayName: ownerDisplayName } = useUserInfo(ownerUserId)

/** 文件扩展名 → 类型图标（无匹配时回落通用文件图标） */
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'files-media/file_pdf',
  xls: 'files-media/file_xls',
  xlsx: 'files-media/file_xls',
  ppt: 'files-media/file_ppt',
  pptx: 'files-media/file_ppt',
  jpg: 'files-media/file_img',
  jpeg: 'files-media/file_img',
  png: 'files-media/file_img',
  gif: 'files-media/file_img',
  webp: 'files-media/file_img',
  bmp: 'files-media/file_img',
  svg: 'files-media/file_img',
  mp3: 'files-media/file_audio',
  wav: 'files-media/file_audio',
  m4a: 'files-media/file_audio',
  aac: 'files-media/file_audio',
  ogg: 'files-media/file_audio',
  mp4: 'files-media/file_video',
  mov: 'files-media/file_video',
  avi: 'files-media/file_video',
  mkv: 'files-media/file_video',
  webm: 'files-media/file_video',
}

/** 当前文件类型图标 */
const fileIcon = computed(() => {
  const fileName = props.file.fileName || ''
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : ''
  return (ext && FILE_TYPE_ICONS[ext]) || 'files-media/file'
})

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileName(fileName: string): string {
  const maxLength = props.maxFileNameLength ?? 24
  if (fileName.length <= maxLength)
    return fileName
  const dotIndex = fileName.lastIndexOf('.')
  let name = fileName
  let ext = ''
  if (dotIndex > 0 && dotIndex < fileName.length - 1) {
    ext = fileName.slice(dotIndex)
    name = fileName.slice(0, dotIndex)
  }
  if (name.length + ext.length <= maxLength)
    return fileName
  const ellipsis = '...'
  const available = maxLength - ext.length - ellipsis.length
  if (available <= 0)
    return `${fileName.slice(0, maxLength - ellipsis.length)}${ellipsis}`
  const side = Math.max(1, Math.floor(available / 2))
  return `${name.slice(0, side)}${ellipsis}${name.slice(-side)}${ext}`
}

function onMoreClick(event: MouseEvent) {
  emit('more', props.file, event)
}
</script>

<template>
  <div class="shared-file-list__item" @click="onMoreClick">
    <Icon :name="fileIcon" :size="20" class="shared-file-list__icon" />
    <div class="shared-file-list__info">
      <span class="shared-file-list__name" :title="props.file.fileName">{{ formatFileName(props.file.fileName) }}</span>
      <span class="shared-file-list__meta">
        <template v-if="props.file.fileSize">{{ formatSize(props.file.fileSize) }}</template>
        <template v-if="props.file.fileOwner">
          {{ ownerDisplayName || props.file.fileOwner?.userId }}
        </template>
      </span>
    </div>
    <button
      class="shared-file-list__more-btn"
      @click.stop="onMoreClick"
    >
      <Icon name="actions/ellipsis_vertical" :size="20" />
    </button>
  </div>
</template>

<style scoped>
.shared-file-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.shared-file-list__icon {
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}
.shared-file-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shared-file-list__name {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shared-file-list__meta {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}
.shared-file-list__item:hover .shared-file-list__name {
  color: var(--uikit-primary-color);
}
.shared-file-list__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: all var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  flex-shrink: 0;
}
@media (hover: hover) {
.shared-file-list__more-btn:hover {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-primary-color);
}
}
</style>
