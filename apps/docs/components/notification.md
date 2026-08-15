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

## 自定义铃声 / 通知送达回调

UIKit 负责「判定 + 投递」：判定链（免打扰 / 当前会话 / 触发模式）通过后，把通知送达浏览器系统通知或页内弹窗。**铃声等自定义行为不内置**——音频资源、浏览器自动播放策略（autoplay 需用户手势解锁，iOS 限制更严）都应由业务侧管理，UIKit 只提供 `onNotify` 送达回调：

- 方式一：在 Provider 的 `notification` prop 上配置（推荐）：

```vue
<EmUIKitProvider
  :notification="{
    onNotify: (item, channel) => {
      // 通知实际投递时触发（浏览器通知发出成功 / 页内弹窗入列）
      playRingtone() // 业务自实现：Web Audio / <audio> 均可
    },
  }"
>
  <EmChatContainer />
</EmUIKitProvider>
```

- 方式二：通过 `useNotification().setNotificationHandler(handler)` 注册（Provider 内部也是走这条注册路径）：

```ts
import { useNotification } from '@easemob/uikit'

const { setNotificationHandler } = useNotification()

// 示例：Web Audio 哔声（AudioContext 需在用户手势后创建才能自动播放）
let ctx: AudioContext | null = null
function playBeep() {
  ctx ??= new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  osc.start()
  osc.stop(ctx.currentTime + 0.4)
}

setNotificationHandler((item, channel) => playBeep())
```

回调语义：

- `item` 为构造中的通知条目（不含 `id` / `unreadCount`，投递后由单例分配）
- `channel` 为**实际**投递通道：`'browser'`（浏览器系统通知发出成功）/ `'in-app'`（页内弹窗入列，含浏览器通知失败降级场景）
- 仅在实际投递时触发：权限被拒且页内弹窗关闭（未投递）时不触发
- 判定链仍由 UIKit 负责，回调内无需重复判断免打扰 / 当前会话

## API

<!-- @include: ../.vitepress/gen/notification.md -->
