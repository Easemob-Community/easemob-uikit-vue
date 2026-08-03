<script setup lang="ts">
import { ref } from 'vue'

const current = ref('')

function onSelect(_status: 'online' | 'busy' | 'away' | 'custom', ext: string) {
  current.value = ext
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
    <em-presence-selector
      value="开会中"
      @select="onSelect"
    />
    <em-presence-selector
      :show-custom="false"
      @select="onSelect"
    />
    <div style="font-size: 12px; color: #6b7280;">
      当前状态：{{ current || '(空/在线)' }}
    </div>
  </div>
</template>
