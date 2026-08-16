# 快速开始

> 聊天室 UIKit 的快速开始文档正在完善中，将随 `@easemob/uikit-chatroom` 版本迭代补齐。
> 本页展示**接入形态**（以实际 API 为准）。

## 接入形态

聊天室与单群聊共用同一套 Provider 基座（`@easemob/uikit-core`），不引入新的 Provider 概念，
进房 / 退房由容器驱动：

```vue
<EmUIKitProvider :app-key="appKey">
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</EmUIKitProvider>
```

## H5 接入（默认）

场景预设 `live` / `voice` / `class` 默认为 H5 全屏形态，直接三步接入：

```vue
<EmChatroomContainer room-id="room123" scene="live" />
```

## PC 接入（split 分栏 + 管理位）

PC / Electron 开播端、小班课双端等场景，用 `layout: 'split'` 三栏分栏，
管理操作按**权限**（owner/admin）自动出现，业务角色由应用层自行抽象：

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',
    layout: 'split',              // fullscreen（默认）/ split / auto（按视口）
    features: { memberList: 'panel' },
    panels: { memberWidth: 300 },
  }"
>
  <!-- 舞台区：视频 / 白板（业务注入） -->
  <template #stage>
    <video ... />
  </template>
  <!-- 管理位：仅 owner/admin 可见（按权限门控，不感知业务角色） -->
  <template #manage-actions>
    <button @click="publishProduct">上架商品</button>
  </template>
</EmChatroomContainer>
```

- 成员侧栏：悬停快捷操作（禁言 / 移除）+ 点击 / 右键上下文菜单；
- 弹层（成员 / 礼物 / 表情）在宽视口自动居中弹窗；
- 输入条自动多行（Shift+Enter 换行）。

**权限模型与业务角色**（主播 / 场控 / 老师 / 学生如何映射、为什么 UIKit 不内置角色）
见 [权限模型与业务角色](./permissions-roles)。

## 开发进度

- [x] `@easemob/uikit-chatroom` 包落地（P2 骨架 + P3 场景预设 + P4 变种 Demo）
- [x] `EmChatroomContainer` 容器与命名插槽
- [x] 场景预设（live / voice / class / custom）
- [x] PC 模式（split 布局 / 管理位 / 成员侧栏 / 弹层退化）
- [ ] 组件文档 / API 表格补齐（gen:api）

::: tip 设计文档
接入 API 的完整契约草案见 [双 UIKit 架构](./architecture) 与仓库根目录
[CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)。
:::
