# Notification 消息通知

桌面端消息通知弹层，新消息到达时在屏幕角落弹出卡片提醒。同一会话短时间窗口内的连续消息会自动合并为一张卡片。

## 使用方式

通知由 `useNotification` 组合式函数提供状态单例，`EmNotificationContainer` 负责渲染弹层，两个组件配合使用：

```vue
<script setup lang="ts">
import { useNotification } from '@easemob/uikit'

const { state, notify, close, closeAll } = useNotification()

function onSend() {
  notify({
    title: '张三',
    body: '晚上一起吃饭吗？',
    conversationId: 'user-zhangsan',
    conversationType: 'singleChat',
  })
}
</script>

<template>
  <em-button @click="onSend">模拟收到消息</em-button>
  <em-notification-container
    :items="state.list"
    @close="close"
    @click="(item) => console.log('点击了通知', item)"
  />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="点击按钮模拟收到单聊 / 群聊消息；同一会话 3 秒内连发多条会自动合并为一张卡片，并累计未读数。" />

## EmNotificationContainer 容器

容器 Props：

| 属性       | 类型                                       | 默认值         | 说明                                             |
| --- | --- | --- | --- |
| items      | `readonly NotificationItem[]`              | —              | 通知条目列表（由 `useNotification` 单例提供，只读） |
| position   | `'top-right' \| 'top-left' \| 'top-center'` | `'top-right'` | 弹窗容器位置                                     |
| maxVisible | `number`                                   | `5`            | 同时展示的最大条数，超出丢弃最旧                   |

容器事件与单卡片一致：`close`（参数 `id`）、`click`（参数 `item`）。

## 合并机制

- 同一会话在合并窗口内（约 3 秒）的连续消息会合并为同一条：内容刷新为最新消息，`unreadCount` 累加，卡片不新增
- 合并数大于 1 时卡片展示未读合并数提示
- 关闭 / 点击事件均以通知 `id` 定位，点击后建议同时调用 `close` 移除卡片

## API

<!-- @include: ../.vitepress/gen/notification.md -->
