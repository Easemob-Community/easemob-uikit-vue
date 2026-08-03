# Input 输入框

文本输入框组件，支持搜索、密码、填充、幽灵、下划线等形态。

## 使用方式

组件以 `EmInput` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-input v-model="text" placeholder="请输入内容" />
</template>
```

## 形态

<demo src="./demo/variants.vue" title="形态" desc="默认 / search / filled / ghost / underline 五种形态，配合 prefix-icon 使用。" />

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="密码输入、禁用状态与 maxlength 字符限制。" />

## API

<!-- @include: ../.vitepress/gen/input.md -->
