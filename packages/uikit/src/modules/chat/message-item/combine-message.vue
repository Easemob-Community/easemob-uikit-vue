<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../../locale'
import Icon from '../../../components/icon/icon.vue'
import type { CombineMessageBody, UiMessage } from '../../../sdk/types'

export interface CombineMessageProps {
  message: UiMessage
  /** 是否为己方发送的消息，用于区分主题色 */
  isSelf?: boolean
}

export interface CombineMessageEmits {
  (e: 'view', message: UiMessage): void
}

const props = withDefaults(defineProps<CombineMessageProps>(), {
  isSelf: false,
})
const emit = defineEmits<CombineMessageEmits>()
const { t } = useLocale()

const body = computed(() => props.message.body as CombineMessageBody)

const title = computed(() => body.value.title || t('message.forward.combineTitle') || '聊天记录')
const summary = computed(() => body.value.summary || '')

function handleClick() {
  emit('view', props.message)
}
</script>

<template>
  <div class="combine-message" :class="{ 'combine-message--self': props.isSelf }" @click="handleClick">
    <!-- 标题 -->
    <div class="combine-message__header">
      <Icon name="files-media/folder" :size="16" class="combine-message__icon" />
      <span class="combine-message__title">{{ title }}</span>
    </div>

    <!-- 摘要 -->
    <div v-if="summary" class="combine-message__summary">
      <p v-for="(line, idx) in summary.split('\n')" :key="idx">
        {{ line }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.combine-message {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary);
  cursor: pointer;
  min-width: 200px;
  max-width: 300px;
  transition: background-color 0.15s;
}

.combine-message:hover {
  background-color: var(--uikit-bg-tertiary, #f0f0f0);
}

/* 己方合并消息：使用主题色背景 */
.combine-message--self {
  background-color: var(--uikit-primary-color, #5f6df3);
}

.combine-message--self .combine-message__header,
.combine-message--self .combine-message__title,
.combine-message--self .combine-message__summary,
.combine-message--self .combine-message__icon {
  color: #fff;
}

.combine-message--self:hover {
  background-color: var(--uikit-primary-hover, #4b57c7);
}

.combine-message__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.combine-message__icon {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.combine-message__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combine-message__summary {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  line-height: 1.5;
}

.combine-message__summary p {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
