# Avatar 头像

用户头像展示组件，支持图片、文字占位、形状与在线状态指示器。

## 使用方式

组件以 `EmAvatar` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-avatar name="张三" :size="40" />
</template>
```

未提供图片 `src` 时，根据 `name` 渲染文字占位头像。

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="图片头像、文字占位、尺寸（24/40/60）与形状（circle/square）。" />

## 在线状态

<demo src="./demo/presence.vue" title="在线状态" desc="通过 presence 展示在线状态指示器；editable 模式下点击指示器可编辑状态。" />

## 在线代码演练场

直接编辑下面的代码（`EmAvatar` 的 shape / size / presence 与主题头像形状），右侧预览随代码编译即时更新，点「重置代码」恢复初始模板：

<VuePlayground :files="avatarPlaygroundFiles" title="Avatar 配置在线演练场" id="avatar" />

## API

<!-- @include: ../.vitepress/gen/avatar.md -->

<script setup>
import { avatarPlaygroundFiles } from './avatar/demo/playground/template'
</script>
