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

## 在线代码演练场

直接编辑下面的代码（`EmInput` 的形态 / placeholder / type / disabled / maxlength / clearable），右侧预览随代码编译即时更新，点「重置代码」恢复初始模板：

<VuePlayground :files="inputPlaygroundFiles" title="输入框配置在线演练场" id="input" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 表单校验失败时设置 `error` 并给出 `error-message` | 仅依赖边框变红，不说明错误原因 |
| 只读信息使用 `readonly`，禁用操作使用 `disabled` | 用 disabled 展示需要复制的信息 |
| 搜索框使用 `variant="search"` 并配合 `prefix-icon` | 在普通输入框内手动塞搜索图标 |
| 密码、手机号等敏感输入设置正确的 `type` | 所有输入都用 `type="text"` |
| 占位文案说明输入预期，如「请输入群名称」 | 占位文案与 label 完全重复 |

## API

<!-- @include: ../.vitepress/gen/input.md -->

<script setup>
import { inputPlaygroundFiles } from './input/demo/playground/template'
</script>
