# Checkbox 复选框

复选框选中指示器，仅渲染选中 / 未选中 / 禁用三种视觉状态，不自带点击逻辑——点击交互由父级行或容器统一控制（原生事件监听会透传到根元素，需要独立点击时直接挂载即可）。

## 使用方式

组件以 `EmCheckbox` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const checked = ref(false)
</script>

<template>
  <em-checkbox :checked="checked" @click="checked = !checked" />
</template>
```

## 选中状态

<demo src="./demo/states.vue" title="选中状态" desc="checked 控制选中态（勾选 / 空心圆），disabled 仅视觉半透明弱化，选中与未选中两种取值均有对应的禁用样式。" />

## 点击交互

<demo src="./demo/events.vue" title="父级控制点击" desc="组件本身不处理点击：典型用法是整行可点，行点击时切换 checked，演示多选列表场景。" />

## API

<!-- @include: ../.vitepress/gen/checkbox.md -->
