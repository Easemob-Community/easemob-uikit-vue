# 快速开始

聊天室与单群聊共用同一套基座（`@easemob/uikit-core`），**不引入新的 Provider 组件**：
`useChatroomProvider()` 初始化，`EmChatroomContainer` 容器驱动进出房。

## 三步接入

```bash
pnpm add @easemob/uikit-chatroom pinia vue
```

```ts
// App.vue / main.ts —— 初始化（自带 pinia 注入）
import { useChatroomProvider } from '@easemob/uikit-chatroom'

useChatroomProvider({ appKey: 'orgName#appName' })
```

```vue
<!-- 页面：容器驱动进出房 -->
<script setup lang="ts">
import { EmChatroomContainer } from '@easemob/uikit-chatroom'
</script>

<template>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</template>
```

- `roomId` 变化自动退出旧房并入新房；`auto-join` 关闭时仅渲染外壳；
- `scene`：内置 `'live'`（私域直播）/ `'voice'`（语聊房）/ `'class'`（小班课），
  或传部分配置对象与 preset 合并（见下）。

## 场景预设（scene 配置）

变种**优先插槽、其次 config、最后才 fork**。`scene` 支持内置名或部分配置对象：

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',                      // 内置预设名（与传入配置合并）
    features: {
      header: false,                   // 隐藏内置顶部栏（自绘头部放容器外）
      gift: true,                      // 礼物栏
      messageArea: { height: 160, transparent: true }, // 直播消息区限高透明
    },
  }"
/>
```

## 插槽覆盖（变种主通道）

容器 19 个命名插槽覆盖每个 UI 边界，常用组合示例：

```vue
<EmChatroomContainer room-id="room123" scene="live">
  <!-- 整条重写顶部栏（或 features.header: false + 容器外自绘） -->
  <template #header="{ roomInfo, onExit }">
    <MyRoomHeader :room="roomInfo" @exit="onExit" />
  </template>
  <!-- 直播场景：消息区整块换成弹幕流（#message-list 接管滚动/加载） -->
  <template #message-list="{ messages }">
    <ChatroomLiveDanmakuStream :items="toDanmaku(messages)" />
  </template>
  <!-- 管理位：仅 owner/admin 可见（按权限门控，不感知业务角色） -->
  <template #manage-actions>
    <button @click="publishProduct">上架商品</button>
  </template>
</EmChatroomContainer>
```

完整 19 插槽清单（scope / 默认内容 / 覆盖粒度）见
[ChatroomContainer 组件页](../components/chatroom-container)「插槽说明」表。

## H5 接入（默认）

三个预设默认为 H5 全屏形态：内置顶部栏（返回 + 房间名 + 人数 + 退出）、
消息流（虚拟滚动 + 加载更多）、输入条、成员面板弹层。`<EmChatroomContainer room-id="room123" scene="live" />`
即为完整直播间页面。

## PC 接入（split 分栏 + 管理位）

PC / Electron 开播端、小班课双端等场景，用 `layout: 'split'` 三栏分栏，
管理操作按**权限**（owner/admin）自动出现：

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',
    layout: 'split',              // fullscreen（默认）/ split / auto（按视口）
    features: { memberList: 'panel' },
    panels: { memberWidth: 300 },
  }"
>
  <!-- 舞台区：视频 / 白板（业务注入） -->
  <template #stage>
    <video ... />
  </template>
</EmChatroomContainer>
```

- 成员侧栏：悬停快捷操作（禁言 / 移除）+ 点击 / 右键上下文菜单；
- 弹层（成员 / 礼物 / 表情）在宽视口自动居中弹窗；
- 输入条自动多行（Shift+Enter 换行）。

**权限模型与业务角色**（主播 / 场控 / 老师 / 学生如何映射、为什么 UIKit 不内置角色）
见 [权限模型与业务角色](./permissions-roles)。

## headless 接入（无 UI）

自绘弹幕轨道 / 礼物飘屏时，不渲染容器，直接用组合式函数：

```ts
import { useChatroom, useChatroomMessage } from '@easemob/uikit-chatroom'

const { join } = useChatroom()
const { subscribe, sendText } = useChatroomMessage()

await join('room123')
subscribe((messages) => {
  // 增量有序 + 批量消费：按帧渲染到自己的轨道
})
```

## 参考

- 组件与插槽清单：[ChatroomContainer](../components/chatroom-container) ·
  [直播弹幕流](../components/live-danmaku) · [直播组件集](../components/live-components) ·
  [PC 模式组件](../components/pc-mode-components)
- 架构与设计：[双 UIKit 架构](./architecture) · 仓库根目录
  [CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)
