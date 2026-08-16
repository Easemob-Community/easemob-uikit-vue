# ChatroomSplitLayout 分栏布局

PC / 开播端三栏布局壳子：[舞台区 `#stage` | 消息主栏 | 成员侧栏]，
成员栏宽度可拖拽（200~480px），未提供 `#stage` 插槽时自动两栏。
`EmChatroomContainer` 在 `layout: 'split'` 时内部使用，业务也可单独复用自建分栏。

## 使用方式

组件以 `ChatroomSplitLayout` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ChatroomSplitLayout, ChatroomMemberSidebar } from '@easemob/uikit-chatroom'
</script>

<template>
  <ChatroomSplitLayout :member-width="300" :show-members="true">
    <template #stage>
      <!-- 舞台：视频 / 白板 -->
    </template>
    <!-- 默认插槽 = 消息主栏 -->
    <ChatroomMessageList />
    <template #members>
      <ChatroomMemberSidebar />
    </template>
  </ChatroomSplitLayout>
</template>
```

> 用容器时无需手动组合：`scene.layout: 'split'` 即启用三栏（成员栏可拖拽），
> 窄视口（<768px）自动退化为 H5 底部弹层。

## 运行示例

<demo src="./demo/chatroom-split-layout.vue" title="分栏布局" desc="三栏布局壳：舞台 / 消息主栏 / 成员侧栏，成员栏宽度可拖拽。纯 UI 演示，无需登录。" />

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-split-layout.md -->
:::

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#stage` | — | 舞台区（视频 / 白板 / 商品区）；未提供时自动两栏（消息 + 成员） |
| 默认插槽 | — | 消息主栏内容 |
| `#members` | — | 成员侧栏内容（通常放 `ChatroomMemberSidebar`） |

## 相关文档

- [ChatroomMemberSidebar 成员侧栏](./chatroom-member-sidebar)
- [ChatroomContextMenu 右键菜单](./chatroom-context-menu)
- [权限模型与业务角色](../guide/permissions-roles)
