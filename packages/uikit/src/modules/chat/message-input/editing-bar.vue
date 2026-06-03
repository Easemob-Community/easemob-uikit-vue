<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import type { Message } from '../../../store/message'


export interface EditingBarProps {
  message: Message
}

export interface EditingBarEmits {
  (e: 'close'): void
}

const props = defineProps<EditingBarProps>()
const emit = defineEmits<EditingBarEmits>()
const { t } = useLocale()

/** 编辑中预览文本（取原文本） */
const preview = computed(() => {
  if (props.message.type === 'text') {
    return props.message.content || ''
  }
  return ''
})

function onClose() {
  emit('close')
}
</script>

<template>
  <div class="editing-bar">
    <Icon class="editing-bar__icon" name="actions/check_2" :size="14" />
    <div class="editing-bar__text">
      <span class="editing-bar__title">{{ t('message.editing') }}</span>
      <span class="editing-bar__preview">{{ preview }}</span>
    </div>
    <div
      class="editing-bar__close"
      :title="t('message.editing.cancel')"
      @click.stop="onClose"
    >
      <Icon name="actions/xmark_in_circle_fill" :size="16" />
    </div>
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
  font-size: 13px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition: color 0.15s;
}

.editing-bar__close:hover {
  color: var(--uikit-text-primary);
}
</style>
