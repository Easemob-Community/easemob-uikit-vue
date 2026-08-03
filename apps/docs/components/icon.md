# Icon 图标

基于 Lucide 图标库的 SVG 图标组件，支持任意 Lucide 图标路径插槽。

## 使用方式

组件以 `EmIcon` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-icon name="check">
    <path d="..." />
  </em-icon>
</template>
```

`name` 为图标的唯一标识（用于注册与索引），图标形状通过默认插槽传入 SVG 路径。

## 尺寸

<demo src="./demo/sizes.vue" title="尺寸" desc="通过 size 属性控制图标大小，单位 px。" />

## 颜色

<demo src="./demo/colors.vue" title="颜色" desc="通过 color 属性设置图标颜色，支持任意 CSS 颜色值。" />

## API

<!-- @include: ../.vitepress/gen/icon.md -->
