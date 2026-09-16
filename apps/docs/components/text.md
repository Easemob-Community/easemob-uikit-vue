# Text 排版文本

排版文本组件，内置对齐设计稿的 10 档排版层级（字号 + 行高 + 默认字重配对），并提供语义颜色、字重覆盖与单行截断能力，保证全站文字风格一致。

## 使用方式

组件以 `EmText` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-text level="h2">
    会话标题
  </em-text>
</template>
```

## 排版层级

<demo src="./demo/levels.vue" title="排版层级" desc="通过 level 属性切换 h0 / h1 / h2 / h3 / body-lg / body（默认）/ body-sm / caption / small / mini 十档层级，每档内置字号与行高配对及默认字重。" />

## 文本颜色

<demo src="./demo/colors.vue" title="文本颜色" desc="通过 color 属性切换语义颜色：primary（默认）/ secondary / tertiary / inverse，对应 --uikit-text-* 语义 token，自动跟随主题与暗色模式。" />

## 字重覆盖

<demo src="./demo/weights.vue" title="字重覆盖" desc="通过 weight 属性覆盖当前层级的默认字重：regular / medium / semibold / bold，对应 --uikit-font-weight-* token。" />

## 单行截断

<demo src="./demo/ellipsis.vue" title="单行截断" desc="开启 ellipsis 后单行省略超长文本（overflow + text-overflow: ellipsis），此时组件以块级渲染，宽度由父容器决定。" />

## API

<!-- @include: ../.vitepress/gen/text.md -->
