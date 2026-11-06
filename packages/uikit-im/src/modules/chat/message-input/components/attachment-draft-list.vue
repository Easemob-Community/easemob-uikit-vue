<script setup lang="ts">
import { MESSAGE_TYPE, EmIcon as Icon, useLocale } from '@easemob-community/uikit-core'
import type { MultiBodyAttachmentDraftItem } from '../multi-body-draft'
import { resolveFileType } from '../../file-type'

withDefaults(defineProps<{
  items: readonly MultiBodyAttachmentDraftItem[]
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

const { t } = useLocale()

function formatFileSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <ul v-if="items.length" class="attachment-draft-list" :aria-label="t('message.multiBody.attachmentList', '待发送附件')">
    <li
      v-for="item in items"
      :key="item.id"
      class="attachment-draft-list__item"
      :class="{ 'attachment-draft-list__item--file': item.type === MESSAGE_TYPE.FILE }"
    >
      <img
        v-if="item.type === MESSAGE_TYPE.IMAGE"
        class="attachment-draft-list__media"
        :src="item.previewUrl"
        :alt="item.file.name"
      >
      <video
        v-else-if="item.type === MESSAGE_TYPE.VIDEO"
        class="attachment-draft-list__media"
        :src="item.previewUrl"
        :aria-label="item.file.name"
        preload="metadata"
        muted
        playsinline
      />
      <div v-else class="attachment-draft-list__file">
        <span
          class="attachment-draft-list__file-icon"
          :style="{ backgroundColor: `var(--uikit-file-icon-${resolveFileType(item.file.name).key})` }"
        >
          <Icon :name="resolveFileType(item.file.name).icon" :size="20" />
        </span>
        <span class="attachment-draft-list__file-info">
          <span class="attachment-draft-list__filename" :title="item.file.name">{{ item.file.name }}</span>
          <span class="attachment-draft-list__filesize">{{ formatFileSize(item.file.size) }}</span>
        </span>
      </div>
      <button
        type="button"
        class="attachment-draft-list__remove"
        :disabled="disabled"
        :aria-label="`${t('message.multiBody.remove', '删除')} ${item.file.name}`"
        @click.stop="emit('remove', item.id)"
      >
        <Icon name="circle/xmark" :size="16" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.attachment-draft-list {
  display: flex;
  flex: 0 0 80px;
  align-items: center;
  gap: var(--uikit-spacing-2, 8px);
  min-width: 0;
  margin: 0;
  padding: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  list-style: none;
}

.attachment-draft-list__item {
  position: relative;
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-secondary);
}

.attachment-draft-list__item--file {
  flex-basis: 180px;
  width: 180px;
  height: 40px;
}

.attachment-draft-list__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-draft-list__file {
  display: flex;
  align-items: center;
  gap: var(--uikit-spacing-2, 8px);
  height: 100%;
  padding: 6px 32px 6px 6px;
  box-sizing: border-box;
  color: var(--uikit-text-secondary);
}

.attachment-draft-list__file-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-file-icon-file);
  color: var(--uikit-text-inverse, #FFFFFF);
}

.attachment-draft-list__file-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.attachment-draft-list__filename {
  width: 100%;
  overflow: hidden;
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-12);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-draft-list__filesize {
  font-size: var(--uikit-font-size-11);
}

.attachment-draft-list__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--uikit-components-radius, 6px);
  background: var(--uikit-bg-elevated);
  color: var(--uikit-text-secondary);
  cursor: pointer;
}

.attachment-draft-list__item--file .attachment-draft-list__remove {
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
}

.attachment-draft-list__remove:focus-visible {
  outline: 2px solid var(--uikit-primary-color);
  outline-offset: 1px;
}

.attachment-draft-list__remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
