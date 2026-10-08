<script setup lang="ts">
import { ref } from 'vue'
import ActionSheet from './action-sheet.vue'
import type { ActionSheetItem } from './action-sheet.vue'
import Button from '../button/button.vue'

const show1 = ref(false)
const show2 = ref(false)
const show3 = ref(false)
const show4 = ref(false)

const basicActions = [
  { name: '选项一' },
  { name: '选项二' },
  { name: '选项三' },
]

const colorActions = [
  { name: '删除', color: '#ef4444' },
  { name: '编辑', color: '#3b82f6' },
  { name: '分享' },
]

const disabledActions = [
  { name: '可用选项' },
  { name: '禁用选项', disabled: true },
  { name: '其他选项' },
]

/** 高频网格 + 低频列表 + 可扩档（对齐飞书长按消息面板形态） */
const zonedActions: ActionSheetItem[] = [
  { name: '引用', icon: 'arrow/turn_left', zone: 'grid' },
  { name: '复制', icon: 'rects', zone: 'grid' },
  { name: '转发', icon: 'lines/arrow-right_3bars', zone: 'grid' },
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
  <Story title="ActionSheet">
    <Variant title="Basic">
      <Button @click="show1 = true">打开 ActionSheet</Button>
      <ActionSheet v-model:show="show1" :actions="basicActions" />
    </Variant>
    <Variant title="With Title">
      <Button @click="show2 = true">带标题</Button>
      <ActionSheet v-model:show="show2" title="请选择操作" :actions="basicActions" />
    </Variant>
    <Variant title="Custom Colors">
      <Button type="danger" @click="show3 = true">自定义颜色</Button>
      <ActionSheet v-model:show="show3" :actions="colorActions" cancel-text="关闭" />
    </Variant>
    <Variant title="Disabled Item">
      <Button @click="show1 = true">含禁用项</Button>
      <ActionSheet v-model:show="show1" title="操作列表" :actions="disabledActions" />
    </Variant>
    <Variant title="Grid Zone + Expandable">
      <Button @click="show4 = true">高频网格 + 拖拽扩档</Button>
      <ActionSheet v-model:show="show4" :actions="zonedActions" expandable />
    </Variant>
  </Story>
</template>
