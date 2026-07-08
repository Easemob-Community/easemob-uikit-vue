# websdk2 0.14.181 SDK 在 Vue3 UIKit 中的最佳实践迁移

## 触发词

- `迁移 SDK`
- `重写 uikit sdk`
- `按方案 A 重构`
- `websdk2 最佳实践`
- `推翻重来`

## 目标

将 `packages/uikit/src/sdk` 从「对 SDK5 的简单代理 + 旧 SDK 习惯代码」重构为「按业务域聚合、事件直接注册 manager、SDK Message 作为真相源」的最佳实践形态。

## 核心原则

1. **SDK Message 是真相源**：UIKit 只定义 `UiMessage = SdkMessage & UiExtension`，不再自己拼顶层字段。
2. **按业务域组织 Domain 层**：`MessageDomain / ConversationDomain / ContactDomain / GroupDomain / PresenceDomain`，替代按 manager 的简单 Service 代理。
3. **事件直接注册到对应 manager**：chat 事件 → `chatManager.addEventHandler`，连接事件 → `client.addEventHandler`。
4. **删除全局单例 `getClient()`**：通过 Vue `provide/inject` 传递 client，测试和多账号切换更友好。
5. **会话列表由 SDK 事件驱动**：`onConversationListUpdate` 是唯一真相源，首屏读 `getConversationList()`。
6. **当前会话用 SDK API**：进入/离开会话调用 `chatManager.setCurrentConversation / resetCurrentConversation`。

## 迁移前必读

- SDK 版本：`easemob-websdk@0.14.181`
- 关键 SDK 事实：
  - `onMessage` payload 是**单个 `Message`**，不是数组
  - `ChatClient.init()` 返回带 managers 类型的实例
  - `chatManager.getConversationList(filter?)` 返回本地缓存投影 `ReadonlyArray<ConversationItem>`
  - `chatManager.refreshSessionList({ includeEmpty? })` 触发服务端同步
  - `createCustomMessage` 需要 `params`（不是 `customExts`）
  - `getPinnedMessageList` 只接受 `ConversationIdentifier`，不分页
  - 已读回执 API 统一（0.14.181 破坏性变更）：
    - `message.needGroupReadReceipt` → `message.needReadReceipt`（单聊/群聊统一字段）
    - `chatManager.markMessageRead(...)` → `chatManager.sendMessageReadReceipts({ conversationId, conversationType, messageIds })`
    - `chatManager.sendGroupMessageReadAck(...)` → 同上 `sendMessageReadReceipts`
    - `chatManager.onMessageRead` → `chatManager.onMessageReceipts`（payload 为 `ReadonlyArray<MessageReceiptEventPayload>`，每项含 `{ conversationId, conversationType, messageIds, timestamp }`，不再携带 `ackContent`）
  - 会话未读清零 API 改造（0.14.181 破坏性变更）：
    - `chatManager.markConversationRead(...)` → `chatManager.clearConversationUnreadMessageCount({ conversationId, conversationType })`
    - 协议仅同步自己多设备，不再发送给对方
    - 多设备事件：`onConversationUnreadMessageCountCleared` / `onAllConversationsUnreadMessageCountCleared`
  - 合并消息字段精简（0.14.181 破坏性变更）：
    - `compatibleText` 仅作为创建参数，不再在 `body` 中暴露
    - `combineLevel` 仅在 `body.combineLevel` 暴露

## 目录结构目标

```text
packages/uikit/src/
├── sdk/
│   ├── index.ts                    # 导出 createClient、UIKitClient、类型
│   ├── client.ts                   # UIKitClient：初始化 + 生命周期
│   ├── types.ts                    # UiMessage / UiConversation / 扩展类型
│   ├── adapter/
│   │   ├── message-adapter.ts      # SdkMessage ↔ UiMessage
│   │   ├── conversation-adapter.ts # ConversationItem ↔ UiConversation
│   │   ├── contact-adapter.ts      # Contact / UserInfo ↔ UiContact
│   │   └── group-adapter.ts        # JoinedGroupSummary / GroupDetail ↔ UiGroup
│   ├── domain/
│   │   ├── message-domain.ts       # 消息发送、历史、已读、撤回、转发
│   │   ├── conversation-domain.ts  # 会话同步、置顶、删除、标记已读
│   │   ├── contact-domain.ts       # 好友、黑名单
│   │   ├── group-domain.ts         # 群组
│   │   └── presence-domain.ts      # 在线状态
│   └── event/
│       ├── registry.ts             # 统一注册/注销事件处理器
│       ├── chat-events.ts          # chatManager 事件
│       ├── connection-events.ts    # ChatClient 连接事件
│       ├── contact-events.ts       # contactManager 事件
│       ├── group-events.ts         # groupManager 事件
│       └── presence-events.ts      # presenceManager 事件
├── store/
│   ├── message.ts                  # 存 UiMessage
│   ├── conversation.ts             # 存 UiConversation
│   ├── contact.ts                  # 存 UiContact
│   ├── group.ts                    # 存 UiGroup
│   ├── presence.ts                 # 存 Presence
│   └── client.ts                   # 连接状态、当前用户
└── composables/
    ├── use-uikit.ts                 # provider / inject 入口
    ├── use-client.ts
    ├── use-conversation.ts
    ├── use-message-send.ts
    ├── use-message-history.ts
    ├── use-message-actions.ts
    ├── use-contact.ts
    ├── use-group.ts
    └── use-chat.ts                  # 薄聚合层
```

## 分步骤迁移指南

### Step 0: 备份与基线

1. 确保当前分支已提交，或创建新分支 `refactor/sdk5-best-practice`
2. 运行基线检查：
   - `pnpm lint`（记录 error 数量）
   - `pnpm -F @easemob/uikit type-check` 或 `pnpm -F @easemob/uikit build`
3. 删除旧目录前先复制一份到 `packages/uikit/src/sdk-old` 作为临时参考（最终删除）

### Step 1: 重写 SDK 类型层与 Adapter

1. 创建 `sdk/types.ts`：
   - 定义 `UiMessage = SdkMessage & { isSelf: boolean; localId?: string; ... }`
   - 定义 `UiConversation`、`UiContact`、`UiGroup` 等 UI 展示类型
   - 删除旧的 `JoinedGroupItem`、`UIKitMessage` 等类型

2. 创建 `sdk/adapter/message-adapter.ts`：
   - `toUiMessage(sdkMsg, currentUserId): UiMessage`
   - `toUiMessages(msgs, currentUserId): UiMessage[]`
   - `extractLastMessageText(sdkMsg): string`（使用 SDK 类型守卫）
   - 使用 SDK 导出的类型守卫：`isTextMessageBody`、`isImageMessageBody` 等

3. 创建 `sdk/adapter/conversation-adapter.ts`：
   - `toUiConversation(item): UiConversation`
   - `toUiConversations(items): UiConversation[]`

4. 创建 `sdk/adapter/contact-adapter.ts` / `group-adapter.ts`：
   - 只做字段映射，不处理业务逻辑

### Step 2: 重写 UIKitClient 与 Domain 层

1. 重写 `sdk/client.ts`：
   - `UIKitClient` 只负责 `ChatClient.init()` 和 `login/logout`
   - 通过 getter 暴露 `chatManager / contactManager / groupManager / presenceManager`
   - **不再暴露 `client` getter 让外部拿到原始 SDK**
   - `createClient(config)` 只返回实例，不做全局单例

2. 创建 `sdk/domain/message-domain.ts`：
   - 注入 `UIKitClient` 和 `messageStore`
   - 方法：`sendText / sendImage / sendFile / sendVoice / sendVideo / sendLocation / sendCustom / sendCmd / sendCombine`
   - 方法：`fetchHistory / recall / markMessagesRead / pin / unpin / getPinnedMessages / translate / downloadCombine`
   - 发送流程统一：create SDK Message → 加入 store（localId） → sendMessage(options) → replace with sent message

3. 创建 `sdk/domain/conversation-domain.ts`：
   - `enter(conversationId, type)`：调用 `chatManager.setCurrentConversation`，更新 store currentId
   - `leave()`：调用 `chatManager.resetCurrentConversation`
   - `syncLocal()`：调 `getConversationList()` 写入 store
   - `refresh(includeEmpty?)`：调 `refreshSessionList()`，由事件回填 store
   - `remove / pin / markRead`

4. 创建 `contact-domain.ts`、`group-domain.ts`、`presence-domain.ts`

### Step 3: 重写事件层并注册到各 manager

1. 创建 `sdk/event/chat-events.ts`：
   - `onMessage` 按单个 `SdkMessage` 处理
   - `onConversationListUpdate` 用 `toUiConversations` 更新 store
   - `onSyncDataStart / onSyncDataFinished` 更新 syncing 状态
   - `onMessageRecalled / onMessageDelivered / onMessageRead / onMessageUpdated / onPinnedMessageChanged`
   - `onMultiDeviceConversation / onMultiDeviceMessageRemoved`

2. 创建 `sdk/event/connection-events.ts`：
   - `onConnecting / onConnected / onDisconnected / onReconnectFailed / onTokenWillExpire / onTokenExpired`

3. 创建 `contact-events.ts`、`group-events.ts`、`presence-events.ts`

4. 创建 `sdk/event/registry.ts`：
   - `registerEventHandlers(client, stores)` 统一注册到各 manager
   - 返回 `dispose()` 函数在 logout 时调用

### Step 4: 重写 Message / Conversation Store

1. 重写 `store/message.ts`：
   - 类型改为 `UiMessage`
   - 方法：`addMessage / prependMessages / updateStatusByServerId / recallMessage / updateMessage / setPinnedMessages`
   - 删除手动拼字段的逻辑
   - 保留 `translation / showTranslation / translating` 等 UI 状态

2. 重写 `store/conversation.ts`：
   - 类型改为 `UiConversation`
   - 删除 `currentConversation` 对象，只存 `currentId`
   - 删除 `conversationsLoaded`、`conversationCursor` 等多余状态
   - 保留 `draft` 和 `typingMap / atMeMap`

3. 调整 `store/client.ts`：
   - 只保存 `connected / connecting / currentUser / appKey`
   - 不保存 SDK 实例（通过 provider 注入）

### Step 5: 拆分 use-chat 等 composables

1. 重写 `composables/use-uikit.ts`：
   - `UIKitContext` 包含 `client`、`domains`、`stores`、`features`、`dataSource`
   - 提供 `createUIKitProvider(client, stores, options)`
   - 在 provider 中实例化 Domain 并注册事件

2. 创建 `composables/use-message-send.ts`：
   - 文本、图片、文件、语音、视频、位置、自定义、命令、合并消息发送

3. 创建 `composables/use-message-history.ts`：
   - 拉历史、游标管理

4. 创建 `composables/use-message-actions.ts`：
   - 撤回、删除、转发

5. 创建 `composables/use-conversation.ts`：
   - 会话列表、进入/离开、置顶、删除、标记已读

6. 重写 `composables/use-chat.ts`：
   - 作为薄聚合层，组合上面多个 composable
   - 不再包含具体 SDK 调用

7. 重写 `composables/use-client.ts`：
   - 从 `useUIKit()` 取 client
   - 删除 `getClient()` 调用

### Step 6: 组件层适配 SDK Message body 读取

1. 所有消息渲染组件改为从 `msg.body` 读取内容：
   - 文本：`msg.body.content`（先判断 `isTextMessageBody`）
   - 图片：`msg.body.thumbnailUrl / originalImageUrl`
   - 文件：`msg.body.filename / url`
   - 语音：`msg.body.duration / url`
   - 视频：`msg.body.duration / url / thumbnailUrl`
   - 位置：`msg.body.latitude / longitude / address`
   - 自定义：`msg.body.event / params`
   - 合并：`msg.body.title / summary / messageList`

2. 会话列表最后一条消息摘要从 `conversation.lastMessageText` 读取（adapter 已计算）

### Step 7: 验证与清理

1. 删除 `packages/uikit/src/sdk-old` 临时备份
2. 删除不再使用的文件：
   - `sdk/client/index.ts` 及下面所有 service
   - `sdk/event-handler/`
   - 旧的 `sdk/types.ts`（已替换）
3. 运行检查：
   - `pnpm -F @easemob/uikit type-check`
   - `pnpm -F @easemob/uikit build`
   - `pnpm lint`（如错误过多，可先跑 `pnpm lint --fix`）
4. 更新 `AGENTS.md` 或相关文档（如仓库要求）

## 关键 API 对照表

| UIKit 意图 | SDK5 API | 备注 |
|---|---|---|
| 初始化 SDK | `ChatClient.init({ appKey, managers: [...] })` | managers 用构造器数组 |
| 登录 | `client.login({ userId, token })` | 返回 `Promise<void>` |
| 登出 | `client.logout()` | 清理状态和缓存 |
| 发送文本 | `chatManager.createTextMessage({...})` + `chatManager.sendMessage(msg, options?)` | 所有消息统一 sendMessage |
| 拉历史 | `chatManager.getHistoryMessages({ conversationId, conversationType, pageSize, cursor, searchDirection: 'up' })` | 返回 `{ items, cursor, hasMore }` |
| 清空会话未读数 | `chatManager.clearConversationUnreadMessageCount({ conversationId, conversationType })` | 0.14.181 起替换 `markConversationRead`；仅同步自己多设备，不再发送给对方 |
| 发送消息已读回执 | `chatManager.sendMessageReadReceipts({ conversationId, conversationType, messageIds })` | 0.14.181 起替换 `markMessageRead` / `sendGroupMessageReadAck`；统一单聊/群聊 |
| 清空所有会话未读 | `chatManager.clearAllConversationUnreadMessageCount()` | 0.14.181 新增 |
| 获取群消息已读回执 | `chatManager.getMessageReadReceipts(params)` | 0.14.181 新增，按群会话批量获取 |
| 撤回 | `chatManager.recallMessage({ conversationId, conversationType, messageId })` | 默认 2 分钟 |
| 置顶消息 | `chatManager.pinMessage({ conversationId, conversationType, messageId })` | 触发 `onPinnedMessageChanged` |
| 获取置顶 | `chatManager.getPinnedMessageList({ conversationId, conversationType })` | 最多 20 条，不分页 |
| 当前会话 | `chatManager.setCurrentConversation({ conversationId, conversationType })` | 离开调 `resetCurrentConversation` |
| 本地会话列表 | `chatManager.getConversationList(filter?)` | 返回 `ReadonlyArray<ConversationItem>` |
| 刷新会话 | `chatManager.refreshSessionList({ includeEmpty? })` | 触发 `onConversationListUpdate` |
| 删除会话 | `chatManager.deleteConversation({ conversationId, conversationType, deleteRoamingMessages?, deleteLocal? })` | |
| 联系人列表 | `contactManager.getContacts()` | 本地内存，无分页 |
| 黑名单 | `contactManager.getBlocklist()` / `addUsersToBlocklist` / `removeUserFromBlocklist` | |
| 已加入群 | `groupManager.getJoinedGroupList()` | 本地只读 |
| 群详情 | `groupManager.getGroupInfo({ groupId })` | 网络请求 |
| 在线状态 | `presenceManager.subscribePresence / getPresenceStatus / publishPresence` | |
| 连接事件 | `client.addEventHandler('id', { onConnected... })` | 注册到 ChatClient |
| Chat 事件 | `chatManager.addEventHandler('id', { onMessage... })` | 注册到 ChatManager |
| Contact 事件 | `contactManager.addEventHandler('id', { onContactAdded... })` | 注册到 ContactManager |
| Group 事件 | `groupManager.addEventHandler('id', { onMembersJoined... })` | 注册到 GroupManager |
| Presence 事件 | `presenceManager.addEventHandler('id', { onPresenceStatusChange... })` | 注册到 PresenceManager |

## 禁止项

- 禁止在业务层直接 `as any` 访问 SDK Message 字段
- 禁止在 UIKit 外部使用 `getClient()` 全局单例
- 禁止按旧 SDK 习惯把 `onMessage` payload 当数组处理
- 禁止自己维护 `currentConversation` 对象来决定未读数（用 SDK `setCurrentConversation`）
- 禁止在 `getPinnedMessageList` 里传 `pageSize/cursor`
- 禁止把 `createCustomMessage` 的 `params` 丢掉或错误地放到 `ext`

## 验证命令

```bash
# 类型检查
pnpm -F @easemob/uikit type-check

# 构建
pnpm -F @easemob/uikit build

# lint（可先用 --fix）
pnpm lint
pnpm lint --fix

# demo 构建
pnpm -F @easemob/demo build
```

## 完成标准

- `packages/uikit/src/sdk` 目录结构符合本 skill 的目录结构目标
- 不再出现 `SdkMsgBase` 等手写推断类型
- 不再出现 `as unknown as Message` 满天飞
- `onMessage` 按单个 Message 处理
- `getClient()` 全局单例已删除
- `pnpm -F @easemob/uikit build` 通过
- `pnpm lint` 无新增 error（允许先 auto-fix style 问题）
