<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useLocale } from '../../locale'
import Input from '../../components/input/input.vue'
import Button from '../../components/button/button.vue'

const { sendMessage } = useChat()
const { t } = useLocale()
const text = ref('')

function handleSubmit() {
  if (!text.value.trim()) return
  sendMessage({ msg: text.value }, 'text')
  text.value = ''
}
</script>

<template>
  <div class="message-input">
    <Input
      v-model="text"
      :placeholder="t('chat.placeholder')"
      class="message-input__field"
      @submit="handleSubmit"
    />
    <Button type="primary" size="small" @click="handleSubmit">{{ t('chat.send') }}</Button>
  </div>
</template>

<style scoped>
.message-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--uikit-bg-secondary);
}

.message-input__field {
  flex: 1;
}
</style>
