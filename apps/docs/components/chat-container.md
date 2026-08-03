# 聊天模块

聊天容器，提供完整的会话聊天页：消息列表（虚拟滚动）、输入区（文本 / 表情 / 图片 / 文件 / 语音）、消息操作（引用、复制、撤回、翻译、多选转发）与群组相关能力，数据由 Provider 统一管理。

## 使用方式

组件以 `EmChatContainer` 为名导出。需与 `EmConversationContainer` 配合 `EmUIKitProvider` 使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
  >
    <div style="display: flex; height: 100vh;">
      <div style="width: 320px; flex-shrink: 0;">
        <em-conversation-container />
      </div>
      <div style="flex: 1;">
        <em-chat-container />
      </div>
    </div>
  </EmUIKitProvider>
</template>
```

> 聊天容器会跟随 `useConversation()` 中的当前会话自动切换：点击左侧会话列表（`conversation-select`）后，聊天页即开始加载对应会话的消息。

## Props

- `config`：聊天页面配置（`ChatConfig`），包括消息气泡样式、发送器行为、`lastMessageTextResolver` 等，默认 `{}`
- `loading`：是否处于全局加载状态，默认 `false`
- `class`：自定义根元素 class
- `style`：自定义根元素 style，类型 `Record<string, string>`

## 事件

- `recall-failed`：消息撤回失败，参数 `(error, message)`
- `at-me-click`：点击「有人 @我」提示，参数 `userId: string`
- `location-click`：点击位置消息，参数 `(body: LocationMessageBody, message: UiMessage)`
- `custom-message-action`：自定义消息类型操作，参数 `(action, payload, message)`

## 插槽

- `empty`：无会话时展示的空状态
- `loading`：全局加载状态
- `error`：错误边界，接收插槽属性 `{ error, retry }`
- `header` / `header-avatar` / `header-title` / `header-extra`：会话头部区域自定义
- `message-*`：消息类型级插槽，如 `#message-txt`、`#message-footer-txt`，可自定义各类消息的渲染

## 实例方法

- `setText(text)`：设置输入框内容
- `getText()`：读取输入框当前内容

## 进阶

- 消息列表为虚拟滚动，长会话列表性能有保障；切换会话自动重置滚动位置与多选状态。
- 引用、翻译、语音转文字、消息定位（搜索跳转）等能力由 `useChat()` 等组合式函数暴露，可在业务代码中直接调用。
