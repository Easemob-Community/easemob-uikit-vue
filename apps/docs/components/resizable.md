# Resizable 拖拽调整尺寸

包裹容器并暴露拖拽手柄的原子组件：鼠标移到容器右缘 / 下缘时光标变为拉扯提示，按住拖动即可调整宽度 / 高度，支持 `min` / `max` 限制与 `v-model` 受控。

## 使用方式

组件以 `EmResizable` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const width = ref(320)
</script>

<template>
  <em-resizable v-model="width" axis="horizontal" :min="240" :max="480">
    <!-- 任意内容 -->
  </em-resizable>
</template>
```

> 手柄默认不显示视觉分隔线，仅鼠标悬停时出现 `col-resize` / `row-resize` 光标提示；如需显示分隔线，可设置 `show-line`。

## 水平拖拽

<demo src="./demo/basic.vue" title="水平拖拽" desc="拖拽右缘手柄调整宽度，范围限制在 240~480px；拖拽结束触发 resize-end 事件，可用于持久化宽度。" />

## 垂直拖拽

<demo src="./demo/vertical.vue" title="垂直拖拽" desc="拖拽下缘手柄调整高度，范围限制在 80~240px；未使用 v-model 时内部以 initial 为初始尺寸。" />

## API

<!-- @include: ../.vitepress/gen/resizable.md -->
