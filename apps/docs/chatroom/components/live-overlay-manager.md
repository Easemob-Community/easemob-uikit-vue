# ChatroomLiveOverlayManager overlay 锚定管理器

直播间 overlay 布局管理器：统一管理多个浮动交互卡片 / 通知的锚定位置，避免互相重叠。
当前支持 `top`（顶部居中公告）与 `bottom-right`（右下交互卡片堆叠）。
内容完全通过插槽自定义——业务可在此壳子内放置商品卡、红包、优惠券、PK 条等。

## 使用方式

组件以 `ChatroomLiveOverlayManager` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveOverlayManager } from '@easemob/uikit-chatroom'
import type { LiveOverlayItem } from '@easemob/uikit-chatroom'

const overlayItems = ref<LiveOverlayItem[]>([])
</script>

<template>
  <ChatroomLiveOverlayManager :items="overlayItems">
    <!-- 锚定区条目（top 与 bottom-right 共用 #item，条目带 zone 区分） -->
    <template #item="{ item, close }">
      <ChatroomLiveInteractiveCard v-if="item.kind === 'product'" @close="close">
        ...
      </ChatroomLiveInteractiveCard>
    </template>
  </ChatroomLiveOverlayManager>
</template>
```

## 运行示例

<demo src="./demo/live-overlay-manager.vue" title="overlay 锚定管理" desc="顶部公告与右下商品卡双锚点：同锚点堆叠不重叠、互不干扰。纯 UI 演示，无需登录。" />

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-overlay-manager.md -->

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#item` | `{ item, close }` | 浮动条目渲染（top 公告与 bottom-right 卡片共用；`close` 移除条目并触发回调） |

## 相关文档

- [ChatroomLiveInteractiveCard 可交互卡片壳子](./live-interactive-card)
- [ChatroomLiveFullscreenEffect 全屏动效容器](./live-fullscreen-effect)
- [ChatroomLiveDanmakuStream 直播弹幕流](./live-danmaku)
