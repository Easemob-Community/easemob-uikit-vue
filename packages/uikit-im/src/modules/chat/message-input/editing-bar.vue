<script setup lang="ts">
import { computed } from 'vue'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmIconButton as IconButton } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { MESSAGE_TYPE } from '@easemob/uikit-core'
import type { TextMessageBody, UiMessage } from '@easemob/uikit-core'

export interface EditingBarProps {
  message: UiMessage
}

export interface EditingBarEmits {
  (e: 'close'): void
}

const props = defineProps<EditingBarProps>()
const emit = defineEmits<EditingBarEmits>()
const { t } = useLocale()

/** 编辑中预览文本（取原文本） */
const preview = computed(() => {
  if (props.message.type === MESSAGE_TYPE.TEXT) {
    return (props.message.body as TextMessageBody).content || ''
  }
  return ''
})

function onClose() {
  emit('close')
}
</script>

<template>
  <div class="editing-bar">
    <Icon class="editing-bar__icon" name="chat/modifyMsg" :size="14" />
    <div class="editing-bar__text">
      <span class="editing-bar__title">{{ t('message.editing') }}</span>
      <span class="editing-bar__preview">{{ preview }}</span>
    </div>
    <IconButton
      class="editing-bar__close"
      icon="actions/close"
      size="small"
      variant="ghost"
      :title="t('message.editing.cancel')"
      @click.stop="onClose"
    />
  </div>
</template>

<style scoped>
.editing-bar {
  display: flex;
  align-items: center;
  gap: calc(var(--uikit-container-gap, 8px) * 0.75);
  padding: calc(var(--uikit-container-gap, 8px) * 0.75) 12px;
  margin: 0 12px 4px;
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-bg-base);
  border: 1px solid var(--uikit-primary-color, #5f6df3);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
  line-height: 1.4;
  min-height: 32px;
}

.editing-bar__icon {
  flex-shrink: 0;
  color: var(--uikit-primary-color, #5f6df3);
}

.editing-bar__text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: calc(var(--uikit-container-gap, 8px) * 0.75);
  overflow: hidden;
}

.editing-bar__title {
  flex-shrink: 0;
  color: var(--uikit-primary-color, #5f6df3);
  font-weight: 500;
}

.editing-bar__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editing-bar__close {
  flex-shrink: 0;
}
</style>
