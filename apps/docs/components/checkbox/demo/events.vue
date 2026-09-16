<script setup lang="ts">
import { reactive } from 'vue'

const items = reactive([
  { name: '已读回执', checked: true },
  { name: '消息免打扰', checked: false },
  { name: '置顶会话', checked: false },
])
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 280px;
      margin: 0 auto;
    "
  >
    <div
      v-for="item in items"
      :key="item.name"
      style="
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
      "
      :style="{ background: item.checked ? 'var(--uikit-primary-soft)' : 'transparent' }"
      @click="item.checked = !item.checked"
    >
      <em-checkbox :checked="item.checked" />
      <span style="font-size: 14px">{{ item.name }}</span>
    </div>
  </div>
</template>
