# Modal 对话框

居中弹窗组件，用于需要用户确认的关键操作，支持自定义标题、按钮文案与插槽内容。

## 使用方式

组件以 `EmModal` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
</script>

<template>
  <em-button @click="show = true">打开对话框</em-button>
  <em-modal v-model:show="show" title="确认删除？">
    删除后数据将无法恢复，是否继续？
  </em-modal>
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="v-model:show 控制显隐；title 设置标题；show-cancel 控制是否显示取消按钮。" />

## 自定义

<demo src="./demo/custom.vue" title="自定义" desc="通过 cancel-text / confirm-text 自定义按钮文案，适配不同业务语境。" />

## API

<!-- @include: ../.vitepress/gen/modal.md -->
