<script setup lang="ts">
import { ref } from 'vue'

const logs = ref<string[]>([])
const submitting = ref(false)

function logClick(event: MouseEvent) {
  logs.value.unshift(`click at (${event.clientX}, ${event.clientY})`)
}

function simulateSubmit() {
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    logs.value.unshift('提交完成（loading 结束）')
  }, 1500)
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
    <div style="display: flex; gap: 12px; align-items: center;">
      <em-button @click="logClick">
        点击我
      </em-button>
      <em-button type="primary" :loading="submitting" @click="simulateSubmit">
        {{ submitting ? '提交中...' : '模拟提交' }}
      </em-button>
    </div>
    <div style="font-size: 12px; color: #6b7280; width: 100%;">
      事件：
      <ul style="margin: 4px 0; padding-left: 16px;">
        <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
          {{ logItem }}
        </li>
      </ul>
    </div>
  </div>
</template>
