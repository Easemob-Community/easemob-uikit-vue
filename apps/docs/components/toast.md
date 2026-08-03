# Toast 轻提示

轻量级消息提示组件，用于操作结果的即时反馈，支持四种语义类型。

## 使用方式

组件以 `EmToast` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const message = ref('')
</script>

<template>
  <em-button @click="message = '已发送'; show = true">发送</em-button>
  <em-toast :show="show" :message="message" />
</template>
```

## 消息类型

<demo src="./demo/types.vue" title="消息类型" desc="type 支持 info / success / error / warning 四种类型，自动匹配语义配色与图标。" />

## API

<!-- @include: ../.vitepress/gen/toast.md -->
