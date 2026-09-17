<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { useLocale } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { INJECTION_KEY, useThemeStore } from '@easemob/uikit-core'
import type { CombineMessageBody, UiMessage } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'

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

const themeStore = useThemeStore()

/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'combine-message--square'
    : '',
)

const body = computed(() => props.message.body as CombineMessageBody)

const title = computed(() => body.value.title || t('message.forward.combineTitle', '聊天记录'))
const summary = computed(() => body.value.summary || '')

function handleClick() {
  emit('view', props.message)
}
</script>

<template>
  <div class="combine-message" :class="[{ 'combine-message--self': props.isSelf }, bubbleClass]" @click="handleClick">
    <!-- 标题 -->
    <div class="combine-message__header">
      <Icon name="folder" :size="16" class="combine-message__icon" />
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
  border-radius: var(--uikit-bubble-radius, 16px);
  background-color: var(--uikit-bubble-bg-other);
  cursor: pointer;
  min-width: 200px;
  max-width: 300px;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.combine-message--square {
  border-radius: var(--uikit-bubble-radius-square, 8px);
}

@media (hover: hover) {
  .combine-message:hover {
    background-color: var(--uikit-bg-tertiary, #f0f0f0);
  }
}

/* 己方合并消息：使用主题色背景 */
.combine-message--self {
  background-color: var(--uikit-bubble-bg-self);
}

.combine-message--self .combine-message__header,
.combine-message--self .combine-message__title,
.combine-message--self .combine-message__summary,
.combine-message--self .combine-message__icon {
  color: var(--uikit-bubble-text-self);
}

@media (hover: hover) {
  .combine-message--self:hover {
    background-color: var(--uikit-primary-hover, #4b57c7);
  }
}

.combine-message__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--uikit-font-size-14);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-bubble-text-other);
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
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  line-height: 1.5;
}

.combine-message--self .combine-message__summary {
  color: var(--uikit-bubble-text-self);
  opacity: 0.85;
}

.combine-message__summary p {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
