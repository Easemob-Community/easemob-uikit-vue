# ChatroomLiveInputBar 直播间输入条

直播间输入条通用壳子：UIKIT 负责文本输入、Enter 发送、快捷短语、发送节流、敏感词拦截、
最大长度限制、禁用状态与底部安全区适配；业务方通过插槽自定义右侧动作按钮与底部弹层面板。

## 使用方式

组件以 `ChatroomLiveInputBar` 为名导出（具名导出，按需 import），可脱离容器独立使用：

```vue
<script setup lang="ts">
import { ChatroomLiveInputBar } from '@easemob/uikit-chatroom'

function sendText(text: string) { /* 发送（useChatroomMessage().sendText） */ }
</script>

<template>
  <ChatroomLiveInputBar
    :quick-phrases="['666', '主播好棒']"
    :send-interval-ms="800"
    :block-words="['脏话']"
    @send="sendText"
  >
    <!-- 右侧动作区：礼物 / 菜单 / 分享 / 点赞 -->
    <template #actions="{ text, send, canSend }">
      <button :disabled="!canSend" @click="send()">🎁 礼物</button>
    </template>
  </ChatroomLiveInputBar>
</template>
```

## 运行示例

<demo src="./demo/live-input-bar.vue" title="直播间输入条" desc="输入回车发送（回显演示）、快捷短语、敏感词拦截与 `#actions` 动作插槽。纯 UI 演示，无需登录。" />

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-input-bar.md -->

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#quick-phrases` | `{ phrases, send }` | 快捷短语区整块覆盖（内置短语按钮 → 自定义布局） |
| `#actions` | `{ text, send, can-send }` | 输入框右侧动作区（礼物 / 菜单 / 分享 / 点赞） |
| `#panels` | — | 底部弹层面板区（礼物面板 / 表情面板等，显示逻辑业务自理） |

## 相关文档

- [ChatroomLiveTopBar 直播顶部栏](./live-top-bar)
- [ChatroomGiftBar 礼物入口](./gift-bar)
- [ChatroomContainer 聊天室容器](./chatroom-container)
