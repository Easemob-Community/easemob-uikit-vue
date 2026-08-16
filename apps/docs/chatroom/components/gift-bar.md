# ChatroomGiftBar 礼物入口

直播间礼物入口：输入行一个「礼物」按钮 → 点击弹出底部礼物面板（覆盖输入区），
选中即发送并关闭——与表情面板一致的交互形态。业务可整体覆盖容器 `gift-bar` 插槽接入自有礼物面板。

## 使用方式

组件以 `ChatroomGiftBar` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ChatroomGiftBar } from '@easemob/uikit-chatroom'
</script>

<template>
  <!-- 容器内默认渲染：场景 features.gift: true 时出现在输入行左侧 -->
  <ChatroomGiftBar :disabled="!isJoined" />
</template>
```

> 直播间场景通常不直接使用本组件：容器在 `features.gift` 开启时自动渲染，
> 业务换自有面板时用容器 `#gift-bar` 插槽整体覆盖。

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-gift-bar.md -->

## 相关文档

- [ChatroomLiveInputBar 直播间输入条](./live-input-bar)
- [ChatroomContainer 聊天室容器](./chatroom-container)
