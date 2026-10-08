# ActionSheet 操作菜单

从底部弹出的操作菜单组件，支持标题、自定义颜色与禁用项；高频操作可收拢为顶部图标网格区，并支持拖拽扩档（半屏 ↔ 近全屏）。

## 使用方式

组件以 `EmActionSheet` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const actions = [{ name: '选项一' }, { name: '选项二' }]
</script>

<template>
  <em-button @click="show = true">打开菜单</em-button>
  <em-action-sheet v-model:show="show" :actions="actions" />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="通过 actions 配置菜单项；disabled 项置灰不可点；title 显示菜单标题。" />

## 自定义

<demo src="./demo/custom.vue" title="自定义" desc="通过 color 为菜单项着色，cancel-text 自定义取消按钮文案。" />

## 高频网格分区与拖拽扩档

<demo src="./demo/grid-expandable.vue" title="网格分区 + 拖拽扩档" desc="菜单项设置 zone: 'grid' 收拢到顶部图标网格区（超出横向滚动）；开启 expandable 后出现 drag handle，半屏档（50dvh）与展开档（78dvh）间拖拽或轻点切换，展开后列表区纵向滚动。" />

## API

<!-- @include: ../.vitepress/gen/action-sheet.md -->
