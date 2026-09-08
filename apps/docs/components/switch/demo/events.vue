<script setup lang="ts">
import { ref } from 'vue'

const enabled = ref(false)
const lastChange = ref('')
</script>

<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-switch v-model="enabled" @change="lastChange = `change: ${$event}`" />
    <span style="color: var(--uikit-text-secondary); font-size: 13px">
      {{ lastChange || '点击开关触发 change 事件' }}
    </span>
  </div>
</template>
