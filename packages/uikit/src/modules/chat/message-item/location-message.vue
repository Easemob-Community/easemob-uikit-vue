<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import type { LocationMessageBody, UiMessage } from '../../../sdk/types'

export interface LocationMessageProps {
  message: UiMessage
}

export interface LocationMessageEmits {
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
}

const props = defineProps<LocationMessageProps>()
const emit = defineEmits<LocationMessageEmits>()

const { t } = useLocale()

const body = computed(() => props.message.body as LocationMessageBody)

/** 主文本：优先地址，其次建筑名 */
const addressText = computed(
  () => body.value.address || body.value.buildingName || t('message.location'),
)

/** 次文本：经纬度 */
const coordinateText = computed(() => {
  const { latitude, longitude } = body.value
  if (typeof latitude !== 'number' || typeof longitude !== 'number')
    return ''
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
})

function onClick() {
  emit('location-click', body.value, props.message)
}
</script>

<template>
  <div
    class="location-message"
    :class="{ 'location-message--self': props.message.isSelf }"
    @click="onClick"
  >
    <div class="location-message__bubble">
      <div class="location-message__icon">
        <Icon name="misc/map_pin" :size="28" />
      </div>
      <div class="location-message__info">
        <div class="location-message__address" :title="addressText">
          {{ addressText }}
        </div>
        <div v-if="coordinateText" class="location-message__coordinates">
          {{ coordinateText }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.location-message {
  display: flex;
  max-width: 100%;
}

.location-message--self {
  justify-content: flex-end;
}

.location-message__bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  width: 240px;
  max-width: 240px;
  box-sizing: border-box;
}

.location-message--self .location-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

@media (hover: hover) {
  .location-message__bubble:hover {
    background-color: var(--uikit-bg-hover);
  }
}


@media (hover: hover) {
  .location-message--self .location-message__bubble:hover {
    background-color: var(--uikit-bubble-bg-self);
    opacity: 0.9;
  }
}

.location-message__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-primary-color);
}

.location-message--self .location-message__icon {
  color: var(--uikit-bubble-text-self);
  opacity: 0.85;
}

.location-message__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.location-message__address {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.location-message__coordinates {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.location-message--self .location-message__coordinates {
  color: var(--uikit-bubble-text-self);
  opacity: 0.7;
}
</style>
