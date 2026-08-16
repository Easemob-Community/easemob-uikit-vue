# ChatroomLiveWelcomeBanner 欢迎横幅

直播间弹幕区上方水平居中的入场横幅：金色 / 橙色渐变条，「欢迎 E***💕 进入」白色文字，
VIP 用户带皇冠图标 + 用户名高亮；入场从左侧滑入（400ms），显示 3 秒后自动收起。

## 使用方式

组件以 `ChatroomLiveWelcomeBanner` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveWelcomeBanner } from '@easemob/uikit-chatroom'

// 收到成员加入事件（容器 member-joined / useChatroomMember 订阅）时触发
const show = ref(false)
const name = ref('')
function onMemberJoined(payload: { members: Array<{ nickname?: string }> }) {
  name.value = payload.members[0]?.nickname ?? '新用户'
  show.value = true   // true 触发入场，3s 后自动退场
}
</script>

<template>
  <ChatroomLiveWelcomeBanner :show="show" :name="name" :is-vip="true" />
</template>
```

> 收到成员加入事件（容器 `member-joined` / `useChatroomMember` 订阅）时 push 一条即可；
> 入场动画与自动收起由组件管理。

## 运行示例

<demo src="./demo/live-welcome-banner.vue" title="欢迎横幅" desc="点击「模拟成员进场」触发横幅滑入（400ms），3 秒后自动收起；VIP 用户带皇冠高亮。纯 UI 演示，无需登录。" />

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-welcome-banner.md -->
:::

## 相关文档

- [ChatroomLiveDanmakuStream 直播弹幕流](./live-danmaku)
- [ChatroomContainer 聊天室容器](./chatroom-container)
