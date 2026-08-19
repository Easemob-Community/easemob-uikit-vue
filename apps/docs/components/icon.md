# Icon 图标

基于本地 SVG 图标资源的图标组件，支持通过 `name` 引用内置图标或使用默认插槽传入自定义 SVG 路径。

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

`color` 属性对描边图标（`stroke="currentColor"`）与填充图标（`fill="currentColor"`）均生效，无需针对 filled 图标额外使用 `:style` 传色。

## 动画

<demo src="./demo/animations.vue" title="动画" desc="通过 anim 属性启用内置动画：spin 旋转 / pulse 脉冲 / shake 摇摆 / flash 闪烁；时长与曲线跟随主题动画 token，全局动画开关与 prefers-reduced-motion 自动生效。" />

## API

<!-- @include: ../.vitepress/gen/icon.md -->
