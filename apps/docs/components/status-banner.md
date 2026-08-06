# StatusBanner 状态横幅

非阻塞式状态提示横幅，用于展示连接状态、断网提醒、同步进度等场景，支持四种语义类型、loading 与可关闭能力。

## 使用方式

组件以 `EmStatusBanner` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(true)
</script>

<template>
  <em-status-banner
    v-model:show="show"
    type="warning"
    title="网络连接不稳定"
    description="消息可能无法及时送达"
    closable
  />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="type 支持 info / warning / error / success 四种类型；loading 展示旋转图标；closable 显示关闭按钮（v-model:show）。" />

## API

<!-- @include: ../.vitepress/gen/status-banner.md -->

## 说明

- `type` 决定横幅语义配色与默认图标，也可通过 `icon` 传入自定义图标（格式 `"category/icon-name"`）
- `clickable` 仅影响光标与 hover 反馈，点击事件统一由 `click` 事件处理
- 关闭按钮触发 `close` 事件并同步更新 `show`（支持 `v-model:show`）
- 内置进场/退场过渡动画，主题化样式走 `--uikit-*` CSS 变量
