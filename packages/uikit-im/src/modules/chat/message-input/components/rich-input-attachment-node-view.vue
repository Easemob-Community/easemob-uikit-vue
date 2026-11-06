<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { MESSAGE_TYPE, EmIcon as Icon, useLocale } from '@easemob-community/uikit-core'
import { resolveFileType } from '../../file-type'

const props = defineProps<NodeViewProps>()
const { t } = useLocale()

const fileName = computed(() => String(props.node.attrs.fileName || ''))
const fileSize = computed(() => Number(props.node.attrs.fileSize) || 0)
const fileType = computed(() => resolveFileType(
  fileName.value,
  props.node.attrs.attachmentType === MESSAGE_TYPE.VIDEO ? 'video' : 'file',
))

function formatFileSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function onRemove() {
  if (props.extension.options.isSending())
    return
  props.deleteNode()
}
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="rich-input__attachment"
    :data-attachment-id="node.attrs.attachmentId"
    contenteditable="false"
  >
    <span class="rich-input__attachment-main">
      <span class="rich-input__attachment-name" :title="fileName">{{ fileName }}</span>
      <span class="rich-input__attachment-size">{{ formatFileSize(fileSize) }}</span>
    </span>
    <span
      class="rich-input__attachment-icon"
      :style="{ backgroundColor: `var(--uikit-file-icon-${fileType.key})` }"
    >
      <Icon :name="fileType.icon" :size="22" />
    </span>
    <button
      type="button"
      class="rich-input__attachment-remove"
      :aria-label="`${t('message.multiBody.remove', '删除')} ${fileName}`"
      @mousedown.prevent.stop
      @click.prevent.stop="onRemove"
    >
      <Icon name="circle/xmark" :size="14" />
    </button>
  </NodeViewWrapper>
</template>

<style scoped>
.rich-input__attachment {
  display: inline-flex;
  align-items: center;
  gap: var(--uikit-spacing-2, 8px);
  box-sizing: border-box;
  width: 240px;
  max-width: 100%;
  min-height: 56px;
  margin: 2px 4px;
  padding: 8px 10px;
  vertical-align: middle;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-secondary);
  line-height: 1.35;
}

.rich-input__attachment.ProseMirror-selectednode {
  outline: 2px solid var(--uikit-primary-color);
  outline-offset: 1px;
}

.rich-input__attachment-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rich-input__attachment-name {
  display: -webkit-box;
  overflow: hidden;
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-13);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rich-input__attachment-size {
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-11);
}

.rich-input__attachment-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-file-icon-file);
  color: var(--uikit-text-inverse, #FFFFFF);
}

.rich-input__attachment-remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--uikit-components-radius, 6px);
  background: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
}

.rich-input__attachment-remove:hover {
  background: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
}

.rich-input__attachment-remove:focus-visible {
  outline: 2px solid var(--uikit-primary-color);
  outline-offset: 1px;
}

:global(.rich-input--sending) .rich-input__attachment-remove {
  pointer-events: none;
  opacity: 0.5;
}
</style>
