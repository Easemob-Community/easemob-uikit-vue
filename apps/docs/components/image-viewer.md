# ImageViewer 图片预览

全屏图片预览浮层，支持多图相册、加载中状态、缩放/平移/旋转、工具栏操作与下载，适用于聊天图片、附件、头像等大图查看场景。

## 使用方式

组件以 `EmImageViewer` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const index = ref(0)
const srcs = [
  'https://example.com/image-1.jpg',
  'https://example.com/image-2.jpg',
]
</script>

<template>
  <em-image-viewer v-model:show="show" v-model:index="index" :srcs="srcs" />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="单图与多图预览" desc="点击按钮打开预览；单图场景隐藏左右切换箭头与索引指示，多图场景支持箭头、索引指示与键盘 ←/→ 切换。" />

## API

<!-- @include: ../.vitepress/gen/image-viewer.md -->

## 说明

- `show` 与 `index` 均为受控状态，支持 `v-model`；打开、关闭与切图时自动重置缩放、旋转与平移
- 交互能力：双击在 1x / 2x 间切换；滚轮与双指捏合缩放（1~5 倍）；放大后可拖拽平移；工具栏支持 90° 旋转、适应屏幕复位与下载
- 「适应屏幕」按钮在视图已处于初始态（未缩放 / 未偏移 / 未旋转）时禁用，hover 提示「已在适应屏幕状态」；缩放或旋转后自动变为可用，点击一键复位
- 键盘操作：`ESC` 关闭预览；`←` / `→` 仅当 `show-navigator` 为 `true` 时切换图片
- 点击遮罩默认关闭，可通过 `close-on-click-overlay` 关闭该行为
- `#footer` 插槽作用域提供 `index` / `loading` / `error`，业务侧可放置自定义操作（如图片消息的大图 / 原图切换按钮），默认渲染多图索引指示器
- `download` 事件在组件内部执行下载后触发，供业务感知；文件名从图片 URL 自动提取
- 图片加载失败时展示失败占位并触发 `load-error` 事件，业务侧可据此做降级切换（如切回低清图）
