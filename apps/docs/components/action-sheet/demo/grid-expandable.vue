<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)

const zonedActions = [
  { name: '引用', icon: 'arrow/turn_left', zone: 'grid' as const },
  { name: '复制', icon: 'rects', zone: 'grid' as const },
  { name: '转发', icon: 'lines/arrow-right_3bars', zone: 'grid' as const },
  { name: '多选', icon: 'items_check' },
  { name: '翻译', icon: 'rect/hanzinalpha' },
  { name: '置顶', icon: 'pin' },
  { name: '撤回', icon: 'arrow/lft_uturn' },
  { name: '编辑', icon: 'rect/pencil' },
  { name: '转文字', icon: 'rect/hanzi' },
  { name: '收藏', icon: 'star' },
  { name: '提醒', icon: 'bell' },
  { name: '删除', icon: 'trash', color: 'var(--uikit-danger-color)' },
]
</script>

<template>
  <div style="display: flex; justify-content: center">
    <em-button @click="show = true">
      打开网格分区面板
    </em-button>
    <em-action-sheet v-model:show="show" :actions="zonedActions" expandable />
  </div>
</template>
