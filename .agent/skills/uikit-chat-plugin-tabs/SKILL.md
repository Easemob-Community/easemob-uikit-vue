# Vue3 UIKit 聊天插件机制与会话分栏契约（useChatPlugin / conversation-tabs）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-chat-plugin-tabs**。

## 触发词

- `插件` / `插件机制` / `useChatPlugin` / `扩展点`
- `会话分栏` / `conversation-tabs` / `分栏 tab` / `tab 栏`
- `toolbar-extra` / `input-panel` / `message-custom`
- `自定义消息` / `custom message` / `会话 tabs`
- `插槽` / `slot 作用域`

## 目标

在 `easemob-uikit-vue` 里开发**聊天插件**或**会话列表分栏**能力时，先认清两套现成契约：

1. **聊天插件机制**（`useChatPlugin`）：通过 `provide/inject` 把「会话上下文 + 消息发送能力 +
   输入框操作」注入到插槽组件，业务方无需自连 SDK；
2. **会话分栏**（`conversation-tabs`）：`all / unread / atMe / single / group` 五类 tab，
   支持 props 半接管与 `#tabs` 插槽完全接管两种模式。

避免两类翻车：在插件里自建 SDK 连接/自存发送方法（绕过注入）；分栏 tab 状态组件内各存一份
（绕过 `useConversationTabs` 或 `v-model:active-tab`）。

## 1. 聊天插件机制：`useChatPlugin()`（`composables/use-chat-plugin.ts`）

### 1.1 上下文契约

```ts
// ChatPluginContext —— 由 EmChatContainer 提供
currentConversation // ComputedRef<UiConversation | null | undefined>
currentUserId // ComputedRef<string | null | undefined>
send // ChatPluginSendUtils：sendTextMessage / sendCustomMessage / sendImageMessage / sendFileMessage / sendAudioMessage / sendVideoMessage / sendLocationMessage
getUserDisplayName(userId) // 备注 > 用户资料昵称 > ID
getUserAvatar(userId) // 用户资料头像

// MessageInputPluginContext —— 由 MessageInput 提供（输入框相关插槽内可用）
setText(text) / getText() / focus() / appendMention(contact)
```

- `provideChatPluginContext()` 在 `EmChatContainer` 内 provide；`provideMessageInputPluginContext()`
  在 `MessageInput` 内 provide。
- `useChatPlugin()` 返回合并后的 `ChatPluginMergedContext`；在 `EmChatContainer` 外调用会 throw
  `[useChatPlugin] must be used inside EmChatContainer`；输入框上下文不可用时返回 **noop 降级**
  （`setText/getText/focus/appendMention` 打 `logger.warn`），不抛错。

### 1.2 插件可用的插槽（挂载点）

- `#toolbar-extra` — 输入框工具栏；可用 ChatPluginMergedContext（含输入框操作）
- `#input-panel` — 输入框面板；可用 ChatPluginMergedContext（含输入框操作）
- `#message-custom` — 自定义消息渲染（类型级插槽经 chat.vue 透传到渲染链）；作用域 message + emitAction
- `#message-action-extra` — 消息操作菜单底部（见 `uikit-chat-interactions` 操作菜单）

**chat.vue 的插槽透传机制**：`chat.vue` 用 `<template v-for="(_, name) in $slots" #[name]>`
把**所有命名插槽**透传给 `MessageList → MessageBubbleWrapper → MessageRenderer` 链路，
因此 `#message-{type}` / `#message-footer-{type}` 直接在 `<EmChatContainer>` 上写即可生效。

### 1.3 自定义消息（custom message）插件的典型姿势

```
<!-- 业务侧：在 <EmChatContainer> 上写 #message-custom 插槽，作用域 { message, emitAction } -->
<!-- 组件内点击时：emitAction('view-user-card', message.body.params, message) -->
```

- 自定义消息 body 为 `CustomMessageBody`（`event` + `params`），`event` 是消息类型标识；
- 发送用 `send.sendCustomMessage(event, params, ext)`；
- 渲染用 `#message-custom` 插槽 + `emitAction(action, payload, message)` 回传业务事件；
- 会话列表摘要若需展示 custom 消息预览，配置 `ChatConfig.lastMessageTextResolver`
  （默认走 `customEventPreviewMap`，如 `userCard → [名片]`，见 `use-quote.ts` 的 `getQuotePreview`）。

## 2. 会话分栏：`conversation-tabs`（半接管 / 完全接管两种模式）

### 2.1 tab 类型与默认集合（`modules/conversation/types.ts`）

```ts
export type ConversationTabKey = 'all' | 'unread' | 'atMe' | 'single' | 'group'
// all：全部；unread：未读（unreadCount > 0）；atMe：@我（本地 atMeMap 命中）；
// single：单聊；group：群组
export const DEFAULT_CONVERSATION_TABS = ['all', 'unread', 'atMe', 'single', 'group']
```

**顺序即渲染优先级**；传**空数组可隐藏 tab 栏**。

### 2.2 半接管模式（内置 tab 栏样式，推荐）

`EmConversationList` / `EmConversationContainer` 的 props：

```
// EmConversationList / EmConversationContainer 的 props：
tabs?: ConversationTabKey[] // 默认 DEFAULT_CONVERSATION_TABS（传空数组隐藏 tab 栏）
activeTab?: ConversationTabKey // v-model:active-tab 双向绑定，默认 'all'
```

业务侧配合 `useConversationTabs()`（`composables/use-conversation-tabs.ts`）：

```ts
const { tabs, activeTab, selectTab, isActive } = useConversationTabs({
  tabs: ['single', 'group'], // 业务只有单聊/群聊
})
// <EmConversationList v-model:active-tab="activeTab" :tabs="tabs" />
```

### 2.3 完全接管模式（`#tabs` 插槽自绘 tab 栏）

```
<!-- 完全接管：#tabs 插槽自绘 tab 栏，作用域类型 ConversationTabsSlotScope -->
<!-- 作用域字段：{ tabs, activeTab, selectTab } -->
<EmConversationList v-model:active-tab="activeTab" :tabs="tabs">
  <template #tabs="{ tabs, activeTab, selectTab }">...</template>
</EmConversationList>
```

- 作用域类型 `ConversationTabsSlotScope`：`{ tabs, activeTab, selectTab }`；
- 底层 `conversation-tabs.vue` 组件本身也暴露默认插槽（作用域同上），`#tabs` 插槽在列表层透传。

### 2.4 分栏过滤语义（改过滤逻辑前先确认）

- `unread`：`unreadCount > 0`（未读计数过滤，不是「有未读消息」标志位）；
- `atMe`：本地 `atMeMap` 命中（`enableAtMe` Provider 开关控制是否维护）；
- `single` / `group`：按 `conversation.type`（`CONVERSATION_TYPE` 常量）过滤；
- 空 tab 集合 = 隐藏 tab 栏，**列表仍展示全部会话**（不是空列表）。

## 3. 会话列表扩展点：`ConversationAction`（customActions）

```ts
export interface ConversationAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position?: 'mobile' | 'pc' | 'both'
  handler?: (conversation: Conversation) => void | Promise<void>
}
```

- `EmConversationList :custom-actions` 传入，hover/长按菜单追加操作项；
- 点击走 `@custom-action` 事件（`key + conversation`）或组件内 `handler`；
- **key 是本地标识字符串，不强制进 constants**（见 `uikit-component-authoring` 第 8 节「非枚举业务 key 保留」）。

## 硬规则 vs 软约定

**硬规则：**

- 插件组件获取会话/发送/输入框能力**必须**用 `useChatPlugin()`，禁止在插件内自建 SDK client
  或自己存发送方法。
- `useChatPlugin()` 只能在 `EmChatContainer` 内调用；输入框能力不可用时要接受 noop 降级
  （已内置），不要自行 try/catch 或改接口。
- 会话分栏 tab 状态必须通过 `v-model:active-tab` 或 `useConversationTabs` 管理，禁止组件内各存一份
  activeTab 导致多端不同步。
- 新增 tab 类型必须同步：`ConversationTabKey` 联合 + `DEFAULT_CONVERSATION_TABS` +
  `conversation-list.vue` 的过滤逻辑三处。
- 自定义消息渲染必须走 `#message-custom` 插槽或 `messageComponentMap` 映射，禁止在
  `bubble-wrapper` 里堆 `v-if` 分支。

**软约定：**

- 新插件优先复用已有插槽挂载点（toolbar-extra / input-panel / message-custom），不要新开插槽。
- 完全接管 tab 栏只在你需要自绘样式/交互时才用；默认用半接管。
- 插件上下文里 `send.*` 方法签名与 `useMessageSend` 对齐（File 或 URL、duration 等参数顺序一致）。

## 已知漂移（改到相关文件时注意）

- `use-chat-plugin.ts` 的输入框 noop 降级是历史演进产物（输入框拆出独立 provider），
  不要试图让它「在所有插槽都抛错」——toolbar-extra/input-panel 之外没有输入框上下文是**预期行为**。
- 会话分栏曾做过可配置化改造（tabs 集合可裁剪、空数组隐藏），不要退回「硬编码五 tab」的旧实现。

## 反面清单

- ❌ 插件组件里自己 `useUIKit()` 拿 domains 发消息而不走 `useChatPlugin().send`——绕过插件上下文契约。
- ❌ 在 `EmChatContainer` 外用 `useChatPlugin()` 且不处理 throw——组件直接崩溃。
- ❌ 分栏 tab 业务侧 `ref('all')` 自己存一份、再 props 传一份——状态双源必漂移。
- ❌ 新增 tab 类型只改 UI 层过滤，不改 `ConversationTabKey` 联合——类型失守。
- ❌ 自定义消息在 `bubble-wrapper` 里用 `v-if="type === 'custom'"` 特判渲染——破坏类型级插槽契约。
- ❌ 以为 `#message-custom` 需要在 `MessageRenderer` 单独接一遍——chat.vue 已透传全部命名插槽。
- ❌ `tabs: []` 时列表展示空——空数组只是隐藏 tab 栏，列表仍全量展示。
