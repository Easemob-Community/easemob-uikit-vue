# SDK 5.x 迁移任务分解

> 本文档是 [SDK_5x_MIGRATION_PLAN.md](./SDK_5x_MIGRATION_PLAN.md) 的**可执行任务拆解**，按依赖顺序排列，每项任务包含具体改动点、文件路径和验证方式。

---

## 依赖关系图

```
Task 1: 构建配置
  └─ Task 2: 常量层
       └─ Task 3: store/message.ts (Message 类型)
            └─ Task 4: sdk/types.ts
                 ├─ Task 5: sdk/client.ts
                 │    └─ Task 7: composables
                 ├─ Task 6: sdk/event-handler.ts
                 │    └─ Task 7: composables (use-conversation, use-group)
                 └─ Task 7: composables
                      └─ Task 8: 组件层
                           └─ Task 9: utils
```

**建议执行顺序**：1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

> **执行规则**：每个 Task 完成后需验证通过，经确认后再进入下一步。优先保证初始化登录流程可用，再逐步扩展消息、会话、联系人等功能。

---

## Task 1: 构建配置层

**目标**：将项目依赖从 `easemob-websdk@4.x` 切换到 `im-sdk-web@5.x`。

| 子任务 | 文件 | 具体操作 |
|--------|------|---------|
| 1.1 更新依赖声明 | `packages/uikit/package.json` | `"easemob-websdk": "^4.21.0"` → `"im-sdk-web": "file:../../../../SDK/websdk2"`（本地路径），后续发布时改为正式版本号 |
| 1.2 更新 external | `packages/uikit/vite.config.ts` | `rollupOptions.external` 中 `'easemob-websdk'` → `'im-sdk-web'` |
| 1.3 更新 globals | `packages/uikit/vite.config.ts` | `globals` 中 `'easemob-websdk': 'Easemob'` → `'im-sdk-web': 'Easemob'` |
| 1.4 安装依赖 | 终端 | `cd packages/uikit && pnpm install` |

**验证**：
1. `pnpm install` 成功，无 peer dependency 警告
2. `pnpm build` 通过（确认新 SDK 可被正确打包）
3. **用户确认**后方可进入 Task 2

---

## Task 2: 常量层 — MESSAGE_TYPE 值统一

**目标**：将消息类型字符串值从旧 SDK 规范迁移到新 SDK 规范。

| 子任务 | 文件 | 具体操作 |
|--------|------|---------|
| 2.1 重命名常量键 | `packages/uikit/src/constants/index.ts` | `TXT` → `TEXT`, `IMG` → `IMAGE`, `AUDIO` → `VOICE`, `LOC` → `LOCATION` |
| 2.2 更新值 | 同上 | `'txt'` → `'text'`, `'img'` → `'image'`, `'audio'` → `'voice'`, `'loc'` → `'location'` |
| 2.3 新增 COMBINE | 同上 | 新增 `COMBINE: 'combine'` |

**验证**：
1. `MESSAGE_TYPE.TEXT === 'text'` 等断言成立
2. TypeScript 编译无错误：`npx vue-tsc --noEmit`
3. **用户确认**后方可进入 Task 3

---

## Task 3: store/message.ts — Message 类型完全独立

**目标**：解除 `Message` 类型对 `EasemobChat.ExcludeAckMessageBody` 的依赖，改为独立定义的扁平接口。

### 子任务 3.1: 定义独立 Message 类型

**文件**：`packages/uikit/src/store/message.ts`

移除 `import type { EasemobChat } from 'easemob-websdk'`，重写 `Message` 类型：

```ts
export interface Message extends MessageUiExtension {
  // 身份
  id: string
  serverId: string
  // 会话
  from: string
  to: string
  conversationType: 'singleChat' | 'groupChat'
  // 时间
  timestamp: number
  // 类型
  type: 'text' | 'image' | 'voice' | 'video' | 'file' | 'location' | 'custom' | 'cmd' | 'combine'
  // 扩展
  ext?: Record<string, any>
  // 文本消息
  content?: string
  // 媒体消息
  url?: string
  thumbnailUrl?: string
  secret?: string
  filename?: string
  fileSize?: number
  duration?: number
  width?: number
  height?: number
  // 位置消息
  latitude?: number
  longitude?: number
  address?: string
  // 自定义消息
  customEvent?: string
  customExts?: Record<string, any>
  // 合并消息
  title?: string
  summary?: string
  compatibleText?: string
  messageList?: any[]
  // 命令消息
  action?: string
}
```

### 子任务 3.2: 更新辅助类型

| 操作 | 说明 |
|------|------|
| `TextMessageType` | `Extract<Message, { type: 'txt' }>` → `Extract<Message, { type: 'text' }>` |
| `ImgMessageType` | `Extract<Message, { type: 'img' }>` → `Extract<Message, { type: 'image' }>` |
| `AudioMessageType` | `Extract<Message, { type: 'audio' }>` → `Extract<Message, { type: 'voice' }>` |
| `VideoMessageType` | `Extract<Message, { type: 'video' }>` → 保持不变（值未变） |
| `FileMessageType` | `Extract<Message, { type: 'file' }>` → 保持不变 |

### 子任务 3.3: 更新 store 方法中的旧字段引用

| 方法 | 改动 |
|------|------|
| `replaceMessageById` | `EasemobChat.ExcludeAckMessageBody` 参数 → `Message`；`serverMsg.id` → `serverMsg.serverId` |
| `recallMessage` | `msg.type === 'txt'` → `msg.type === 'text'`；`'msg' in msg` → `'content' in msg`；`(msg as EasemobChat.TextMsgBody).msg` → `msg.content` |
| `applyModifiedMessage` | `EasemobChat.ExcludeAckMessageBody` 参数 → `Message` |
| `parsedCombineMessageMap` | 泛型 `EasemobChat.ExcludeAckMessageBody[]` → `Message[]` |
| `getParsedCombineMessages` | 返回值类型同步更新 |
| `setParsedCombineMessages` | 参数类型同步更新 |

**验证**：
1. `store/message.ts` 中不再有 `EasemobChat` 导入
2. TypeScript 编译无错误
3. **用户确认**后方可进入 Task 4

---

## Task 4: sdk/types.ts — 类型定义全面替换

**目标**：Uikit 的类型定义不再从 `easemob-websdk` 导入，改为从 `im-sdk-web` 导入。

| 子任务 | 文件 | 操作 |
|--------|------|------|
| 4.1 切换导入源 | `packages/uikit/src/sdk/types.ts` | `import type { EasemobChat } from 'easemob-websdk'` → `import type { ChatClient as SdkChatClient, InitConfig } from 'im-sdk-web'` |
| 4.2 `ClientConfig` | 同上 | 从 `EasemobChat.ConnectionParameters & { debug?: boolean }` → 基于 `InitConfig` 扩展 |
| 4.3 `ChatClient` | 同上 | `EasemobChat.Connection` → `SdkChatClient` |
| 4.4 `ChatEventHandler` | 同上 | `EasemobChat.EventHandlerType` → 新 SDK 事件处理器映射类型 |
| 4.5 `ChatMessage` | 同上 | `EasemobChat.MessageBody` → 新 SDK `Message` 类型 |
| 4.6 `ChatError` | 同上 | `EasemobChat.ErrorEvent` → 新 SDK 错误类型 |
| 4.7 `UIKitMessage` | 同上 | 移除或改为基于新 `Message` 类型扩展 |

**验证**：
1. `sdk/types.ts` 中不再有 `easemob-websdk` 导入
2. TypeScript 编译无错误
3. **用户确认**后方可进入 Task 5

---

## Task 5: sdk/client.ts — UIKitClient 重构

**目标**：UIKitClient 从包装 `EasemobChat.Connection` 改为包装 `ChatClient`（含 manager 体系）。

**文件**：`packages/uikit/src/sdk/client.ts`

### 5.1 初始化变更

| 旧代码模式 | 新代码模式 |
|-----------|-----------|
| `import WebIM, { type EasemobChat } from 'easemob-websdk'` | `import { ChatClient, ChatManager, ContactManager, GroupManager, PresenceManager } from 'im-sdk-web'` |
| `private _connection: EasemobChat.Connection` | `private _client: ChatClient` |
| `new WebIM.connection(sdkConfig)` | `ChatClient.init({ appKey, managers: [ChatManager, ContactManager, GroupManager, PresenceManager] })` |
| `this._connection.isDebug = true` | 新 SDK 使用 `logger.setLevel()` 替代 |
| `get connection()` | 改为 `get chatManager()` / `get contactManager()` 等按需暴露 |

### 5.2 消息创建与发送

| 旧代码 | 新代码 |
|--------|--------|
| `WebIM.message.create({ type: 'txt', to, chatType, msg })` | `this._client.chatManager.createTextMessage({ conversationId, conversationType, content })` |
| `WebIM.message.create({ type: 'img', to, chatType, file })` | `this._client.chatManager.createImageMessage({ conversationId, conversationType, file })` |
| `WebIM.message.create({ type: 'audio', ... })` | `this._client.chatManager.createVoiceMessage({ conversationId, conversationType, file, duration })` |
| `WebIM.message.create({ type: 'video', ... })` | `this._client.chatManager.createVideoMessage({ conversationId, conversationType, file, duration })` |
| `WebIM.message.create({ type: 'file', ... })` | `this._client.chatManager.createFileMessage({ conversationId, conversationType, file })` |
| `WebIM.message.create({ type: 'loc', ... })` | `this._client.chatManager.createLocationMessage({ conversationId, conversationType, latitude, longitude, address })` |
| `WebIM.message.create({ type: 'custom', ... })` | `this._client.chatManager.createCustomMessage({ conversationId, conversationType, customEvent, customExts })` |
| `WebIM.message.create({ type: 'cmd', ... })` | `this._client.chatManager.createCmdMessage({ conversationId, conversationType, action })` |
| `this._connection.send(msg)` | `this._client.chatManager.sendMessage(msg)` |

**关键变更**：
- 删除通用 `createMessage(options)` 方法，改为 `createTextMessage` / `createImageMessage` 等各类型独立方法
- 删除 `sendCreatedMessage(msg)`（新 SDK 不需要先创建再发送的两步模式）
- `_sendWithStatus` 改为按类型调用对应创建方法

### 5.3 会话 API

| 旧方法 | 新方法 | 参数变化 |
|--------|--------|---------|
| `getServerConversations({ pageSize, cursor })` | `chatManager.getSessionList()` | 返回本地 WebSocket 同步的 `SessionItem[]`；同步方法，无异步 |
| （无） | `chatManager.refreshSessionList({ needEmptySession, needSessionMark })` | **新增**，强制刷新 |
| `pinConversation({ conversationId, conversationType, isPinned })` | `chatManager.setConversationPinned({ conversationId, conversationType, pinned })` | `isPinned` → `pinned` |
| `deleteConversation({ channel, chatType, deleteRoam })` | `chatManager.deleteConversation({ conversationId, conversationType, deleteRoamingMessages })` | `channel`→`conversationId`, `chatType`→`conversationType`, `deleteRoam`→`deleteRoamingMessages` |
| `sendChannelAck({ chatType, to })` | `chatManager.markConversationRead({ conversationId, conversationType })` | 不再需要构造 ACK 消息 |

### 5.4 联系人 API

| 旧方法 | 新方法 |
|--------|--------|
| `getAllContacts()` | `contactManager.getContacts()` |
| `getContactsWithCursor({ pageSize, cursor })` | 适配新 SDK 对应接口 |
| `addContact(userId, reason)` | `contactManager.addContact({ userId, message: reason })` |
| `deleteContact(userId)` | `contactManager.deleteContact(userId)` |
| `setContactRemark(userId, remark)` | `contactManager.setContactRemark({ userId, remark })` |
| `getBlocklist()` | `contactManager.getBlocklist()` |
| `addUsersToBlocklist(userIds)` | 适配新 SDK 对应接口 |
| `removeUserFromBlocklist(userId)` | 适配新 SDK 对应接口 |

### 5.5 群组 API

| 旧方法 | 新方法 | 参数变化 |
|--------|--------|---------|
| `getJoinedGroups({ pageSize, pageNum, needAffiliations, needRole })` | `groupManager.getJoinedGroupList({ pageSize, needMemberCount, needRole })` | `needAffiliations`→`needMemberCount`，去掉 `pageNum` |
| `getJoinedGroupsCount()` | 新 SDK 对应轻量接口 | — |
| `getGroupInfo(groupId)` | `groupManager.getGroupInfo({ groupId })` | 返回值类型变化 |
| `recallMessage({ mid, to, chatType })` | `chatManager.recallMessage({ messageId, conversationId, conversationType })` | `mid`→`messageId` |
| `modifyMessage({ messageId, modifiedMessage })` | `chatManager.updateMessage({ messageId, message })` | 参数和返回值适配 |
| `pinMessage(...)` | `chatManager.pinMessage(...)` | 参数适配 |
| `unpinMessage(...)` | `chatManager.unpinMessage(...)` | 参数适配 |
| `getServerPinnedMessages(...)` | `chatManager.getPinnedMessageList(...)` | 返回值变化 |
| `translateMessage(...)` | `chatManager.translateMessage(...)` | 参数和返回值适配 |
| `getSupportedLanguages()` | 新 SDK 对应接口 | — |
| `getGroupMsgReadUser(...)` | `chatManager.getGroupMessageReadUsers(...)` | 参数适配 |

### 5.6 事件处理器注册

| 旧代码 | 新代码 |
|--------|--------|
| `this._connection.addEventHandler(id, handler)` | 分散到各 Manager：`this._client.addEventHandler(connId, connHandler)` + `this._client.chatManager.addEventHandler(chatId, chatHandler)` |

### 5.7 返回值处理

所有返回 `Promise<AsyncResult<T>>` 的方法 → 直接返回 `Promise<T>`，去掉 `.data` 解包逻辑。

**验证**：
1. `sdk/client.ts` 中不再有 `WebIM`、`EasemobChat` 引用
2. TypeScript 编译无错误
3. **用户确认**后方可进入 Task 6

---

## Task 6: sdk/event-handler.ts — 事件系统重写

**目标**：按 Manager 分离事件注册，接入新 SDK 的 WebSocket 驱动事件体系。

**文件**：`packages/uikit/src/sdk/event-handler.ts`

### 6.1 连接事件注册

注册到 `client.addEventHandler('uikit-conn', { onConnected, onDisconnected, onConnecting?, onReconnectFailed?, onTokenWillExpire?, onTokenExpired?, onOfflineMessageSyncStart?, onOfflineMessageSyncFinish? })`。

### 6.2 Chat 事件注册

注册到 `client.chatManager.addEventHandler('uikit-chat', { ... })`：

| 新事件 | 替代旧事件 | 处理要点 |
|--------|-----------|---------|
| `onMessage` | `onTextMessage` / `onImageMessage` / `onAudioMessage` / `onVideoMessage` / `onFileMessage` / `onCombineMessage` / `onCmdMessage` | 接收新 SDK `Message`（含 `body.content` 嵌套结构），在边界层提取字段构造 UI `Message`；根据 `msg.type` 区分消息类型生成 `lastMessageText`（`'text'` → `body.content`，`'image'` → `[图片]` 等） |
| `onMessageRecalled` | `onRecallMessage` | payload 结构变化，提取 `messageId` |
| `onMessageUpdated` | `onModifiedMessage` | payload 结构变化 |
| `onMessageDelivered` | `onDeliveredMessage` | payload 结构变化 |
| `onMessageRead` | `onReadMessage` | 需处理群已读回执的新 payload 格式 |
| `onConversationRead` | `onChannelMessage` | 直接提供 conversation 信息 |
| `onPinnedMessageChanged` | `onMessagePinEvent` | payload 结构变化 |
| `onConversationUpdate` | **新增** | **核心变更**：WebSocket 推送的会话实时更新，增量更新 `conversationStore` |
| `onConversationListSyncDidStart` | **新增** | 设置 loading 状态 |
| `onConversationListSyncDidFinish` | **新增** | 清除 loading，触发全量会话列表写入 store |
| `onReactionChanged` | **新增** | 可预留 |
| `onMultiDeviceContact` | `onMultiDeviceEvent` (contact) | 按类型独立处理 |
| `onMultiDeviceGroup` | `onMultiDeviceEvent` (group) | 按类型独立处理 |
| `onMultiDeviceConversation` | `onMultiDeviceEvent` (conversation) | 按类型独立处理 |
| `onMultiDeviceMessageRemoved` | `onMultiDeviceEvent` (message) | 按类型独立处理 |

### 6.3 联系人事件注册

注册到 `client.contactManager.addEventHandler('uikit-contact', { onContactInvited, onContactAdded, onContactDeleted, onContactAgreed, onContactRefuse, onContactInfoUpdated?, onContactSyncStart?, onContactSyncFinish? })`。

### 6.4 群组事件注册（重点新增）

注册到 `client.groupManager.addEventHandler('uikit-group', { ... })`：

| 事件 | 处理动作 |
|------|---------|
| `onGroupInfoChanged` | `groupStore.updateGroup(payload.groupId, { groupName, avatar, description, ... })` |
| `onMembersJoined` | `groupStore.incrementMemberCount(payload.groupId, payload.members.length)` |
| `onMembersExited` | `groupStore.decrementMemberCount(payload.groupId, payload.members.length)` |
| `onOwnerChanged` | `groupStore.updateGroup(payload.groupId, { owner: payload.newOwner })` |
| `onAdminAdded` | `groupStore.markAdmin(payload.groupId, payload.admin)` |
| `onAdminRemoved` | `groupStore.unmarkAdmin(payload.groupId, payload.admin)` |
| `onUserRemoved` | `groupStore.removeGroup(payload.groupId)`（仅当被移除者是当前用户） |
| `onGroupDestroyed` | `groupStore.removeGroup(payload.groupId)` |
| `onAnnouncementChanged` | `groupStore.updateGroup(payload.groupId, { announcement })` |
| `onMuteListAdded` | `groupStore.setMuted(payload.groupId, payload.members, true)` |
| `onMuteListRemoved` | `groupStore.setMuted(payload.groupId, payload.members, false)` |
| `onAllMemberMuteStateChanged` | `groupStore.updateGroup(payload.groupId, { allMuted })` |
| `onUserGroupNamecardUpdated` | 更新群名片缓存 |
| `onInvitationReceived` 等 | 业务层回调（默认 console.info） |

### 6.5 移除旧代码

删除以下旧 SDK 专有的事件处理逻辑：
- 旧 `onTextMessage` / `onImageMessage` / `onAudioMessage` / `onVideoMessage` / `onFileMessage` / `onCombineMessage`
- 旧 `onCmdMessage`（TypingBegin 处理保留，但改为在 `onMessage` 中处理 CMD 类型消息）
- 旧 `onStatisticMessage`（离线群已读统计，新 SDK 机制不同）
- 旧 `onMultiDeviceEvent` 的 switch-case 分发

### 6.6 `handleIncomingMessage` 重构

改为接收新 SDK `Message` 类型，在边界层提取字段填充到 UI `Message`：

```ts
function handleIncomingMessage(sdkMsg: SdkMessage) {
  const uiMsg: Message = {
    id: sdkMsg.msgServerId,           // 新 SDK 的服务端 ID
    serverId: sdkMsg.msgServerId,
    type: sdkMsg.type,                 // 'text' | 'image' | ... 直接使用
    from: sdkMsg.from,
    to: sdkMsg.to,
    conversationType: sdkMsg.conversationType, // 'singleChat' | 'groupChat'
    timestamp: sdkMsg.timestamp,
    ext: sdkMsg.ext,
    // 从 body 提取内容字段
    content: sdkMsg.body?.content,
    url: sdkMsg.body?.url,
    thumbnailUrl: sdkMsg.body?.thumbnailUrl,
    filename: sdkMsg.body?.filename,
    duration: sdkMsg.body?.duration,
    fileSize: sdkMsg.body?.fileSize,
    // ... 其他 body 字段
    // UI 扩展字段
    conversationId: resolveConversationId(sdkMsg, currentUser),
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
  }
  // ...
}
```

**验证**：
1. `sdk/event-handler.ts` 中不再有 `EasemobChat` 引用
2. 不再有旧 SDK 的分类型事件回调（`onTextMessage` 等）
3. TypeScript 编译无错误
4. **用户确认**后方可进入 Task 7

---

## Task 7: composables 层 — API 与方法调用适配

### 7.1 use-client.ts

**文件**：`packages/uikit/src/composables/use-client.ts`

| 操作 | 具体改动 |
|------|---------|
| `login` | `client.value?.login(params)` → 改为 `client.value?.login({ userId: params.user, token: params.accessToken ?? params.password })` |
| `logout` | `client.value?.logout()` → `client.value?.logout()`（API 名可能变化，确认新 SDK 是 `logout` 还是 `close`） |
| `fetchConversationsAfterLogin` | 移除 `res?.data?.conversations` 解包，改为从 `client.chatManager.getSessionList()` 获取 `SessionItem[]`，在 `onConversationListSyncDidFinish` 事件回调中调用 |
| `connection` computed | 移除（不再有 `connection` 属性），暴露 `chatManager` / `contactManager` 等按需访问 |

### 7.2 use-chat.ts（改动最大）

**文件**：`packages/uikit/src/composables/use-chat.ts`

**移除**：`import type { EasemobChat } from 'easemob-websdk'`

**字段批量替换**（全局搜索替换，注意作用域）：

| 搜索 | 替换 |
|------|------|
| `msg.msg` | `msg.content` |
| `msg.thumb` | `msg.thumbnailUrl` |
| `msg.length` | `msg.duration`（注意区分 `msg.length` 用于数组长度的情况，仅消息对象的 `.length` 字段需要替换） |
| `msg.mid` | `msg.serverId` |
| `msg.chatType` | `msg.conversationType` |
| `msg.time` | `msg.timestamp` |
| `msg.file_length` | `msg.fileSize` |

**消息类型字符串替换**：

| 搜索 | 替换 |
|------|------|
| `type: 'txt'` | `type: 'text'` |
| `type: 'img'` | `type: 'image'` |
| `type: 'audio'` | `type: 'voice'` |
| `type: 'loc'` | `type: 'location'` |
| `MESSAGE_TYPE.TXT` | `MESSAGE_TYPE.TEXT` |
| `MESSAGE_TYPE.IMG` | `MESSAGE_TYPE.IMAGE` |
| `MESSAGE_TYPE.AUDIO` | `MESSAGE_TYPE.VOICE` |
| `MESSAGE_TYPE.LOC` | `MESSAGE_TYPE.LOCATION` |

**消息创建重构**：

| 方法 | 改动 |
|------|------|
| `sendTextMessage` | `client.createMessage({ type: 'txt', ... })` → `client.chatManager.createTextMessage({ conversationId, conversationType, content, ext, ... })` |
| `sendImageMessage` | 同上模式，改为 `createImageMessage` |
| `sendFileMessage` | 同上模式，改为 `createFileMessage` |
| `sendAudioMessage` | 同上模式，改为 `createVoiceMessage` |
| `sendVideoMessage` | 同上模式，改为 `createVideoMessage` |
| `sendTypingCmd` | 改为 `createCmdMessage({ conversationId, conversationType, action: 'TypingBegin' })` |
| `modifyTextMessage` | 适配新 SDK 消息修改接口 |
| `forwardMessage` | 各类型转发的消息构建参数适配新 SDK |
| `forwardCombineMessages` | 合并消息构建适配新 SDK |
| `resendMessage` | 重发逻辑适配 |

**其他方法**：

| 方法 | 改动 |
|------|------|
| `_formatLastMessageText` | `MESSAGE_TYPE.TXT/.IMG/.AUDIO` → `MESSAGE_TYPE.TEXT/.IMAGE/.VOICE`；`(sdkMsg as EasemobChat.TextMsgBody).msg` → `sdkMsg.content` |
| `translateTextMessage` | `(message as EasemobChat.TextMsgBody).msg` → `message.content` |
| `fetchGroupReadDetail` | `getGroupMsgReadUser` → `getGroupMessageReadUsers` |
| `fetchPinnedMessages` | `result?.data?.list` → 直接读取返回值 |

### 7.3 use-conversation.ts（WebSocket 驱动）

**文件**：`packages/uikit/src/composables/use-conversation.ts`

| 操作 | 具体改动 |
|------|---------|
| `fetchServerConversations` | 改为 `chatManager.getSessionList()` → 返回 `SessionItem[]`（同步方法，本地内存数据） |
| `refreshConversations` | 改为 `chatManager.refreshSessionList({ needEmptySession, needSessionMark })` 触发服务端同步 |
| `loadMoreConversations` | 改为 `chatManager.getConversationList({ pageSize, cursor })` REST 分页 |
| `mapServerConversation` | 适配 `SessionItem` 结构：`sessionId→conversationId`，`type→conversationType`，`display.displayName/avatarUrl` 直接使用，`lastMessage.body` 提取摘要，`remindType`→免打扰，`marks` 保留 |
| `pinConversation` | `pinConversation({ conversationId, conversationType, isPinned })` → `setConversationPinned({ conversationId, conversationType, pinned })` |
| `deleteConversation` | `deleteConversation({ channel, chatType, deleteRoam })` → `deleteConversation({ conversationId, conversationType, deleteRoamingMessages })` |
| `sendChannelAck` | 改为 `markConversationRead({ conversationId, conversationType })` |
| **新增** | 在 `conversationStore` 或 event-handler 中接收 `onConversationUpdate` 事件，增量更新会话列表 |
| **移除** | `conversationsLoaded` 标志逻辑（WebSocket 自动同步后不需要"已加载"状态） |

### 7.4 use-contact.ts

**文件**：`packages/uikit/src/composables/use-contact.ts`

| 操作 | 具体改动 |
|------|---------|
| `fetchContactCount` | `res.data?.length` → 直接读取返回值长度 |
| `fetchAllContacts` | `res.data` → 直接读取返回值（`ReadonlyArray<Contact>`） |
| `fetchContactsByPage` | `res.data?.contacts` → `res.contacts`（直接读取），`res.data?.cursor` → `res.cursor` |
| `loadMore` | 同 `fetchContactsByPage` 模式 |

### 7.5 use-blocklist.ts

**文件**：`packages/uikit/src/composables/use-blocklist.ts`

| 操作 | 具体改动 |
|------|---------|
| `refresh` | `client.value.getBlocklist()` 返回值直接使用 |

### 7.6 use-group.ts（WebSocket 驱动）

**文件**：`packages/uikit/src/composables/use-group.ts`

| 操作 | 具体改动 |
|------|---------|
| `refresh` | `getJoinedGroups({ pageSize, pageNum, needAffiliations, needRole })` → `getJoinedGroupList({ pageSize, needMemberCount, needRole })` |
| `loadMore` | 同上参数适配，改为 `getJoinedGroupList` 的分页模式 |
| `fetchJoinedGroupCount` | 适配新 SDK 轻量计数接口 |
| `fetchGroupDetails` | **整个方法删除**：新 SDK `getJoinedGroupList` 返回的 `GroupDetail` 已包含 avatar/owner 等完整字段 |
| `fetchGroupDetails` 调用点 | 移除 `refresh` / `loadMore` 中异步补全群详情的逻辑 |
| `mapSdkGroupItem` | 适配 `GroupDetail` 结构，字段名对齐新 SDK |

### 7.7 use-presence.ts

**文件**：`packages/uikit/src/composables/use-presence.ts`

| 操作 | 具体改动 |
|------|---------|
| `flushPending` 中的订阅/取状态 | 参数和返回值适配新 SDK `presenceManager` |
| `res?.data` 解包 | 移除，直接使用返回值 |

### 7.8 use-quote.ts

**文件**：`packages/uikit/src/composables/use-quote.ts`

| 操作 | 具体改动 |
|------|---------|
| `getQuotePreview` | `case 'txt'` → `case 'text'`；`'msg' in message` → `'content' in message`；`(message as unknown as { msg: string }).msg` → `message.content` |
| `buildQuoteExt` | `message.mid \|\| message.id` → `message.serverId \|\| message.id` |
| `MsgQuotePayload.msgType` | `'txt' \| 'img' \| ...` → `'text' \| 'image' \| 'voice' \| 'video' \| 'file' \| 'custom' \| 'location' \| 'cmd'` |

### 7.9 store/conversation.ts

**文件**：`packages/uikit/src/store/conversation.ts`

| 操作 | 具体改动 |
|------|---------|
| `Conversation` 类型 | 新增 `displayName?: string`、`avatarUrl?: string`、`remindType?: string`、`marks?: number[]` 字段 |

### 7.10 store/group.ts

**文件**：`packages/uikit/src/store/group.ts`

| 操作 | 具体改动 |
|------|---------|
| `Group` 类型 | 对齐 `GroupDetail` 新增字段（如 `allMuted`、`announcement` 等） |
| store actions | 新增 `incrementMemberCount`、`decrementMemberCount`、`markAdmin`、`unmarkAdmin`、`setMuted` 等方法供 event-handler 调用 |

---

## Task 8: 组件层 — 消息字段访问更新

所有 `.vue` 组件中直接引用旧 SDK 消息字段的地方需要更新。

### 8.1 `modules/chat/message-list/pinned-bar.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 8 | `import type { EasemobChat } from 'easemob-websdk'` | 删除该行 |
| 47 | `msg.type === 'txt'` | `msg.type === 'text'` |
| 48 | `(msg as EasemobChat.TextMsgBody).msg` | `msg.content` |
| 51 | `msg.type === 'img'` | `msg.type === 'image'` |
| 52 | `msg.type === 'audio'` | `msg.type === 'voice'` |
| 53 | `msg.type === 'video'` | 不变 |
| 54 | `msg.type === 'file'` | 不变 |

### 8.2 `modules/chat/message-input/editing-bar.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 6 | `import type { EasemobChat } from 'easemob-websdk'` | 删除该行 |
| 23 | `(props.message as EasemobChat.TextMsgBody).msg` | `props.message.content` |

### 8.3 `modules/chat/message-item/combine-message-modal.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 118 | `client.connection.downloadAndParseCombineMessage(...)` | `client.chatManager.downloadAndParseCombineMessage(...)` |
| 66 | `msg.time \|\| msg.timestamp` | `msg.timestamp` |

### 8.4 `modules/chat/message-item/text-message.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 58 | `props.message.msg` | `props.message.content` |
| 118 | `props.message.originalMsg` | `props.message.originalContent` |
| 211 | `props.message.msg` | `props.message.content` |

### 8.5 `modules/chat/message-item/image-message.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 42 | `msg.url \|\| msg.thumb` | `msg.url \|\| msg.thumbnailUrl` |
| 44 | `msg.thumb \|\| msg.url` | `msg.thumbnailUrl \|\| msg.url` |

### 8.6 `modules/chat/message-item/video-message.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 86-87 | `props.message.length` | `props.message.duration`（注意格式化逻辑可能需要适配单位） |

### 8.7 `modules/chat/message-item/voice-message.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 118 | `props.message.length` | `props.message.duration` |

### 8.8 `modules/chat/message-item/file-message.vue`

`props.message.filename` 和 `props.message.url` 保持不变（字段名未变）。

### 8.9 `modules/chat/message-item/message-bubble-wrapper.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 130 | `props.message.chatType` | `props.message.conversationType` |
| 150 | `props.message.chatType` | `props.message.conversationType` |
| 151 | `props.message.to` | 不变 |
| 179, 186 | `props.message.mid` | `props.message.serverId` |

### 8.10 `modules/chat/message-item/message-renderer.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 59 | `'msg' in message ? message.msg : ''` | `'content' in message ? message.content : ''` |

### 8.11 `modules/chat/message-list/message-list.vue`

`msg.timestamp` → 保持不变（新 `Message` 类型已使用 `timestamp` 字段名）。

### 8.12 `modules/chat/chat.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 112 | `message.type !== 'txt'` | `message.type !== 'text'` |
| 165 | `message.mid \|\| message.id` | `message.serverId \|\| message.id` |

### 8.13 `containers/chat-container/chat-container.story.vue`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 233 | `'msg' in message ? message.msg : ''` | `'content' in message ? message.content : ''` |

---

## Task 9: utils 层

### 9.1 format-message.ts

**文件**：`packages/uikit/src/utils/format-message.ts`

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 14 | `MESSAGE_TYPE.IMG` | `MESSAGE_TYPE.IMAGE` |
| 15 | `MESSAGE_TYPE.AUDIO` | `MESSAGE_TYPE.VOICE` |
| 16 | `MESSAGE_TYPE.VIDEO` | `MESSAGE_TYPE.VIDEO`（不变） |
| 17 | `MESSAGE_TYPE.FILE` | `MESSAGE_TYPE.FILE`（不变） |
| 18 | `MESSAGE_TYPE.CMD` | `MESSAGE_TYPE.CMD`（不变） |
| 19 | `MESSAGE_TYPE.CUSTOM` | `MESSAGE_TYPE.CUSTOM`（不变） |
| 20 | `MESSAGE_TYPE.LOC` | `MESSAGE_TYPE.LOCATION` |
| 23 | `MESSAGE_TYPE.TXT` | `MESSAGE_TYPE.TEXT` |

---

---

## Task 10: 初始化登录验证（里程碑）

**目标**：验证 SDK 5.x 初始化、登录、登出流程完整可用。

### 10.1 验证步骤

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | `cd apps/demo && pnpm dev` 启动 demo | 页面正常加载，无控制台报错 |
| 2 | 输入账号密码点击登录 | `client.login()` 成功，触发 `onConnected` |
| 3 | 观察登录后状态 | `clientStore.connected === true`，`currentUser` 已设置 |
| 4 | 点击登出 | `client.logout()` 成功，触发 `onDisconnected`，状态清空 |
| 5 | 重复登录-登出 3 次 | 无内存泄漏，无重复事件注册 |

### 10.2 常见问题排查

| 现象 | 可能原因 | 排查方向 |
|------|---------|---------|
| 登录无响应 | `ChatClient.init` 参数错误 | 检查 `appKey`、`managers` 数组 |
| `onConnected` 未触发 | 事件注册到旧 connection | 确认使用 `client.addEventHandler` 而非 `connection.addEventHandler` |
| 登出后状态未清空 | `onDisconnected` 未正确处理 | 检查 `use-client.ts` 中是否调用 `clientStore.setConnected(false)` |

**验证**：登录-登出流程稳定可用，无控制台报错。
**用户确认**后方可继续后续功能扩展（消息收发、会话列表、联系人等）。

---

## Task 11: 全局验证

完成所有代码修改后：

1. **TypeScript 编译**：`cd packages/uikit && npx vue-tsc --noEmit`，修复所有类型错误
2. **Vite 构建**：`cd packages/uikit && pnpm build`，确保 UMD + ES 双格式构建通过
3. **Demo 运行**：`cd apps/demo && pnpm dev`，验证登录、收发消息、会话列表等核心流程
4. **Storybook**：`cd packages/uikit && pnpm story:dev`，验证组件文档正常渲染

---

## 文件改动汇总

| 层级 | 文件 | 改动量估计 |
|------|------|-----------|
| 构建 | `package.json` | 1 行 |
| 构建 | `vite.config.ts` | 2 行 |
| 常量 | `constants/index.ts` | ~15 行 |
| Store | `store/message.ts` | ~100 行（类型重定义 + 方法字段替换） |
| Store | `store/conversation.ts` | ~10 行（新增字段） |
| Store | `store/group.ts` | ~30 行（新增字段 + actions） |
| SDK | `sdk/types.ts` | ~30 行（类型替换） |
| SDK | `sdk/client.ts` | ~200 行（核心重写） |
| SDK | `sdk/event-handler.ts` | ~250 行（核心重写） |
| Composable | `use-client.ts` | ~20 行 |
| Composable | `use-chat.ts` | ~80 行（字段批量替换 + 创建消息重构） |
| Composable | `use-conversation.ts` | ~40 行（SessionList 适配） |
| Composable | `use-contact.ts` | ~15 行（去 .data） |
| Composable | `use-blocklist.ts` | ~5 行 |
| Composable | `use-group.ts` | ~40 行（去 fetchGroupDetails + API 适配） |
| Composable | `use-presence.ts` | ~10 行 |
| Composable | `use-quote.ts` | ~15 行 |
| 组件 | 13 个 .vue 文件 | 每文件 2-5 行 |
| Utils | `format-message.ts` | ~8 行 |

**总改动量**：约 900 行增删改，涉及 ~31 个文件。
