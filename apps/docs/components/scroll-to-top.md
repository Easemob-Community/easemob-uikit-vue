# ScrollToTop 回到顶部

滚动容器内回到顶部的悬浮按钮组件。

## 使用方式

组件以 `EmScrollToTop` 为名导出，全局注册后可直接使用：

```vue
<template>
  <div style="overflow-y: auto; height: 400px;">
    <!-- 长列表内容 -->
    <em-scroll-to-top :visibility-height="200" />
  </div>
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="滚动超过 visibility-height 后显示按钮，点击平滑回到顶部。" />

## 自定义

<demo src="./demo/custom.vue" title="自定义" desc="自定义图标、尺寸、位置偏移与滚动时长（duration）。" />

## API

<!-- @include: ../.vitepress/gen/scroll-to-top.md -->
