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

## 在线代码演练场

直接编辑下面的代码（`EmCell` 的 title / meta / 箭头 / 边框 / 尺寸 / 状态），右侧预览随代码编译即时更新，点「重置代码」恢复初始模板：

<VuePlayground :files="cellPlaygroundFiles" title="Cell 配置在线演练场" id="cell" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 列表项主文案用 `title`，辅助信息用 `meta` | 在 title 里塞入两行以上内容 |
| 导航入口设置 `show-arrow` 提示可点击 | 所有 Cell 都默认带箭头 |
| 头像、图标放在 `leading` 插槽，操作放在 `trailing` | 在 title 区手写 flex 布局塞图标 |
| 相关设置项用分组标题 + 边框分隔 | 一个长列表无任何分组 |
| 禁用项使用 `disabled` 并配合说明 | 禁用项不给出任何原因 |

## API

<!-- @include: ../.vitepress/gen/cell.md -->

<script setup>
import { cellPlaygroundFiles } from './cell/demo/playground/template'
</script>
