# 直播弹幕流（ChatroomLiveDanmakuStream）

直播间 / 语聊房的通用弹幕 / 通知流：上部固定通知区（商品上架、签到、购买提示、
成员欢迎）+ 下部自动滚动聊天区（普通弹幕、礼物）。合并计数、优先级挤出、
进出场动画由组件管理；**内容渲染完全可插槽化**。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveDanmakuStream } from '@easemob/uikit-chatroom'
import type { LiveDanmakuItem } from '@easemob/uikit-chatroom'

const items = ref<LiveDanmakuItem[]>([])
let seq = 0
function pushDanmaku(item: Omit<LiveDanmakuItem, 'id'>) {
  items.value = [...items.value, { ...item, id: ++seq }]
}
</script>

<template>
  <ChatroomLiveDanmakuStream :items="items" :mask-name="true" shape="pill" />
</template>
```

## 弹幕条目（LiveDanmakuItem）

```ts
interface LiveDanmakuItem {
  id: number                     // 自增 id（组件增量消费用）
  kind: LiveDanmakuKind          // 'normal' | 'checkin' | 'purchase' | 'gift' | 'welcome' | (string & {})
  name?: string                  // 用户名（按 mask-name 决定是否脱敏）
  content: string                // 内容
  count?: number                 // 合并人数（「等N人」/ 重复次数）
  giftIcon?: string              // 礼物图标
  isVip?: boolean                // welcome 内置皇冠高亮
  zone?: 'notice' | 'chat'       // 分区覆盖（自定义 kind 用）
  meta?: Record<string, unknown> // 业务数据透传（#badge / #item 插槽消费）
}
```

- 内置分区：`NOTIFICATION_KINDS`（checkin/purchase/welcome → 通知区）、
  `CHAT_KINDS`（normal/gift → 聊天区）；
- **自定义 kind**：kind 联合已加宽（`| (string & {})`），用条目级 `zone` 显式指定分区，
  建议配合 `#item` 插槽自定义渲染。

## 插槽

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#prefix` | `{ item, display-name }` | 整条气泡**最左端**（头像 / 等级 / VIP 皇冠直插位） |
| `#badge` | `{ item, display-name }` | 用户名后、内容前（**VIP 徽章 / 等级 / 勋章直插位**） |
| `#item` | `{ item, display-name, display-count }` | **整条覆盖**内置气泡渲染（合并/挤出/动画仍由组件管理） |
| `#empty` | — | 空态覆盖 |

```vue
<ChatroomLiveDanmakuStream :items="items">
  <template #prefix="{ item }">
    <span v-if="(item.meta as any)?.vipLevel" class="crown">👑</span>
  </template>
  <template #badge="{ item }">
    <span v-if="(item.meta as any)?.vipLevel" class="badge">L{{ (item.meta as any).vipLevel }}</span>
  </template>
</ChatroomLiveDanmakuStream>
```

> **注意**：一旦提供 `#item` 插槽，**所有 kind** 的条目内容都由插槽渲染（无内置回退）；
> 只想给自定义 kind 特殊样式时，在插槽内自行分支渲染内置字段。

## 主题 token

`--live-danmaku-*` 系列（bg / text-color / font-size / radius / name-color /
checkin-bg / purchase-bg / welcome-bg / gift-bg / count-size / max-width / max-lines 等），
在任意祖先元素覆盖即可。

## 容器内弹幕形态

直播场景要把容器普通消息流换成弹幕 / 轨道渲染时，用容器 `#message-list` 插槽整体接管
（提供后容器不再渲染 VirtualList / 空态 / 加载更多，滚动与加载职责转移业务）。
