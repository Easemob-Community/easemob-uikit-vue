# ChatroomLiveFullscreenEffect 全屏动效容器

直播间全屏动效容器：大礼物（火箭 / 跑车 / 飞机等）、全屏公告、PK 胜利等强提示场景。
UIKIT 只负责全屏 overlay、入场 / 退场动画、自动移除与队列消费；
内容通过默认插槽自定义——业务决定展示火箭、跑车、文字公告还是自定义 SVG / Lottie。

## 使用方式

组件以 `ChatroomLiveFullscreenEffect` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveFullscreenEffect } from '@easemob/uikit-chatroom'
import type { LiveFullscreenEffectItem } from '@easemob/uikit-chatroom'

const effects = ref<LiveFullscreenEffectItem[]>([])
// 收到礼物消息时 push：effects.value = [...effects.value, { id, kind: 'rocket', ... }]
</script>

<template>
  <ChatroomLiveFullscreenEffect :items="effects">
    <!-- 默认插槽：当前播放条目（item 为当前队列项，end 提前结束进入下一条） -->
    <template #default="{ item, end }">
      <RocketAnimation v-if="item.kind === 'rocket'" @done="end" />
    </template>
  </ChatroomLiveFullscreenEffect>
</template>
```

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-fullscreen-effect.md -->

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| 默认插槽 | `{ item, end }` | 全屏内容渲染（`item` 为当前队列项；`end` 提前结束当前条进入下一条） |

## 相关文档

- [ChatroomLiveInteractiveCard 可交互卡片壳子](./live-interactive-card)
- [ChatroomLiveOverlayManager overlay 锚定管理器](./live-overlay-manager)
- [ChatroomLiveDanmakuStream 直播弹幕流](./live-danmaku)
