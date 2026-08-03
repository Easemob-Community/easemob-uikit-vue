<script setup lang="ts">
import { ref } from 'vue'

const clicked = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    "
  >
    <div style="display: flex; gap: 16px; align-items: center;">
      <em-avatar name="Online" presence="online" />
      <em-avatar name="Away" presence="away" />
      <em-avatar name="Busy" presence="busy" />
      <em-avatar name="Offline" presence="offline" />
      <em-avatar name="Custom" presence="custom" />
    </div>
    <div style="display: flex; gap: 16px; align-items: center;">
      <em-avatar name="S" :size="24" presence="online" />
      <em-avatar name="M" :size="40" presence="online" />
      <em-avatar name="L" :size="60" presence="online" />
      <em-avatar name="CustomDot" :size="40" presence="online" :presence-size="16" />
    </div>
    <em-avatar
      name="Me"
      presence="online"
      editable
      @presence-click="clicked = true"
    />
    <div v-if="clicked" style="font-size: 12px; color: #6b7280;">
      已触发 presence-click 事件
    </div>
  </div>
</template>
