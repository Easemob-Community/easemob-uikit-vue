# ChatroomLiveInteractiveCard 可交互卡片壳子

直播间可交互通知卡片通用容器：白底圆角边框、呼吸灯 active 态、关闭滑出动画、
已抢光遮罩、点击 / 关闭 / 行动按钮事件。内容完全交给插槽——业务可用同一份壳子
实现商品卡、优惠券、红包、飘屏通知等。

## 使用方式

组件以 `ChatroomLiveInteractiveCard` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ChatroomLiveInteractiveCard } from '@easemob/uikit-chatroom'
</script>

<template>
  <ChatroomLiveInteractiveCard :active="true" :sold-out="false" @action="buy">
    <template #title>
      <b>限时 5 折</b>
    </template>
    <img src="./sku.png" />
    <template #footer="{ action }">
      <button @click="action">立即抢购</button>
    </template>
  </ChatroomLiveInteractiveCard>
</template>
```

> 多个卡片同时存在时用 [ChatroomLiveOverlayManager](./live-overlay-manager) 统一锚定，避免重叠。

## 运行示例

<demo src="./demo/live-interactive-card.vue" title="可交互卡片" desc="商品卡：呼吸灯 active 态、`#title` / 默认 / `#footer` 插槽、action / close 事件与已抢光遮罩。纯 UI 演示，无需登录。" />

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-interactive-card.md -->
:::

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#title` | — | 卡片标题区（默认空） |
| `#close` | — | 关闭按钮（默认内置 ✕，点击派发 `close` 事件） |
| 默认插槽 | — | 卡片主体内容（商品图 / 文案 / 优惠券面值等） |
| `#footer` | `{ action }` | 底部行动区（默认空；`action` 触发 `action` 事件） |

## 相关文档

- [ChatroomLiveOverlayManager overlay 锚定管理器](./live-overlay-manager)
- [ChatroomLiveFullscreenEffect 全屏动效容器](./live-fullscreen-effect)
- [ChatroomLiveDanmakuStream 直播弹幕流](./live-danmaku)
