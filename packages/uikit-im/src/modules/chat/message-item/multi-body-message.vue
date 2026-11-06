<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { INJECTION_KEY, useThemeStore } from '@easemob-community/uikit-core'
import type { LocationMessageBody, MultiBodySegment, UiMessage } from '@easemob-community/uikit-core'
import type { BubbleShape } from '../types'
import { segmentMessageComponentMap } from './segment-component-map'
import { toSegmentUiMessage } from './multi-body-message.utils'

export interface MultiBodyMessageProps {
  message: UiMessage
}

export interface MultiBodyMessageEmits {
  (e: 'mention-click', userId: string): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
}

const props = defineProps<MultiBodyMessageProps>()
const emit = defineEmits<MultiBodyMessageEmits>()

const themeStore = useThemeStore()
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'multi-body-message__bubble--square'
    : '',
)

const segments = computed<MultiBodySegment[]>(() =>
  Array.isArray(props.message.body) ? props.message.body : [],
)

function onLocationClick(body: LocationMessageBody) {
  emit('location-click', body, props.message)
}
</script>

<template>
  <div class="multi-body-message" :class="{ 'multi-body-message--self': message.isSelf }">
    <div class="multi-body-message__bubble" :class="bubbleClass">
      <div
        v-for="(segment, index) in segments"
        :key="`${message.msgServerId || message.msgLocalId}:${index}`"
        class="multi-body-message__segment"
        :class="`multi-body-message__segment--${segment.type}`"
      >
        <component
          :is="segmentMessageComponentMap[segment.type]"
          :message="toSegmentUiMessage(message, segment, index)"
          @mention-click="emit('mention-click', $event)"
          @location-click="onLocationClick"
          @custom-message-action="(action: string, payload: any) => emit('custom-message-action', action, payload, message)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-body-message {
  display: flex;
  max-width: 100%;
  min-width: 0;
}

.multi-body-message--self {
  margin-left: auto;
  justify-content: flex-end;
}

.multi-body-message__bubble {
  display: flex;
  flex-direction: column;
  gap: var(--uikit-spacing-2, 8px);
  max-width: 100%;
  min-width: 0;
  padding: var(--uikit-spacing-2, 8px) var(--uikit-spacing-3, 12px);
  border-radius: var(--uikit-bubble-radius, 16px);
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  box-sizing: border-box;
}

.multi-body-message__bubble--square {
  border-radius: var(--uikit-bubble-radius-square, 8px);
}

.multi-body-message--self .multi-body-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

.multi-body-message__segment {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}

.multi-body-message__segment :deep(.text-message__bubble),
.multi-body-message__segment :deep(.file-message__bubble),
.multi-body-message__segment :deep(.voice-message__bubble),
.multi-body-message__segment :deep(.location-message__bubble),
.multi-body-message__segment :deep(.custom-message__bubble) {
  padding: 0;
  border-radius: 0;
  background-color: transparent;
  color: inherit;
}

.multi-body-message__segment :deep(.text-message),
.multi-body-message__segment :deep(.custom-message) {
  align-items: stretch;
  max-width: 100%;
}

.multi-body-message__segment :deep(.text-message__content) {
  white-space: pre-wrap;
}

.multi-body-message__segment :deep(.file-message__bubble) {
  max-width: 100%;
}

.multi-body-message__segment :deep(.voice-message__unread-dot) {
  display: none;
}

.multi-body-message__segment :deep(.image-message),
.multi-body-message__segment :deep(.video-message) {
  max-width: 100%;
  min-width: 0;
}

.multi-body-message__segment :deep(.image-message__container),
.multi-body-message__segment :deep(.video-message__container) {
  max-width: 100%;
  height: auto !important;
}

.multi-body-message__segment :deep(.image-message__container),
.multi-body-message__segment :deep(.image-message__img),
.multi-body-message__segment :deep(.image-message__sending),
.multi-body-message__segment :deep(.video-message__container),
.multi-body-message__segment :deep(.video-message__video) {
  border-radius: calc(var(--uikit-bubble-radius, 16px) / 2);
}

.multi-body-message__bubble--square .multi-body-message__segment :deep(.image-message__container),
.multi-body-message__bubble--square .multi-body-message__segment :deep(.image-message__img),
.multi-body-message__bubble--square .multi-body-message__segment :deep(.image-message__sending),
.multi-body-message__bubble--square .multi-body-message__segment :deep(.video-message__container),
.multi-body-message__bubble--square .multi-body-message__segment :deep(.video-message__video) {
  border-radius: calc(var(--uikit-bubble-radius-square, 8px) / 2);
}
</style>
