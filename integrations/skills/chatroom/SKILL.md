---
name: easemob-uikit-chatroom-integration
description: 在 Vue3 项目中集成环信聊天室 UIKit（npm 包 @easemob/uikit-chatroom）时使用。覆盖安装与接入（useChatroomProvider / EmChatroomContainer）、场景预设（live / voice / class / custom）、命名插槽（header / message-list / gift-bar / member-panel 等 19 个）、直播弹幕流与自定义插槽（DanmakuStream / #prefix / #badge / #item）、PC 分栏与权限模型（split 布局 / manage-actions / 成员侧栏 / 业务角色抽象）、信令房多房间订阅与 headless 无头接入、常见坑（join 竞态 / 发送限流 / 弹层目标）。当用户提到「接入聊天室」「聊天室 UIKit」「@easemob/uikit-chatroom」「EmChatroomContainer」「直播间」「语聊房」「弹幕」「场景预设」「scene 配置」「信令房」「麦位」等时加载本技能。
---

# 环信聊天室 UIKit 集成指南（@easemob/uikit-chatroom / EmChatroomContainer / 场景预设）

> 命中本技能时，先说一句：**本次命中 skill: easemob-uikit-chatroom-integration**。

本技能面向**把 `@easemob/uikit-chatroom` 接入自己 Vue3 项目的下游开发者**（由 AI 协助写集成代码时使用）。
它只描述**发布包的对外契约**，不含 UIKit 仓库内部实现细节。

## 何时使用

- 用户要在 Vue3 项目里接入聊天室/直播间/语聊房/小班课场景，搭建互动界面；
- 用户要写 `useChatroomProvider`、`EmChatroomContainer` 或场景预设（`scene="live|voice|class"`）；
- 用户要定制弹幕流（`ChatroomLiveDanmakuStream` 插槽）、PC 分栏（split）、管理位、麦位、礼物；
- 用户报错：「进不去房间」「收不到消息」「弹层位置不对」「被踢/解散没提示」等聊天室集成问题。

## 核心接入链路（先看这个）

最小可运行接入，详见 `reference/quickstart.md`：

1. `pnpm add @easemob/uikit-chatroom pinia vue`（`pinia`、`vue` 是 peerDependencies，**必须显式安装**）；
2. 根组件里 `useChatroomProvider({ appKey, ... })`（自带 pinia 注入，无 Provider 组件概念）；
3. 页面里用 `<EmChatroomContainer room-id="room123" scene="live" auto-join />`。

## reference 子文件索引（按需读取）

| 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `reference/quickstart.md` | 安装 / 三步接入 / 场景预设 / H5 与 PC 两种形态 | 任何接入任务先读 |
| `reference/provider.md` | `useChatroomProvider` 配置：appKey / 登录 / 信令房回调 / 消息用户信息 | 配置接入环境时读 |
| `reference/components.md` | 容器 + 组件清单、19 个命名插槽速览、直播组件集 | 选组件 / 写插槽时读 |
| `reference/danmaku.md` | 弹幕流（DanmakuStream）props / 自定义 kind / #prefix #badge #item 插槽 | 做直播间弹幕时读 |
| `reference/pc-mode.md` | split 分栏 / manage-actions 管理位 / 成员侧栏 / 权限与业务角色 | PC / Electron 开播端时读 |
| `reference/gotchas.md` | 高频集成坑与硬规则 | 排查问题、收尾自查时读 |
| `reference/api/*.md` | 组件 props / emits / slots 明细（由 `scripts/gen-skill.mjs` 同步，勿手改） | 查具体组件 API 时读 |

## 关键契约速查（最常被问到的硬规则）

- **无 Provider 组件**：聊天室复用 `@easemob/uikit-core` 基座，`useChatroomProvider()` 是组合式入口（内部注入 pinia 并初始化 client），**不引入新的 Provider 组件**。
- **容器驱动进出房**：`EmChatroomContainer` 负责 join/leave/历史/消息收发/成员面板；`roomId` 变化自动换房。
- **场景 = 纯配置**：`scene` 传内置名（`'live'` / `'voice'` / `'class'`）或部分配置对象（与 preset 合并）；变种优先插槽、其次 config、最后才考虑 fork。
- **组件前缀**：聊天室组件具名导出（`EmChatroomContainer`、`ChatroomLiveDanmakuStream`、`ChatroomSplitLayout`…），**不注册全局**，按需 import 使用。
- **权限天花板 = SDK 原生权限**（owner/admin/member/none）：管理 UI 按 `canManage` 门控，**业务角色（主播/场控/老师）由应用层抽象**，UIKit 不感知。
- **事件统一 kebab-case**：如 `@kicked`、`@signal-message`、`@member-joined`。
- **入口已内置样式**：`@easemob/uikit-chatroom` 无需再单独 `import '...css'`；主题走 core CSS 变量 + `themeOverrides`。

## 硬规则 vs 软约定

**硬规则：**

- 集成侧只描述 `@easemob/uikit-chatroom` 发布包的对外契约，不写仓库内部实现（build/lint/TECH-DEBT 等）。
- `pinia`、`vue` 是 peerDependencies，接入方必须显式安装。
- 聊天室消息有**发送频率限制**（SDK 侧节流），触发时输入框必须给出明确反馈，不能静默失败。
- 弹幕流一旦提供 `#item` 插槽，**所有 kind** 的条目内容都由插槽渲染（无内置回退），需在插槽内自行分支。
- 组件 API 明细以 `reference/api/*.md` 为准，这些文件由 `scripts/gen-skill.mjs` 从文档源生成，**禁止手改**。

**软约定：**

- 直播间/语聊房 UI 优先用场景预设 + 插槽覆盖，而非复制容器改造；
- 业务自定义弹幕语义用自定义 kind（`LiveDanmakuKind` 已加宽 `| (string & {})`）+ 条目级 `zone` 指定分区；
- 商品/指令类消息建议走**信令房**（`signalRooms`）而非 UI 房，避免刷屏。

## 相关材料

- 对外文档站：`apps/docs/chatroom/`（VitePress，双 UIKit 架构）
- 设计文档：仓库根 `CHATROOM-UIKIT-DESIGN.md`（内部）
