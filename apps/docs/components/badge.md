# Badge 徽标

图标或文字右上角的数字/圆点徽标，用于未读数、消息提醒等场景。

## 使用方式

组件以 `EmBadge` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-badge :count="5">
    <em-avatar name="A" />
  </em-badge>
</template>
```

## 数字徽标

<demo src="./demo/count.vue" title="数字徽标" desc="通过 count 展示数字；max 控制显示上限（超出显示 99+）；dot 显示为纯圆点。" />

## 自定义颜色

<demo src="./demo/colors.vue" title="自定义颜色" desc="通过 color 属性设置徽标颜色，支持任意 CSS 颜色值。" />

## API

<!-- @include: ../.vitepress/gen/badge.md -->
