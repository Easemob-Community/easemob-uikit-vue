---
layout: home

hero:
  name: 聊天室 UIKit
  text: Vue 3 聊天室 UI 组件库
  tagline: 面向直播间、语聊房、小班课等聊天室场景的独立场景包（@easemob/uikit-chatroom），与单群聊 UIKit 共享基座，H5 优先、场景预设驱动、插槽全覆盖。
  image:
    light: /logo-light.png
    dark: /logo-dark.png
    alt: 聊天室 UIKit
  actions:
    - theme: brand
      text: 快速开始
      link: /chatroom/guide/quickstart
    - theme: alt
      text: 双 UIKit 架构
      link: /chatroom/guide/architecture

features:
  - icon: 🏠
    title: 房间生命周期
    details: 进房 / 退房 / 断线自动重进，房间状态机与 join 竞态处理，H5 优先。
  - icon: 💬
    title: 广播消息流
    details: 历史消息拉取 + 增量追加，渲染节流与列表封顶，无未读 / 无回执 / 无会话列表语义。
  - icon: 👥
    title: 成员与权限
    details: 成员列表、管理员、禁言 / 踢人 / 全员禁言，owner / admin / member 三级权限模型，业务角色应用层抽象。
  - icon: 📢
    title: 公告与房间属性
    details: 公告发布订阅，房间自定义 KV 属性四层同步，变种无需自建服务端。
  - icon: 🎨
    title: 场景预设
    details: 直播 / 语聊 / 小班课 / 自定义场景，纯配置 + 插槽覆盖即可变种，不 fork 代码。
  - icon: 🖥️
    title: PC 分栏模式
    details: split 三栏布局、管理位、成员侧栏、右键菜单，开播端 / 小班课双端开箱即用。
---

## 快速上手

```vue
<script setup lang="ts">
import { useChatroomProvider, EmChatroomContainer } from '@easemob/uikit-chatroom'
useChatroomProvider({ appKey: 'orgName#appName' })
</script>

<template>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</template>
```

三步接入：安装 → `useChatroomProvider` 初始化 → 容器渲染。详见 [快速开始](./guide/quickstart)。

## 能力总览

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 页面容器 | [`EmChatroomContainer`](./components/chatroom-container) | 进出房 / 历史 / 消息收发 / 成员面板 / 系统通知，**19 个命名插槽** + 场景预设 |
| 场景预设 | `scene` 配置 | 内置 `live` / `voice` / `class`，或传部分配置对象合并 |
| 直播弹幕流 | [`ChatroomLiveDanmakuStream`](./components/live-danmaku) | 通知区 + 聊天区双区，合并计数 / 挤出 / 动画，`#prefix` `#badge` `#item` 插槽 |
| 直播组件集 | [顶部栏 / 输入条 / 卡片 / 动效](./components/live-top-bar) | 纯 UI 壳子，props + 插槽驱动，可脱离容器独立使用 |
| PC 模式 | [分栏 / 成员侧栏 / 右键菜单](./components/chatroom-split-layout) | 三栏分栏、管理位（`manage-actions`）、权限门控 |
| headless 接入 | `useChatroom` / `useChatroomMessage` | 无 UI 自绘弹幕轨道，增量有序 + 批量消费契约 |
| 信令房 | `signalRooms` | 1 个 UI 房 + N 个信令房并行订阅，消息零渲染透传 |

## 文档导航

- **指南**：[双 UIKit 架构](./guide/architecture) · [快速开始](./guide/quickstart) · [权限模型与业务角色](./guide/permissions-roles)
- **组件**：[聊天室容器](./components/chatroom-container) · [直播弹幕流](./components/live-danmaku) ·
  [直播组件](./components/live-top-bar)（顶部栏 / 输入条 / 礼物 / 卡片 / 动效）· [PC 模式](./components/chatroom-split-layout)（分栏 / 侧栏 / 菜单）

> `@easemob/uikit-chatroom` 当前版本 **1.0.0**（首个稳定版）。组件 API 表格由 `gen:api` 从源码自动生成，与实现保持同步。
