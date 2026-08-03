# 会话模块

会话列表容器，开箱即用的 IM 会话页：内置搜索、未读徽标、置顶 / 免打扰 / 删除（长按或右键）、草稿记忆与下拉刷新，数据由 SDK 自动同步驱动。

## 使用方式

组件以 `EmConversationContainer` 为名导出。容器依赖 `EmUIKitProvider` 提供 SDK 实例，需将两者组合使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

function onSelect() {
  // 切换到聊天页，例如把 conversation.id 写入路由
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-presence
  >
    <div style="height: 100vh; width: 320px;">
      <em-conversation-container
        title="消息"
        unread-mode="count"
        @conversation-select="onSelect"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> 会话列表在 SDK 5.x 下由 WebSocket 自动同步：登录成功后会监听 `onConversationListSyncDidFinish` 并自动填充列表，无需手动拉取。

## 会话列表项

`EmConversationItem` 是会话列表的基础展示单元，支持单聊 / 群聊、未读徽标、置顶、免打扰与红点模式：

<demo src="./demo/item.vue" title="会话列表项" desc="静态展示单聊、群聊置顶、免打扰与未读红点（dot）四种形态；实际业务中长按（H5）/ 右键（PC）可唤起操作菜单。" />

## Props

- `showSearch`：是否展示搜索框，默认 `true`
- `showScrollToTop`：是否展示滚动置顶按钮，默认 `true`
- `customActions`：自定义操作菜单（popup / action sheet）条目，默认 `[]`，类型 `ConversationAction[]`
- `timeFormatter`：自定义时间格式化函数，覆盖内置智能格式，类型 `(timestamp: number) => string`
- `messageFormatter`：自定义消息摘要格式化函数，覆盖内置类型映射，类型 `(msg: string, type?: string) => string`
- `showSenderName`：群聊是否显示发送者名称，默认 `true`
- `emptyText`：空列表提示文字，默认 `-`
- `unreadMode`：未读数显示模式，`'count'` 数字 / `'dot'` 红点，默认 `'count'`
- `showHeader`：是否展示头部区域，默认 `true`
- `title`：Header 标题文本
- `headerAlign`：Header 对齐方式，`'left' | 'center' | 'right'`，默认 `'left'`
- `filterFn`：自定义搜索过滤函数，类型 `(keyword: string, item: Conversation) => boolean`
- `bodySticky`：`#body` 插槽是否固定不随列表滚动，默认 `false`
- `footerSticky`：`#footer` 插槽是否固定不随列表滚动，默认 `false`
- `pullRefresh`：是否启用下拉刷新（H5），默认 `false`
- `enablePresence`：单聊头像是否展示在线状态；不传则使用 Provider 全局配置
- `draftStorage`：草稿存储模式，`'none'` 内存 / `'session'` 会话 / `'local'` 本地持久化，默认 `'none'`

## 事件

- `conversation-select`：点击某个会话，参数 `conversation: Conversation`

## 插槽

- `header`：自定义头部内容（替代默认标题）
- `empty`：空列表状态，接收 `keyword` 等插槽属性
- `body`：列表顶部附加内容，可通过 `body-sticky` 固定
- `footer`：列表底部附加内容，可通过 `footer-sticky` 固定

## 进阶

- 会话项右侧操作（置顶 / 免打扰 / 删除）通过长按（H5）或右键（PC）触发，菜单行为由组件内置。
- 草稿功能开启后，输入框内容会按 `draftStorage` 模式持久化，重新进入会话自动恢复。
