# ChatroomContextMenu 右键菜单

通用右键 / 点击菜单：teleport 到弹层目标、fixed 定位、视口右下溢出自动翻转、
点击外部 / Esc / resize 关闭。菜单项为纯配置（`label` / `danger` / `disabled`），
业务决定内容与动作——与「壳子 vs 内容」哲学一致。

## 使用方式

组件以 `ChatroomContextMenu` 为名导出（具名导出，按需 import）：

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { ChatroomContextMenu } from '@easemob/uikit-chatroom'

const menu = reactive({
  show: false,
  x: 0,
  y: 0,
})

function onContextMenu(e: MouseEvent) {
  menu.show = true
  menu.x = e.clientX
  menu.y = e.clientY
}

function handleSelect(item: { label: string }) {
  // 业务决定动作（禁言 / 移除 / 设管理员…）
  console.log(item.label)
}
</script>

<template>
  <div class="member-row" @contextmenu.prevent="onContextMenu">
    成员行
  </div>

  <ChatroomContextMenu
    v-model:show="menu.show"
    :x="menu.x"
    :y="menu.y"
    :items="[
      { label: '禁言 10 分钟' },
      { label: '移出聊天室', danger: true },
    ]"
    @select="handleSelect"
  />
</template>
```

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-context-menu.md -->

## 相关文档

- [ChatroomMemberSidebar 成员侧栏](./chatroom-member-sidebar)
- [ChatroomSplitLayout 分栏布局](./chatroom-split-layout)
- [权限模型与业务角色](../guide/permissions-roles)
