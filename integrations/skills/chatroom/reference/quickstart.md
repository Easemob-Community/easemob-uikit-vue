# 快速开始（@easemob/uikit-chatroom）

## 安装

```bash
pnpm add @easemob/uikit-chatroom pinia vue
# 或 npm / yarn
npm i @easemob/uikit-chatroom pinia vue
```

`pinia`、`vue` 是 peerDependencies，**必须显式安装**（聊天室包不自带）。

## 三步接入

```ts
// main.ts / App.vue —— 初始化（自带 pinia 注入，无 Provider 组件概念）
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

- `roomId` 变化自动退出旧房并入新房；
- `auto-join` 关闭时仅渲染外壳（由业务手动进房）；
- `scene`：内置 `'live'`（私域直播）/ `'voice'`（语聊房）/ `'class'`（小班课），
  或传部分配置对象与 preset 合并（`{ name: 'custom', features: {...} }`）。

## H5 形态（默认）

三预设默认为 H5 全屏形态：内置顶部栏（返回 + 房间名 + 人数 + 退出）、
消息流（虚拟滚动 + 加载更多）、输入条、成员面板弹层。

## PC 形态（split 分栏）

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',
    layout: 'split',            // fullscreen（默认）/ split / auto（按视口 <768px 退化）
    features: { memberList: 'panel' },
    panels: { memberWidth: 300 },
  }"
>
  <template #stage>
    <!-- 舞台区：视频 / 白板 -->
  </template>
  <template #manage-actions>
    <!-- 管理位：仅 owner/admin 可见（按权限门控） -->
    <button @click="publishProduct">上架商品</button>
  </template>
</EmChatroomContainer>
```

PC 下成员侧栏悬停快捷操作、宽视口弹层自动居中弹窗、输入条多行（Shift+Enter）。

## 独立使用组件（不整容器）

直播弹幕流、顶部栏、礼物面板等均为**具名导出纯 UI 组件**，可脱离容器单独使用：

```vue
<script setup lang="ts">
import { ChatroomLiveDanmakuStream } from '@easemob/uikit-chatroom'
import type { LiveDanmakuItem } from '@easemob/uikit-chatroom'

const items = ref<LiveDanmakuItem[]>([])
</script>

<template>
  <ChatroomLiveDanmakuStream :items="items" shape="pill" />
</template>
```

## 登录与账号

`useChatroomProvider({ appKey })` 传了 `appKey` 时自动初始化；
手动登录走 core 的 `useClient()`：

```ts
import { useClient } from '@easemob/uikit-chatroom' // re-export core

const { login } = useClient()
await login({ userId, token })
```

## 参考

- 完整配置见 [provider.md](./provider.md)
- 组件与插槽清单见 [components.md](./components.md)
- 弹幕流定制见 [danmaku.md](./danmaku.md)
- PC 分栏与角色见 [pc-mode.md](./pc-mode.md)
