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

## API

<!-- @include: ../.vitepress/gen/icon-button.md -->
