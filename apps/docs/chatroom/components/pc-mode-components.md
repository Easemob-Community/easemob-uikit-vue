# PC 模式组件（split 布局 / 成员侧栏 / 上下文菜单）

> PC 模式（`@easemob/uikit-chatroom` 0.2.0+）新增的三件套：布局壳子 + 成员管理侧栏 +
> 通用右键菜单。均**只按权限门控、不感知业务角色**（角色由业务层抽象，见
> [权限模型与业务角色](../guide/permissions-roles)）。

## ChatroomSplitLayout 分栏布局

三栏 [舞台区 `#stage` | 消息主栏 | 成员侧栏] 的纯布局壳子：成员栏宽度可拖拽
（200~480px），未提供 `#stage` 插槽时自动两栏。`EmChatroomContainer` 在
`layout: 'split'` 时内部使用，业务也可单独复用自建分栏。

```vue
<ChatroomSplitLayout :member-width="300" :show-members="true">
  <template #stage>
    <!-- 舞台：视频 / 白板 -->
  </template>
  <!-- 默认插槽 = 消息主栏 -->
  <ChatroomMessageList />
  <template #members>
    <!-- 成员侧栏 -->
  </template>
</ChatroomSplitLayout>
```

**插槽：**

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#stage` | — | 舞台区（视频 / 白板 / 商品区）；未提供时自动两栏（消息 + 成员） |
| 默认插槽 | — | 消息主栏内容 |
| `#members` | — | 成员侧栏内容（通常放 `ChatroomMemberSidebar`） |

## ChatroomMemberSidebar 成员侧栏

split 布局下的常驻成员列（与 H5 底部弹层面板并列的 PC 原生形态）：
成员分页加载、成员 / 黑名单 tab、全员禁言入口、成员行悬停快捷操作
（禁言 / 移除）、点击 / 右键上下文菜单（禁言时长档位 / 移除 / 设或移除管理员）、
危险操作居中确认弹窗。

```vue
<ChatroomMemberSidebar :mute-all-enabled="true" :management="{ mute: true, kick: true }" />
```

## ChatroomContextMenu 上下文菜单

通用右键 / 点击菜单：teleport 到弹层目标、fixed 定位、视口右下溢出自动翻转、
点击外部 / Esc / resize 关闭。菜单项为纯配置（`label` / `danger` / `disabled`），
业务决定内容与动作——与「壳子 vs 内容」哲学一致。

```vue
<ChatroomContextMenu
  v-model:show="menu.show"
  :x="menu.x" :y="menu.y"
  :items="[{ label: '禁言 10 分钟' }, { label: '移出聊天室', danger: true }]"
  @select="handleSelect"
/>
```

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-split-layout.md -->

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-member-sidebar.md -->

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-context-menu.md -->

## 场景配置（scene）扩展

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `layout` | `'fullscreen' \| 'split' \| 'auto'` | 布局形态（auto 按视口 <768px 选择） |
| `features.management` | `ChatroomManagementFeature` | 管理位开关组（mute/kick/muteAll/announcement/blocklist/admin） |
| `features.multilineInput` | `boolean` | PC 输入条多行（split 缺省开启） |
| `features.keyboard` | `boolean` | 键盘快捷键（Esc 关弹层，缺省开启） |
| `panels` | `{ stageWidth?, memberWidth? }` | split 分栏尺寸 |
| `popupMode` | `'auto' \| 'sheet' \| 'dialog'` | 弹层形态（auto 按视口） |

## 相关文档

- [权限模型与业务角色](../guide/permissions-roles)（权限矩阵 / 角色抽象指南）
- [快速开始](../guide/quickstart)（PC 接入示例）
