# GroupCard 群组卡片

展示群组信息的卡片组件，支持操作按钮、信息行与自定义插槽，适用于群列表、群详情等场景。

## 使用方式

组件以 `EmGroupCard` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-group-card group-id="group_001" name="前端技术交流群" avatar="https://..." />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="传入 group-id / name / avatar 即可渲染群组卡片。" />

## 操作与信息行

<demo src="./demo/actions.vue" title="操作与信息行" desc="actions 配置底部操作按钮；info-rows 配置群成员数、群主、群简介等信息行，action-click 回传按钮 key。" />

## 插槽自定义

<demo src="./demo/slots.vue" title="插槽自定义" desc="name 插槽自定义群名称展示；默认插槽插入自定义内容。" />

## API

<!-- @include: ../.vitepress/gen/group-card.md -->
