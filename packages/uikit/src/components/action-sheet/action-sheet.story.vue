<script setup lang="ts">
import { ref } from 'vue'
import ActionSheet from './action-sheet.vue'
import Button from '../button/button.vue'

const show1 = ref(false)
const show2 = ref(false)
const show3 = ref(false)

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
  </Story>
</template>
