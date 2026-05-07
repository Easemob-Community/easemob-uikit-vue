<script setup lang="ts">
import type { Message } from '../../../store/message'

export interface ImageMessageProps {
  message: Message
}

const props = defineProps<ImageMessageProps>()
</script>

<template>
  <div class="image-message" :class="{ 'image-message--self': props.message.isSelf }">
    <img
      v-if="props.message.body.url"
      :src="props.message.body.url"
      class="image-message__img"
      alt="image"
    />
    <div v-else class="image-message__placeholder">[图片]</div>
  </div>
</template>

<style scoped>
.image-message {
  display: flex;
  max-width: 60%;
}

.image-message--self {
  justify-content: flex-end;
}

.image-message__img {
  max-width: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.image-message__placeholder {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
