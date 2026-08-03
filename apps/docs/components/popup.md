# Popup 弹层

通用弹层组件，支持五种位置、锚点定位与分组互斥，是 ActionSheet / Modal 等组件的底层能力。

## 使用方式

组件以 `EmPopup` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
</script>

<template>
  <em-button @click="show = true">打开弹层</em-button>
  <em-popup v-model:show="show" position="bottom">
    弹层内容
  </em-popup>
</template>
```

## 弹出位置

<demo src="./demo/positions.vue" title="弹出位置" desc="position 支持 center / top / bottom / left / right 五种方位。" />

## 锚点定位

<demo src="./demo/anchor.vue" title="锚点定位" desc="通过 anchor + placement 挂载到指定元素附近，overlay 关闭遮罩后适合工具栏、下拉菜单等场景。" />

## 分组互斥

<demo src="./demo/group.vue" title="分组互斥" desc="同一 group 的 popup 同时只能打开一个，打开新的会自动关闭同组其他弹层。" />

## API

<!-- @include: ../.vitepress/gen/popup.md -->
