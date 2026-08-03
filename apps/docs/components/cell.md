# Cell 单元格

列表单元格组件，常用于设置项、联系人列表、操作行等场景。

## 使用方式

组件以 `EmCell` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-cell title="黑名单" meta="12" show-arrow border />
</template>
```

## 基础导航

<demo src="./demo/nav.vue" title="基础导航" desc="title + meta + 箭头，适合设置项与导航入口。" />

## 头像列表项

<demo src="./demo/avatar-list.vue" title="头像列表项" desc="通过 leading / trailing 插槽组合头像、徽标等内容。" />

## 尺寸与状态

<demo src="./demo/states.vue" title="尺寸与状态" desc="compact / normal / large 三种尺寸；默认 / 激活 / 禁用三种状态。" />

## API

<!-- @include: ../.vitepress/gen/cell.md -->
