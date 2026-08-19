# IconButton 图标按钮

纯图标按钮组件，支持三种变体、五种语义类型与禁用状态。

## 使用方式

组件以 `EmIconButton` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-icon-button icon="actions/plus" variant="solid" />
</template>
```

## 变体与类型

<demo src="./demo/variants.vue" title="变体与类型" desc="solid / outline / ghost 三种变体；default / primary / success / warning / danger 五种类型。" />

## 尺寸与禁用

<demo src="./demo/sizes.vue" title="尺寸与禁用" desc="small / medium 尺寸；icon-size 自定义图标大小；disabled 禁用状态。" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 用于工具栏、标题栏等空间受限的场景 | 用 IconButton 替代带文案的主操作 |
| 为图标按钮提供 `aria-label` 或相邻文字说明 | 仅展示图标，无任何可访问标签 |
|  destructive 操作使用 `type="danger"` | 用默认色表达删除等危险语义 |
| 在列表右侧放置一组相关操作（最多 2 个） | 同一行塞入超过 3 个图标按钮 |
| H5 场景下利用组件自带的热区扩展 | 为扩大点击区域而 hack 外层 padding |

## API

<!-- @include: ../.vitepress/gen/icon-button.md -->
