# H5 适配指南

环信 Vue3 UIKit 为移动端 H5 场景提供了一键式适配能力。只需要在 `<UIKitProvider>` 上配置 `h5` 属性，相关组件会自动处理安全区、软键盘、下拉刷新、长按交互等问题。

## 开启适配

```vue
<script setup lang="ts">
import { UIKitProvider } from '@easemob/uikit-im'
</script>

<template>
  <UIKitProvider
    :h5="{
      safeArea: true,
      keyboardAdapt: true,
      pullRefresh: 'auto',
    }"
  >
    <EmChatContainer />
  </UIKitProvider>
</template>
```

## 配置项

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `safeArea` | `boolean` | `false` | 是否为刘海屏/灵动岛等设备启用安全区内边距。开启后顶部 header、底部 footer、popup 等会自动避开非安全区域。 |
| `keyboardAdapt` | `boolean` | `false` | 是否在软键盘弹起时把键盘高度同步给输入组件，并自动滚动消息列表到底部。 |
| `pullRefresh` | `boolean \| 'auto'` | `false` | 是否开启列表下拉刷新。`'auto'` 表示在触屏设备上自动开启。 |
| `fontScale` | `number` | `1` | 整体字号缩放系数（已由主题字号体系接管，建议使用 `theme.fontSize` 或 `setFontSize`） |

## 安全区

安全区通过 CSS 变量 `--uikit-safe-*` 透传给组件。开启 `safeArea: true` 后，以下区域会自动增加内边距：

- `chat-container` 顶部与底部
- `chat` 页面 header
- `address-book-container` header / footer
- `popup` 底部弹出层
- `scroll-to-top` 按钮
- `message-input` 表情面板
- `conversation-list` header / footer

如果你的项目不需要安全区（例如纯 PC 网页），保持 `safeArea: false` 即可，组件会按 `0px` 处理。

## 键盘适配

开启 `keyboardAdapt: true` 后：

1. UIKit 监听 `window.visualViewport` 变化，实时得到软键盘高度。
2. `chat.vue` 把键盘高度传给 `MessageInput`，输入框随键盘上移。
3. 输入框获得焦点时，消息列表会自动滚动到最底部，避免键盘遮挡最新消息。

> 不需要在业务代码里手动监听 `resize` 或 `visualViewport`。

## 输入框模式

移动端（触屏设备）输入框**固定使用 H5 形态**（单行 + 语音 + 表情 + 长按交互），不渲染 tiptap 富文本编辑器；此时配置 `mode: 'rich'` 会被忽略，控制台会输出一条 warn 提示（`[MessageInput] 移动端已强制使用 H5Input，mode=rich 配置被忽略`）。

需要富文本 / 多行长文本编辑能力的场景请使用桌面端；若 H5 业务必须支持多行输入，可自行通过 `#message-input` 插槽接管输入区（见组件文档），或改用原生 `textarea` 方案。

## 下拉刷新

`pullRefresh: 'auto'` 会在触屏设备上为会话列表等可滚动区域启用下拉刷新；PC 环境下保持原有滚动行为。

## 长按交互

H5 下的长按菜单（消息长按、会话长按）已经统一封装在 `useLongPress` 中，内部处理了：

- touchmove 阈值：手指滑动超过阈值则取消长按，避免和页面滚动冲突。
- 长按时临时禁止 body 滚动，防止菜单弹出时页面跟随手指滑动。

业务层无需额外处理。

## H5 页面栈导航

移动端单栏栈式布局下，会话列表点击后需要跳转到聊天页。`EmConversationContainer` 提供 `conversation-click` 事件，在内部选中逻辑之前触发，便于业务做页面栈导航：

```vue
<EmConversationContainer
  @conversation-click="(cvs) => router.push(`/chat/${cvs.id}`)"
/>
```

## 注意事项

- H5 相关状态统一来自 `useUIKit().h5`，**不要**在业务组件里自己监听 `resize` / `visualViewport` / `keyboard` 事件。
- 安全区只通过 `--uikit-safe-*` CSS 变量传递，组件样式里不会直接写 `env(safe-area-inset-*)`。
- 如果你需要更细粒度的控制，可以直接读取 `useUIKit().h5`：

```ts
import { useUIKit } from '@easemob/uikit-im'

const { h5 } = useUIKit()

console.log(h5.isMobile.value)       // 当前是否移动端（width < 768）
console.log(h5.keyboardHeight.value) // 当前键盘高度
console.log(h5.safeAreaInsets.value) // { top, right, bottom, left }
```

## P2 预留能力

以下字段/变量已预留，当前版本未实现完整逻辑，但接口已稳定：

- 横屏响应式：`h5.viewport` 已包含 width/height，后续可扩展断点。
- 大图手势缩放、bottom sheet 下滑关闭：未实现，但组件预留了接入点。
