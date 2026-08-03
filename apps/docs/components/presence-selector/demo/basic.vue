<script setup lang="ts">
import { ref } from 'vue'

const current = ref('')
const logs = ref<string[]>([])

function onSelect(status: 'online' | 'busy' | 'away' | 'custom', ext: string) {
  current.value = ext
  logs.value.unshift(`select: ${status} / ${ext}`)
}

function onCancel() {
  logs.value.unshift('cancel')
}
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    "
  >
    <em-presence-selector @select="onSelect" @cancel="onCancel" />
    <div style="font-size: 12px; color: #6b7280;">
      当前状态：{{ current || '(空/在线)' }}
    </div>
  </div>
</template>
