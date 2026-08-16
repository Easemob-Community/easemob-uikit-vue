# 直播组件集（overlay / 输入 / 弹幕外围）

直播/语聊房场景的**外围 UI 壳子集**（P4 review 自绘直播形态）：顶部信息栏、输入条、
礼物面板、欢迎横幅、可交互卡片、overlay 锚定管理器、全屏动效容器。
全部为**纯 UI 壳子**（props / 插槽驱动，不感知业务角色与消息协议），
业务可在不 fork 的情况下组合出自有直播间。

> 弹幕/通知流本体见 [直播弹幕流 DanmakuStream](./live-danmaku)；
> 容器级能力（消息区限高透明 / 礼物栏 / 弹层退化）见 [ChatroomContainer](./chatroom-container)。

## ChatroomLiveTopBar 直播顶部栏

红色渐变横幅：主播头像 + 标题 + 🔥热度 + 更多/投诉按钮，`#extra` 插槽注入
分享/关注/在线数等自定义动作。

```vue
<ChatroomLiveTopBar title="会员年中福利" avatar-url="..." heat="1.4万">
  <template #extra>
    <button @click="share">分享</button>
  </template>
</ChatroomLiveTopBar>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#extra` | — | 右侧动作区（更多 / 投诉按钮之后）：分享 / 关注 / 在线数等业务动作 |

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-top-bar.md -->

## ChatroomLiveInputBar 直播间输入条

通用可配置输入壳子：文本输入 / Enter 发送 / 快捷短语 / 发送节流 / 敏感词拦截 /
最大长度 / 禁用态 / 安全区适配；右侧动作区与底部弹层面板走插槽。

```vue
<ChatroomLiveInputBar
  :quick-phrases="['666', '主播好棒']"
  :send-interval-ms="800"
  :block-words="['脏话']"
  @send="sendText"
>
  <template #actions="{ text, send, canSend }">
    <button :disabled="!canSend" @click="send()">🎁 礼物</button>
  </template>
</ChatroomLiveInputBar>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#quick-phrases` | `{ phrases, send }` | 快捷短语区整块覆盖（内置短语按钮 → 自定义布局） |
| `#actions` | `{ text, send, can-send }` | 输入框右侧动作区（礼物 / 菜单 / 分享 / 点赞） |
| `#panels` | — | 底部弹层面板区（礼物面板 / 表情面板等，显示逻辑业务自理） |

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-input-bar.md -->

## ChatroomGiftBar 礼物入口

输入行「礼物」按钮 → 点击弹出底部礼物面板（覆盖输入区，选中即发送并关闭）。

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-gift-bar.md -->

## ChatroomLiveWelcomeBanner 欢迎横幅

弹幕区上方水平居中的入场横幅：金色渐变条 + 用户名 + VIP 皇冠，滑入 3 秒后自动收起。

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-welcome-banner.md -->

## ChatroomLiveInteractiveCard 可交互卡片壳子

商品卡 / 优惠券 / 红包 / 飘屏通知的通用容器：白底圆角、呼吸灯 active 态、
关闭滑出动画、已抢光遮罩、点击/关闭/行动按钮事件——内容完全插槽化。

```vue
<ChatroomLiveInteractiveCard :active="true" :sold-out="false" @action="buy">
  <template #title>
    <b>限时 5 折</b>
  </template>
  <img src="./sku.png" />
  <template #footer="{ action }">
    <button @click="action">立即抢购</button>
  </template>
</ChatroomLiveInteractiveCard>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#title` | — | 卡片标题区（默认空） |
| `#close` | — | 关闭按钮（默认内置 ✕，点击派发 `close` 事件） |
| 默认插槽 | — | 卡片主体内容（商品图 / 文案 / 优惠券面值等） |
| `#footer` | `{ action }` | 底部行动区（默认空；`action` 触发 `action` 事件） |

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-interactive-card.md -->

## ChatroomLiveOverlayManager overlay 锚定管理器

统一管理多个浮动卡片的锚定位置避免重叠：`top`（顶部居中公告）/
`bottom-right`（右下交互卡片堆叠），内容完全插槽化。

```vue
<ChatroomLiveOverlayManager :items="overlayItems">
  <!-- 锚定区条目（top 与 bottom-right 共用 #item，条目带 zone 区分） -->
  <template #item="{ item, close }">
    <ChatroomLiveInteractiveCard v-if="item.kind === 'product'" @close="close">
      ...
    </ChatroomLiveInteractiveCard>
  </template>
</ChatroomLiveOverlayManager>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#item` | `{ item, close }` | 浮动条目渲染（top 公告与 bottom-right 卡片共用；`close` 移除条目并触发回调） |

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-overlay-manager.md -->

## ChatroomLiveFullscreenEffect 全屏动效容器

大礼物 / 全屏公告 / PK 胜利的强提示容器：全屏 overlay、入场/退场动画、
自动移除、队列消费，内容插槽自定义（火箭 / 跑车 / SVG / Lottie）。

```vue
<ChatroomLiveFullscreenEffect :items="effects">
  <!-- 默认插槽：当前播放条目（item 为当前队列项，end 提前结束进入下一条） -->
  <template #default="{ item, end }">
    <RocketAnimation v-if="item.kind === 'rocket'" @done="end" />
  </template>
</ChatroomLiveFullscreenEffect>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| 默认插槽 | `{ item, end }` | 全屏内容渲染（`item` 为当前队列项；`end` 提前结束当前条进入下一条） |

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-fullscreen-effect.md -->

## 相关文档

- [直播弹幕流 DanmakuStream](./live-danmaku)
- [ChatroomContainer 聊天室容器](./chatroom-container)
- [双 UIKit 架构](../guide/architecture)
