<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)

const colorActions = [
  { name: '删除', color: '#ef4444' },
  { name: '编辑', color: '#3b82f6' },
  { name: '分享' },
]
</script>

<template>
  <div
    style="
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    "
  >
    <em-button type="danger" @click="show = true">
      自定义颜色与文案
    </em-button>
    <em-action-sheet
      v-model:show="show"
      title="请选择操作"
      :actions="colorActions"
      cancel-text="关闭"
    />
  </div>
</template>
