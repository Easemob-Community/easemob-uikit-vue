# Demo 优化第一期：UIKIT 层能力评估与分层规划

> 来源：`/Users/neohuang/Downloads/Demo优化第一期.xlsx`
> 评估范围：第一期需求中标记为 **P0** 且设计端为 **全端** 的条目。
> 目的：明确哪些能力属于 UIKIT 通用能力（应在 `packages/uikit` 内补齐），哪些属于 Demo 层业务（应在 `apps/demo` 实现）。

---

## 一、总体结论

- **UIKIT 已覆盖的 P0 核心能力**：消息时间分割线、群已读回执圆圈、@提及、语音转文字、位置消息收发、PC 右键 / H5 长按菜单、图片预览、全局昵称优先、自定义表情 sticker、消息状态配置等。
- **建议 UIKIT 层补齐的通用能力**（共 7 项）：
  1. 时间分割线语义化（昨天 / 前天）
  2. 消息头像尺寸与消息间距可配置
  3. 长按 / 点击消息头像触发 @提及
  4. 本地消息搜索组件 / Hook
  5. 群主 / 管理员撤回他人消息
  6. 群详情菜单结构完善（群主转让、设置管理员入口）
  7. 好友申请记录本地持久化
- **明确留在 Demo 层**（业务 / 平台相关）：演示水印、拍照卡顿、反诈文案、底部导航栏样式、权限提示、个人资料 UI 等。

---

## 二、P0 需求逐项对照

### 2.1 消息界面

| 需求 ID | 需求 | 当前 UIKIT 状态 | 建议分层 |
| --- | --- | --- | --- |
| **Demo_05** | 去掉每条消息时间戳，改为统一分割线 | ✅ 已具备。`message-list.vue` 已实现 `messagesWithDividers`，按 `groupInterval` 默认 5 分钟分组 | UIKIT |
| **Demo_06** | 分割线语义化：当天 / 昨天 / 前天 / 日期 + 时间 | ⚠️ 部分具备。`formatDividerTime` 只输出 `HH:mm` / `MM-DD HH:mm`，缺少「昨天 / 前天」语义 | **UIKIT 增强** |
| **Demo_07** | 头像放大，与单行气泡同高 | ⚠️ 当前 `message-bubble-wrapper.vue` 写死 `avatarSize = 36`，未与气泡高度联动 | **UIKIT 增强** |
| **Demo_08** | 缩小消息上下间距 | ⚠️ `message-list.vue` 写死 `gap: 12px; padding: 16px` | **UIKIT 增强** |
| **Demo_09** | 群聊：0 人空心圈 / n 人数字 / 全读对勾；单聊：未读 / 已读 | ✅ 已具备。`message-bubble-wrapper.vue` 已实现企业微信风格圆圈；`messageStatus` 支持 `inline / below` 与文本展示 | UIKIT |
| **Demo_11** | iOS 长按头像 @成员 | ⚠️ `@提及` 输入能力已具备，但消息头像没有触发 @ 的事件 | **UIKIT 增强** |
| **Demo_20** | 去掉演示功能提示文案 | 纯 Demo 业务文案 | Demo |
| **Demo_44** | 修复安卓拍照后发送卡顿 | 平台 / 文件压缩处理，与 UIKIT 组件无关 | Demo |
| **Demo_46** | 置顶消息反诈背景 + 文案精简 | 业务文案与配色 | Demo |
| **Demo_48** | 发送位置消息 | ✅ 已具备。`useMessageSend.ts` 有 `sendLocationMessage`；`message-renderer.vue` 已注册 `LocationMessage` | UIKIT + Demo 接入地图 |
| **Demo_49** | 自定义表情 GIF | ✅ 已具备。`emoji-picker` 支持 `stickerPacks`，sticker 按图片消息发送，SDK 图片消息支持 GIF | UIKIT + Demo 配素材 |
| **Demo_50** | PC 端右键消息弹出操作菜单 | ✅ 已具备。`message-interactive.vue` 已实现 PC `contextmenu` + H5 长按 | UIKIT |
| **Demo_51** | 搜索本地消息记录 | ❌ 缺失。无搜索组件 / Hook，无本地消息索引 | **UIKIT 新增** |
| **Demo_52** | 全局昵称优先于 ID | ✅ 已具备。`useUserInfo` 展示链为 备注 > 用户资料昵称 > ID | UIKIT |
| **Demo_54** | 图片放大查看 | ✅ 基本具备。`image-message.vue` 内嵌全屏预览、缩放、下载；缺少「长按保存」需平台能力 | UIKIT |
| **Demo_55** | 语音消息转文字 | ✅ 已具备。`voice-message.vue` + `useChat` 的 `transcribeVoiceMessage` | UIKIT |

### 2.2 群功能

| 需求 ID | 需求 | 当前 UIKIT 状态 | 建议分层 |
| --- | --- | --- | --- |
| **Demo_01** | 群管理菜单项梳理 | ⚠️ `ChatInfoDrawer` + `GroupManagementSection` 已有成员、群名、公告、全员禁言、禁言 / 黑名单 / 白名单 / 共享文件 / 入群申请；但缺少**群主转让**入口，**设置 / 取消管理员**入口仅在成员列表操作里 | **UIKIT 增强** |
| **Demo_02** | 群主 / 管理员撤回他人消息 | ❌ 缺失。`MessageInteractive` 的 `recall` 仅自己消息，无 `recallOther` 类型与权限判断 | **UIKIT 新增** |
| **Demo_10** | 群管理员变更系统通知 | ✅ 已具备。`message-renderer.vue` 已支持 `notice` 类型居中灰条渲染；需 SDK 下发对应通知事件 | UIKIT / SDK |

### 2.3 联系人

| 需求 ID | 需求 | 当前 UIKIT 状态 | 建议分层 |
| --- | --- | --- | --- |
| **Demo_33** | 搜索未找到提示统一中文 | ✅ 已具备。`locale` 多语言体系已建立 | UIKIT |
| **Demo_34** | 好友申请记录持久化 | ⚠️ `contact.ts` 有 `inviteList`，但只在内存中，刷新后丢失 | **UIKIT 增强** |

### 2.4 会话列表

| 需求 ID | 需求 | 当前 UIKIT 状态 | 建议分层 |
| --- | --- | --- | --- |
| **Demo_21** | 右上角加号微信样式 | 纯样式 / 业务入口 | Demo |
| **Demo_22** | 创建群聊成功文案 | ✅ 走 locale | UIKIT |
| **Demo_24** | 单聊未读角标红色样式 | ⚠️ `Badge` 组件有，但角标颜色 / 位置可进一步开放配置 | UIKIT 增强（可选） |
| **Demo_26** | 底部导航栏毛玻璃改固定 | 纯样式 | Demo |
| **Demo_28** | 修复左滑报错弹窗 | 需确认 `conversation-item` 当前报错弹窗实现；语言问题走 locale | 待确认 |

### 2.5 我的

| 需求 ID | 需求 | 建议分层 |
| --- | --- | --- |
| **Demo_37** | 复制 ID 后 Toast 提示 | Demo |
| **Demo_38** | 点击头像修改头像 | Demo |
| **Demo_39** | 个人资料区域 UI 优化 | Demo |

### 2.6 其他

| 需求 ID | 需求 | 建议分层 |
| --- | --- | --- |
| **Demo_47** | Console 后台内容审核关键词 | 服务端，与 UIKIT 无关 |

---

## 三、UIKIT 层建议优先补齐的清单

按通用性与 Demo 阻塞程度排序：

### 1. 本地消息搜索（Demo_51）

- 新增 `useMessageSearch` + `MessageSearch` 组件，支持按关键字搜索本地消息，返回摘要 / 发送人 / 时间 / 跳转 msgId。
- 参考：`useMessageHistory`、`stores.message.getMessages`。

### 2. 群主 / 管理员撤回他人消息（Demo_02）

- 在 `ChatConfig['messageAction']` 增加 `enableRecallOther`。
- 在 `MessageInteractive` 增加 `recallOther` action，判断当前用户角色（owner / admin）。
- 在 `useChat` / `useMessageActions` 调用 SDK 撤回接口。

### 3. 时间分割线语义化（Demo_06）

- 扩展 `formatDividerTime`（`message-list.vue`），支持 `昨天 / 前天` 规则。
- 文案走 `locale`，保持全端一致。

### 4. 消息头像尺寸与间距可配置（Demo_07 / Demo_08）

- `ChatConfig['messageList']` 增加 `avatarSize`、`messageGap`、`messagePadding` 等配置。
- `message-bubble-wrapper.vue` 读取配置，替代写死的 `36px / 12px`。

### 5. 长按 / 点击头像 @提及（Demo_11）

- `MessageBubbleWrapper` 的 avatar 插槽区域暴露 `@mention` 事件。
- `chat.vue` 监听到后调用 `messageInputRef.setText('@xxx ')` 并触发 mention picker。

### 6. 群详情菜单结构完善（Demo_01）

- 在 `ChatInfoDrawer` / `GroupManagementSection` 明确增加「群主转让」、「设置群管理员」入口。
- 与现有 `addGroupAdmin` / `removeGroupAdmin` / `transferGroupOwner` 对齐。

### 7. 好友申请记录本地持久化（Demo_34）

- `contact.ts` 的 `inviteList` 通过 `useUIKitStorage` 或 pinia plugin 持久化到 localStorage。
- 注意登录用户隔离。

---

## 四、适合留在 Demo 层的需求

以下需求与业务场景、平台能力或设计稿强相关，不建议做到 UIKIT 内部：

- **Demo_20** 去掉演示水印 / 提示文案
- **Demo_44** 安卓拍照发送卡顿
- **Demo_46** 反诈置顶文案与背景色
- **Demo_37 / Demo_38 / Demo_39** 我的页面 UI 与头像修改
- **Demo_21** 会话列表右上角加号微信样式
- **Demo_26** 底部导航栏毛玻璃改纯色
- **Demo_47** Console 后台关键词配置

---

## 五、补充：P1 需求里 UIKIT 也可前置的能力

P1 的 **Demo_31（推荐名片给好友）**、**Demo_35（陌生人资料卡）** 虽然优先级不是 P0，但前面已讨论过「名片消息」走自定义消息 + 插槽更合适。当前 UIKIT 已提供：

- `sendCustomMessage` / `#message-custom` 插槽
- `lastMessageTextResolver` 自定义会话预览（已预留 `userCard / order / vote` 兜底）
- `UserCard` / `ContactDetail` 组件可复用于陌生人资料卡

因此名片能力建议：**UIKIT 提供标准化的 custom 消息渲染示例与文档；Demo 层实现具体的名片发送 / 解析 / 跳转逻辑**。这与「UIKIT 保持通用、Demo 做业务」的原则一致。
