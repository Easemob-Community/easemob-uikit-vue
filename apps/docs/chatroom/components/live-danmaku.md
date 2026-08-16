# 直播弹幕流 DanmakuStream

`ChatroomLiveDanmakuStream` 是直播/语聊房场景的**通用弹幕/通知流**（壳子）：
上部固定通知区（商品上架、签到、购买提示、成员欢迎）+ 下部自动滚动聊天区（普通弹幕、礼物）。
合并计数、优先级挤出、进出场动画由组件管理；**内容渲染完全可插槽化**，
业务可在不动内核的情况下插入 VIP 徽章、等级、勋章等自定义栏位或整条重绘。

> 能力评估见仓库根目录 [CHATROOM-CAPABILITY-REVIEW.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-CAPABILITY-REVIEW.md)（§二 / §五 P6-2）。

## 使用方式

组件以 `ChatroomLiveDanmakuStream` 为名导出（具名导出，按需 import），
可脱离容器独立使用：

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

## 运行示例

<demo src="./demo/live-danmaku.vue" title="弹幕流" desc="模拟推送普通弹幕 / 礼物 / 签到 / 购买 / 欢迎通知，演示通知区与聊天区双区、合并计数与 `#badge` / `#prefix` 插槽。纯 UI 演示，无需登录。" />

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-danmaku-stream.md -->

> 插槽 scope 见下方「插槽」表（gen 表仅列插槽名）。

## 弹幕条目（`LiveDanmakuItem`）

```ts
interface LiveDanmakuItem {
  id: number                    // 自增 id（组件增量消费用）
  kind: LiveDanmakuKind         // 'normal' | 'checkin' | 'purchase' | 'gift' | 'welcome' | (string & {})
  name?: string                 // 用户名（组件内按 mask-name 决定是否脱敏）
  content: string               // 内容
  count?: number                // 合并人数（购买提示「等N人」/ 普通消息重复次数）
  giftIcon?: string             // 礼物图标
  isVip?: boolean               // 是否 VIP（welcome 类型内置皇冠高亮）
  zone?: 'notice' | 'chat'      // 视觉分区覆盖（自定义 kind 用；缺省按内置常量）
  meta?: Record<string, unknown> // 业务数据透传（供 #badge / #item 插槽消费，如 { vipLevel: 6 }）
}
```

- 内置 kind 分区：`NOTIFICATION_KINDS`（checkin/purchase/welcome → 通知区）、
  `CHAT_KINDS`（normal/gift → 聊天区）；
- **业务自定义 kind**：kind 联合已加宽（`| (string & {})`），用条目级 `zone` 显式指定分区，
  建议配合 `#item` 插槽自定义渲染（未提供插槽时回落默认气泡样式）。

## 插槽

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#prefix` | `{ item, display-name }` | 渲染在整条气泡**最左端**（用户名/内置图标之前，全 kind 通用）——左侧头像 / 等级 / VIP 皇冠等栏位直插位 |
| `#badge` | `{ item, display-name }` | 渲染在用户名之后、内容之前，全 kind 通用——**VIP 徽章 / 等级 / 勋章直插位**（业务数据放 `item.meta`） |
| `#item` | `{ item, display-name, display-count }` | **整条覆盖**内置气泡渲染（通知区与聊天区均生效）；合并/挤出/动画仍由组件管理 |
| `#empty` | — | 覆盖空态文案 |

### 示例：左侧前缀 + 右侧徽章（左右各插一个业务栏位）

::: v-pre
```vue
<ChatroomLiveDanmakuStream :items="items">
  <!-- 左侧：头像 / 皇冠 / 等级（渲染在最左端，welcome 的内置 👑 之前） -->
  <template #prefix="{ item }">
    <span v-if="(item.meta as any)?.vipLevel" class="vip-crown">👑</span>
  </template>
  <!-- 右侧：用户名后的徽章 -->
  <template #badge="{ item }">
    <span v-if="(item.meta as any)?.vipLevel" class="vip-badge">
      L{{ (item.meta as any).vipLevel }}
    </span>
  </template>
</ChatroomLiveDanmakuStream>
```
:::

### 示例：整条自定义（自定义 kind + zone）

> 注意：一旦提供 `#item` 插槽，**所有 kind** 的条目内容都由插槽渲染（无内置回退）；
> 若只想给自定义 kind 特殊样式、其余保持内置观感，请在插槽内自行分支渲染内置字段。

::: v-pre
```vue
<script setup lang="ts">
function pushAuction() {
  pushDanmaku({
    kind: 'auction',           // 业务自定义 kind（类型安全透传）
    zone: 'notice',            // 显式进通知区
    name: '系统',
    content: '当前出价 ¥99',
    meta: { itemId: 'sku-1' },
  })
}
</script>

<template>
  <ChatroomLiveDanmakuStream :items="items">
    <template #item="{ item, displayName }">
      <!-- 自定义 kind：全自定义渲染 -->
      <span v-if="item.kind === 'auction'" class="auction-pill">
        🔨 {{ displayName }}：{{ item.content }}
        <b>{{ (item.meta as any)?.itemId }}</b>
      </span>
      <!-- 其他 kind：插槽内自行保持内置观感（用户名 + 内容） -->
      <template v-else>
        <span v-if="displayName" class="live-danmaku__name">{{ displayName }}：</span>
        <span class="live-danmaku__content">{{ item.content }}</span>
      </template>
    </template>
  </ChatroomLiveDanmakuStream>
</template>
```
:::

## 主题 token（`--live-danmaku-*`）

在组件任意祖先元素上覆盖即可（inline style 或 CSS）：

`--live-danmaku-bg` / `--live-danmaku-text-color` / `--live-danmaku-font-size` /
`--live-danmaku-line-height` / `--live-danmaku-padding` / `--live-danmaku-blur` /
`--live-danmaku-radius` / `--live-danmaku-radius-pill` / `--live-danmaku-radius-square` /
`--live-danmaku-name-color` / `--live-danmaku-normal-name-color` /
`--live-danmaku-checkin-bg` / `--live-danmaku-purchase-bg` / `--live-danmaku-welcome-bg` /
`--live-danmaku-welcome-shadow` / `--live-danmaku-welcome-vip-color` /
`--live-danmaku-welcome-vip-shadow` / `--live-danmaku-gift-bg` /
`--live-danmaku-gift-border-color` / `--live-danmaku-icon-size` /
`--live-danmaku-count-size` / `--live-danmaku-empty-bg` / `--live-danmaku-empty-color` /
`--live-danmaku-max-width` / `--live-danmaku-max-lines`

## 相关文档

- [ChatroomContainer 聊天室容器](./chatroom-container)（`#message-list` 容器内弹幕形态）
- [双 UIKit 架构](../guide/architecture)
- [快速开始](../guide/quickstart)
