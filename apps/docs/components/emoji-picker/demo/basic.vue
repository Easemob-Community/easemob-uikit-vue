<script setup lang="ts">
import { ref } from 'vue'

const show = ref(true)
const selected = ref('')

function onSelect(emoji: string) {
  selected.value = emoji
}
</script>

<template>
  <div style="width: 340px;">
    <div
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      "
    >
      <em-button size="small" @click="show = !show">
        {{ show ? '关闭' : '打开' }}表情
      </em-button>
      <span v-if="selected" style="font-size: 13px; color: var(--uikit-text-secondary);">
        已选择：{{ selected }}
      </span>
    </div>
    <em-emoji-picker v-model:show="show" @select="onSelect" />
  </div>
</template>
