<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar, useLocale, useUserInfo } from '@easemob/uikit'
import type { CustomMessageBody, UiMessage } from '@easemob/uikit'

export interface DemoCardMessageProps {
  message: UiMessage
}

export interface DemoCardMessageEmits {
  (e: 'card-click', userId: string): void
}

const props = defineProps<DemoCardMessageProps>()
const emit = defineEmits<DemoCardMessageEmits>()

const { t } = useLocale()

const body = computed(() => props.message.body as CustomMessageBody)
const uid = computed(() => body.value.params?.uid || '')
const paramsNickname = computed(() => body.value.params?.nickname)
const paramsAvatar = computed(() => body.value.params?.avatar)

const { displayName, avatarUrl } = useUserInfo(uid)

const cardName = computed(() => displayName.value || paramsNickname.value || uid.value)
const cardAvatar = computed(() => avatarUrl.value || paramsAvatar.value)

function onClick() {
  if (uid.value)
    emit('card-click', uid.value)
}
</script>

<template>
  <div
    class="demo-card-message"
    :class="{ 'demo-card-message--self': props.message.isSelf }"
    @click="onClick"
  >
    <div class="demo-card-message__bubble">
      <div class="demo-card-message__main">
        <EmAvatar :src="cardAvatar" :name="cardName" :size="40" />
        <span class="demo-card-message__name">{{ cardName }}</span>
      </div>
      <div class="demo-card-message__footer">
        {{ t('message.card') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-card-message {
  display: flex;
  max-width: 100%;
}

.demo-card-message--self {
  justify-content: flex-end;
}

.demo-card-message__bubble {
  display: flex;
  flex-direction: column;
  width: 220px;
  max-width: 220px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  overflow: hidden;
}

.demo-card-message__bubble:hover {
  background-color: var(--uikit-bg-hover);
}

.demo-card-message__main {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.demo-card-message__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-card-message__footer {
  padding: 6px 14px;
  border-top: 1px solid var(--uikit-border-color);
  font-size: 12px;
  color: var(--uikit-text-secondary);
}
</style>
