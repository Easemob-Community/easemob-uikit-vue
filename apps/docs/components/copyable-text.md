# CopyableText 可复制文本

可复制文本组件，展示一段文本并提供一键复制入口：点击复制图标将文本写入剪贴板并弹出成功提示；非安全域（http）下自动降级为 `execCommand` 方案。

## 使用方式

组件以 `EmCopyableText` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-copyable-text label="ID:" text="easemob-demo-user-001" />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="label 为前置标签（如 'ID:'），点击复制图标复制 text 并弹出 Toast 提示；文本超长时自动单行省略，悬停展示完整内容。" />

## 图标配置

<demo src="./demo/options.vue" title="图标配置" desc="show-icon 可隐藏复制图标（此时仅展示文本）；icon-size 调整复制图标尺寸，默认 16。" />

## API

<!-- @include: ../.vitepress/gen/copyable-text.md -->
