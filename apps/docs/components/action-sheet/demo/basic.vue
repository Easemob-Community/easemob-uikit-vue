<script setup lang="ts">
import { ref } from 'vue'

const show1 = ref(false)
const show2 = ref(false)

const basicActions = [
  { name: '选项一' },
  { name: '选项二' },
  { name: '选项三' },
]

const disabledActions = [
  { name: '可用选项' },
  { name: '禁用选项', disabled: true },
  { name: '其他选项' },
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
    <em-button @click="show1 = true">
      打开 ActionSheet
    </em-button>
    <em-button @click="show2 = true">
      含禁用项
    </em-button>
    <em-action-sheet v-model:show="show1" :actions="basicActions" />
    <em-action-sheet v-model:show="show2" title="操作列表" :actions="disabledActions" />
  </div>
</template>
