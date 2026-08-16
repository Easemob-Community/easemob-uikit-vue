# ChatroomMemberSidebar 成员侧栏

split 布局下的常驻成员列（与 H5 底部弹层面板并列的 PC 原生形态）：
成员分页加载、成员 / 黑名单 tab、全员禁言入口、成员行悬停快捷操作（禁言 / 移除）、
点击 / 右键上下文菜单（禁言时长档位 / 移除 / 设或移除管理员）、危险操作居中确认弹窗。
全部管理操作按权限门控（`canManage` / `canManageMember`），不感知业务角色。

## 使用方式

组件以 `ChatroomMemberSidebar` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { ChatroomMemberSidebar } from '@easemob/uikit-chatroom'
</script>

<template>
  <ChatroomMemberSidebar
    :mute-all-enabled="true"
    :management="{ mute: true, kick: true }"
  />
</template>
```

> 用容器时无需手动组合：`layout: 'split'` 下成员侧栏自动渲染
> （可经容器 `#member-sidebar` 插槽覆盖）。

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-member-sidebar.md -->
:::

## 相关文档

- [ChatroomSplitLayout 分栏布局](./chatroom-split-layout)
- [ChatroomContextMenu 右键菜单](./chatroom-context-menu)
- [权限模型与业务角色](../guide/permissions-roles)
