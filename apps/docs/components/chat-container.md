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

## 在线代码演练场

直接编辑下面的代码（`config.input` 配置对象与 mock 消息数据），输入回车或点发送可在下方消息列表回显，点「重置代码」恢复初始模板：

<VuePlayground :files="chatContainerPlaygroundFiles" title="聊天容器配置在线演练场" id="chat-container" />

## API

<!-- @include: ../.vitepress/gen/chat-container.md -->

## 插槽说明

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
- 想直观体验 `config.messageList` 各项视觉配置（布局、头像、时间戳、气泡形状、间距、消息状态）的实时效果，请前往[消息列表在线代码演练场](./message-list)。

## 插件机制

`EmChatContainer` 提供了**插槽 + `useChatPlugin()`** 组合的插件体系，允许开发者在聊天输入区、消息列表区中注入自定义 UI 与交互逻辑，扩展出新的消息类型或功能面板。Demo 工程中的「快捷回复面板」与「用户名片发送」就是基于这套体系实现的。

### 扩展点概览

```
┌─ EmChatContainer ────────────────────────────────────────────────┐
│  ┌─ header 区域 ──────────────────────────────────────────────┐  │
│  │  #header / #header-avatar / #header-title / #header-extra  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─ 消息列表 ─────────────────────────────────────────────────┐  │
│  │  #message-*（类型级插槽，如 #message-custom）               │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─ 消息输入区 ───────────────────────────────────────────────┐  │
│  │  #toolbar-extra ─→ 扩展工具栏按钮（如快捷回复、名片入口）   │  │
│  │  #input-panel   ─→ 自定义面板（如快捷回复面板）             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### useChatPlugin()

`useChatPlugin()` 是插件组件与 UIKit 聊天的桥梁。在 `EmChatContainer` 的插槽内调用它即可获取当前会话上下文、消息发送能力与输入框操作方法。

| 属性 / 方法                | 类型                                           | 说明                           |
| -------------------------- | ---------------------------------------------- | ------------------------------ |
| `currentConversation`      | `ComputedRef<UiConversation \| null>`          | 当前正在聊天的会话对象         |
| `currentUserId`            | `ComputedRef<string \| null>`                  | 当前登录用户 ID                |
| `send.sendTextMessage`     | `(text, ext?) => Promise<any>`                 | 发送文本消息                   |
| `send.sendCustomMessage`   | `(event, params?, ext?) => Promise<any>`       | 发送自定义消息（核心扩展能力） |
| `send.sendImageMessage`    | `(data: File \| string, ext?) => Promise<any>` | 发送图片消息                   |
| `send.sendFileMessage`     | `(file: File, ext?) => Promise<any>`           | 发送文件消息                   |
| `send.sendAudioMessage`    | `(file, duration, ext?) => Promise<any>`       | 发送语音消息                   |
| `send.sendVideoMessage`    | `(file, duration, ext?) => Promise<any>`       | 发送视频消息                   |
| `send.sendLocationMessage` | `(body, ext?) => Promise<any>`                 | 发送位置消息                   |
| `getUserDisplayName`       | `(userId: string) => string`                   | 解析用户展示名称               |
| `getUserAvatar`            | `(userId: string) => string \| undefined`      | 获取用户头像 URL               |
| `setText`                  | `(text: string) => void`                       | 设置输入框文本                 |
| `getText`                  | `() => string`                                 | 读取输入框当前文本             |
| `focus`                    | `() => void`                                   | 聚焦输入框                     |

```ts
import { useChatPlugin } from '@easemob/uikit'

const { currentConversation, send, setText } = useChatPlugin()
```

### 插槽 API

#### #toolbar-extra

在输入框工具栏中追加自定义按钮。适用于快捷回复入口、名片发送入口等触发器。

**插槽 Props：**

| 属性          | 类型         | 说明                                      |
| ------------- | ------------ | ----------------------------------------- |
| `togglePanel` | `() => void` | 切换自定义面板（#input-panel）的展开/收起 |
| `showPanel`   | `boolean`    | 当前面板是否展开                          |
| `closePanel`  | `() => void` | 关闭自定义面板                            |

#### #input-panel

在输入框下方渲染自定义面板。面板由 `#toolbar-extra` 中的按钮触发（调用 `togglePanel`），也可通过组件内部逻辑控制。

**插槽 Props：**

| 属性         | 类型         | 说明         |
| ------------ | ------------ | ------------ |
| `showPanel`  | `boolean`    | 面板是否可见 |
| `closePanel` | `() => void` | 关闭面板     |

#### #message-custom

自定义消息类型的渲染映射。当消息列表中遇到 `type === 'custom'` 的消息时，UIKIT 会将渲染委托给此插槽，开发者可在此根据 `body.event` 将不同类型的自定义消息映射到不同的展示组件。

**插槽 Props：**

| 属性      | 类型        | 说明                                                        |
| --------- | ----------- | ----------------------------------------------------------- |
| `message` | `UiMessage` | 当前自定义消息对象（`message.body` 为 `CustomMessageBody`） |

### 完整示例：快捷回复面板

以下示例展示了如何利用 `#toolbar-extra` + `#input-panel` 实现一个客服常用的快捷回复面板。

**Step 1 — 在 chat-container 上注册 slot：**

```vue
<script setup lang="ts">
import { EmChatContainer } from '@easemob/uikit'
import DemoQuickReplyPanel from './demo-quick-reply-panel.vue'

const chatContainerRef = ref<InstanceType<typeof EmChatContainer>>()
</script>

<template>
  <EmChatContainer ref="chatContainerRef">
    <!-- 工具栏：追加快捷回复按钮 -->
    <template #toolbar-extra="{ togglePanel }">
      <button title="快捷回复" @click="togglePanel">
        <EmIcon name="chat/3lines_n_arrow" :size="22" />
      </button>
    </template>

    <!-- 面板：快捷回复内容 -->
    <template #input-panel="{ showPanel, closePanel }">
      <DemoQuickReplyPanel
        v-if="showPanel"
        @select="(text) => { chatContainerRef?.setText?.(text); closePanel() }"
      />
    </template>
  </EmChatContainer>
</template>
```

**Step 2 — 实现面板组件（demo-quick-reply-panel.vue）：**

```vue
<script setup lang="ts">
import { useChatPlugin } from '@easemob/uikit'

const emit = defineEmits<{ (e: 'select', text: string): void }>()

// 通过 useChatPlugin 获取会话信息
const { currentConversation } = useChatPlugin()

const quickReplies = [
  { label: '您好，请问有什么可以帮您？', text: '您好，请问有什么可以帮您？' },
  { label: '感谢您的咨询，祝您生活愉快！', text: '感谢您的咨询，祝您生活愉快！' },
]

function onSelect(item) {
  emit('select', item.text)
}
</script>

<template>
  <div class="quick-reply-panel">
    <div v-if="!currentConversation" class="empty">
      请先选择一个会话
    </div>
    <div v-else class="reply-list">
      <button
        v-for="item in quickReplies"
        :key="item.label"
        class="reply-item"
        @click="onSelect(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
```

### 完整示例：用户名片消息

名片是自定义消息类型的典型场景 —— 需要同时定义「发送端」（如何选名片并发送）和「展示端」（如何渲染名片气泡）。

**Step 1 — 在 chat-container 上注册 slot：**

```vue
<template>
  <EmChatContainer>
    <!-- 工具栏：追加名片发送按钮 -->
    <template #toolbar-extra>
      <button title="发送名片" @click="showCardPicker = true">
        <EmIcon name="people/person_single" :size="22" />
      </button>
    </template>

    <!-- 展示：自定义消息气泡 -->
    <template #message-custom="{ message }">
      <DemoCardMessage
        v-if="message.body?.event === 'send_card'"
        :message="message"
        @card-click="(uid) => showCardModal(uid)"
      />
    </template>
  </EmChatContainer>
</template>
```

**Step 2 — 发送名片（在工具栏按钮的点击回调中）：**

```ts
import { useChatPlugin } from '@easemob/uikit'

const { send } = useChatPlugin()

function sendCard(userId: string) {
  send.sendCustomMessage('send_card', {
    uid: userId,
    nickname: '张三',
    avatar: 'https://...',
  })
}
```

**Step 3 — 渲染名片气泡（DemoCardMessage.vue）：**

```vue
<script setup lang="ts">
import { useUserInfo } from '@easemob/uikit'
import type { CustomMessageBody, UiMessage } from '@easemob/uikit'

const props = defineProps<{ message: UiMessage }>()
const emit = defineEmits<{ (e: 'card-click', userId: string): void }>()

const body = computed(() => props.message.body as CustomMessageBody)
const uid = computed(() => body.value.params?.uid || '')

// 用 useUserInfo 拉取用户资料
const { displayName, avatarUrl } = useUserInfo(uid)
</script>

<template>
  <div class="card-bubble" @click="emit('card-click', uid)">
    <EmAvatar :src="avatarUrl" :name="displayName" :size="40" />
    <span>{{ displayName || uid }}</span>
    <div class="footer">
      名片
    </div>
  </div>
</template>
```

### 消息类型扩展原理

1. 业务代码通过 `send.sendCustomMessage(event, params, ext)` 发送一条 `type: 'custom'` 的消息，其中 `event` 为自定义类型标识（如 `'send_card'`、`'order_share'`）。
2. 消息列表渲染到该消息时，匹配 `#message-custom` 插槽，将 `UiMessage` 传入。
3. 业务组件在插槽内根据 `message.body.event` 分发到不同的渲染组件（`v-if="event === 'send_card'"`）。

通过这套机制，开发者可以在不修改 UIKIT 源码的前提下，为聊天页面扩展任意自定义消息类型与交互面板。

> **参考 Demo**：`apps/demo/src/components/demo-quick-reply-panel.vue`、`apps/demo/src/components/demo-card-message.vue`、`apps/demo/src/components/demo-card-picker-modal.vue`。

<script setup>
import { chatContainerPlaygroundFiles } from './chat-container/demo/playground/template'
</script>
