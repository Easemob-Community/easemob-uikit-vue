# 消息列表 MessageList

消息列表组件，聊天模块的消息渲染区：虚拟滚动列表、各类型消息气泡（文本 / 图片 / 语音 / 视频 / 文件 / 位置 / 合并）、时间戳与头像控制、消息发送状态（经典 / 数字胶囊）与多选模式。数据由 `useChat()` 从消息 store 读取，配置通过 `config.messageList` 传入。

## 使用方式

组件以 `EmMessageList` 为名导出。需在 `EmUIKitProvider` 内使用（`useChat()` 依赖 Provider 上下文）：

```vue
<script setup lang="ts">
import { EmMessageList, EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true">
    <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <EmMessageList
        :config="{
          messageList: {
            showAvatar: true,
            showTime: 'hover',
            bubbleShape: 'round',
          },
        }"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> 通常不需要单独使用 `EmMessageList` —— [聊天模块](./chat-container) 的 `EmChatContainer` 已经内置了消息列表、输入区与消息操作。单独使用 `EmMessageList` 适用于深度定制聊天页布局（如自定义输入区）的场景。

## 配置演练场

下面的演示面板可以实时切换 `config.messageList` 的各项视觉配置，直观对比效果（演示数据为 mock，不依赖登录态）：

<demo src="./demo/config-playground.vue" title="配置演练场" desc="左侧面板切换布局、头像、时间戳、气泡形状、间距与消息状态等配置，右侧列表实时生效。" />

## 配置项速览

`config.messageList` 常用视觉配置：

- `layout`：`'conversation' | 'left'`，默认 `'conversation'` —— 对话式左右分列 / 全部靠左对齐
- `showAvatar`：`boolean`，默认 `true` —— 是否显示发送者头像
- `showTime`：`boolean | 'always' | 'hover'`，默认 `false` —— 时间戳显示策略
- `bubbleShape`：`'round' | 'square'`，默认 `'round'` —— 气泡圆角 / 直角
- `avatarSize`：`number`，默认 `36` —— 头像尺寸（px）
- `messageGap`：`number`，默认 `12` —— 消息间距（px）
- `messagePadding`：`number`，默认 `16` —— 列表内边距（px）
- `messageStatus`：`MessageStatusConfig` —— 状态风格 / 排列 / 位置 / 文本

完整配置（含历史加载、置顶条、搜索、@我定位等）见 [聊天模块](./chat-container) 的 `ChatConfig` API 表格。

## API

<!-- @include: ../.vitepress/gen/message-list.md -->
