# Skeleton 骨架屏

在内容加载完成前展示占位图形，减少用户等待焦虑，支持头像、文字行、段落与卡片等常见变体。

## 使用方式

```vue
<template>
  <em-skeleton variant="paragraph" :rows="4" />
</template>
```

## 变体

<demo src="./demo/skeleton-variants.vue" title="变体" desc="avatar / text / paragraph / card 四种占位形态。" />

## 动画

默认开启闪烁动画，可通过 `animated` 关闭；自动尊重 `prefers-reduced-motion` 媒体查询。

## API

<!-- @include: ../.vitepress/gen/skeleton.md -->
