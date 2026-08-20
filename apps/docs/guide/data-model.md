# 术语与数据模型

UIKit 的列表项（会话 / 联系人 / 消息）数据来自环信 Web SDK 的不同对象。本文档梳理核心术语边界与字段的默认展示规则，帮助设计、开发对接时避免概念混淆。

> 术语对照源自《UIKit 认知对齐》评审资料，与 SDK 契约保持一致。涉及字段如需自绘，优先使用对应容器的插槽（`#item` / `#body` / `#message-*`），不要绕过内置样式。

## 术语对照

| 概念 | 定义 | 易混淆点 | 数据来源 | UIKit 表现 |
|---|---|---|---|---|
| **Conversation** 会话 | 单聊 / 群聊 / 聊天室的对话单元，含未读数、置顶、免打扰等属性 | 不是消息本身，是消息的容器 | SDK `Conversation` 对象 | `EmConversationContainer` 列表项 |
| **Contact** 联系人 | 好友关系记录，含 `userId`、`remark`、`userInfo`、`addTs` | Contact 只表达「好友关系」，用户资料在 UserInfo | SDK `ContactType` | `EmContactContainer` 列表项 |
| **UserInfo** 用户资料 | 昵称 / 头像 / 性别 / 签名 / 手机 / 邮箱 / 生日 / ext 共 8 字段 | 陌生人也能有 UserInfo，不等于好友 | SDK `updateOwnUserInfo` / `fetchUserInfoById` | `EmAvatar` + 昵称展示 |
| **Presence** 在线状态 | `statusDetails` 数组：每端 1=在线、0=离线、≥2=自定义；`ext`=自定义文案 | 不是 login/logout/replaced；无内置「离开/忙碌/勿扰」枚举，自定义文案由 `ext` 承载 | SDK `subscribePresence` / `publishPresence` | `EmPresenceAvatar` 6 种预设状态 |
| **Message** 消息对象 | `id` / `from` / `to` / `body` / `type` / `status` / `ext` / `time` / `receiverList` 等 | 消息发送状态 `status` 不同于 Presence 在线状态 | SDK `MessageType` | `EmMessageList` 气泡 |
| **message.status** 发送状态 | 发送中 / 发送成功 / 发送失败 | 和「已读回执 `isAcked`/`isRead`」不是一回事 | SDK 消息回调 | classic 双勾 / capsule 数字胶囊 |
| **ext** 扩展字段 | 用户自定义 JSON 数据，挂在 UserInfo / Presence / Message 上 | 三处 `ext` 相互独立，不是同一个字段 | 各 SDK API `ext` 参数 | 需业务自行解析渲染 |
| **marks** 会话标记 | 0-19 共 20 个槽位，业务自定义分类（如待办 / 收藏） | 不是会话标签 UI，是底层标记位 | SDK `addConversationMark` / `removeConversationMark` | UIKit 未提供默认 UI，需自绘 |
| **remindType** 提醒类型 | `DEFAULT`(全部) / `ALL`(所有消息) / `AT`(仅@我) / `NONE`(免打扰) | 和 `marks` 是两套机制，一个管提醒一个管分类 | SDK `setConversationRemindType` | 会话项免打扰铃铛图标 |
| **系统消息** | 入群 / 退群 / 群信息变更等时间线提示（`broadcast`/`cmd`） | 不是普通气泡，居中时间线文案 | SDK CMD / 通知消息 | 时间分隔样式，不进入未读计数 |

## 字段展示规则

下表为三大列表项的**默认展示行为**。「默认展示」字段无需配置即出现；「条件展示」字段在满足条件（群聊 / 开启 Presence 等）时出现；「不展示」字段需通过插槽或 `customActions` 自绘。

### 会话列表项（ConversationItem）

| 字段 | 默认展示 | 控制方式 |
|---|---|---|
| `conversationName` | ✅ 主标题 | 核心元素不可隐藏，可通过 `#body` 插槽自绘 |
| `conversationAvatar` | ✅ 头像 | 核心元素，尺寸 / 形状走主题 |
| `lastMessage` | ✅ 副标题摘要 | `messageFormatter` 格式化；`showSenderName` 控制群聊发送者前缀 |
| `lastMessageAt` | ✅ 右侧时间 | `timeFormatter` 格式化 |
| `unreadCount` | ✅ 未读徽标 | `unreadMode: 'count' \| 'dot' \| ''` |
| `isPinned` | ⚡ 条件（置顶时） | 排序 + 背景区分，无单独隐藏开关 |
| `remindType` | ⚡ 条件（免打扰时） | 免打扰铃铛图标 |
| `conversationType` | ⚡ 条件（头像角标 / Tab 分栏） | `tabs` 控制分栏 |
| `pinnedTimestamp` / `marks` / `readAt` | ❌ 不展示 | 内部字段或需 `#body` / `customActions` 自绘 |

### 联系人列表项（ContactItem）

| 字段 | 默认展示 | 控制方式 |
|---|---|---|
| `remark`（有备注时） | ✅ 主标题（最高优先级） | 无隐藏开关，`subtitleFn` 可组合 |
| `nickname`（无备注时） | ✅ 主标题（次优先级） | 同上 |
| `avatarUrl` | ✅ 头像 | `showAvatar` / `avatarSize` / `avatarShape` |
| `userInfo`（嵌套对象） | ⚡ 条件（获取后） | `fetchUserInfoById` 获取 |
| `sign` | ⚡ 条件 | `subtitleFn` 提取 |
| `statusDetails` | ⚡ 条件（开启 Presence） | `enablePresence` + `onlineStatusFn` |
| `userId` / `addTs` / `gender` / `phone` / `mail` / `birth` / `ext` | ❌ 不展示 | `#item` 插槽自绘；隐私字段需权限 |

> 展示名优先级：`remark` → `nickname` → `userId` → 「未知用户」。

### 消息列表项（MessageBubble）

| 元素 | 默认展示 | 控制方式 |
|---|---|---|
| 消息正文 | ✅ 气泡内部 | 不可隐藏，由 `body.type` 决定形态 |
| 发送者头像 | ✅（对方左 / 自己右） | `config.messageList.showAvatar` / `avatarSize` |
| 发送者昵称 | ⚡ 条件（群聊） | 群聊显示，单聊隐藏；`getUserDisplayName()` 自定义 |
| 阶段性时间分组 | ✅ 居中文案 | `config.messageList.groupInterval` |
| 精确时间戳 | ❌ 默认不展示 | `config.messageList.showTime: false / true / 'hover'` |
| 发送状态图标 | ✅（自己消息旁） | `config.messageList.messageStatus`（classic / capsule） |
| 已送达 / 已读标记 | ⚡ 条件（控制台开启回执） | 单聊单勾 / 双勾 |
| 群已读人数 | ❌ 默认关闭 | `config.groupReadReceipt.enabled` |
| @我标记 | ⚡ 条件 | `autoLocateAtMe` 高亮 + 定位 |
| 置顶消息条 | ✅ 顶部横幅 | `config.messageList.pinnedBar.visible` |
| 引用 / 回复内容 | ⚡ 条件（有引用时） | `enableQuote` |
| 已编辑标记 | ⚡ 条件（编辑后） | 自动显示，不可手动隐藏 |
| 语音转文字 | ❌ 默认关闭 | `enableVoiceToText` |

## 与 Store / Composable 的关系

- `useUserInfo()` / `useOwnUserInfo()` 负责拉取与更新 UserInfo，展示名解析遵循「群昵称 → 备注 → 昵称 → userId」优先级。
- `usePresence()` 负责订阅在线状态；`getPresenceStatus` 无需订阅即可查询，`subscribePresence` 单次 ≤100、总数 ≤3000、最长 30 天。
- 会话维度操作（免打扰 / 删除 / 置顶）在会话列表内完成，不在联系人列表内；详见 `EmConversationContainer` 内置操作与 `customActions` 扩展。
