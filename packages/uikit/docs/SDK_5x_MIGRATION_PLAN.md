# UIKit SDK 5.x 迁移计划与文档

> 本文档记录从 `easemob-websdk@4.x` 迁移到 `im-sdk-web@5.x`（即将发布的 5.x SDK）的完整方案与实施状态。
> 
> **注意**：新 SDK 开发包名为 `im-sdk-web`，正式发布后可能恢复为 `easemob-websdk@5.x`。

---

## 一、架构变更概述

| 维度 | 旧 SDK (4.x) | 新 SDK (5.x) |
|------|-------------|-------------|
| 入口 | `new WebIM.connection({ appKey })` | `ChatClient.init({ appKey, managers: [...] })` |
| API 挂载 | 所有 API 挂在 `connection` 实例上 | 按功能分散到各 Manager（chatManager/contactManager/groupManager 等） |
| 消息创建 | `WebIM.message.create({ type, to, chatType, ... })` | `chatManager.createTextMessage({ conversationId, conversationType, content })` |
| 消息发送 | `connection.send(msg)` | `chatManager.sendMessage(msg)` |
| 会话标识 | `to` + `chatType` | `conversationId` + `conversationType` |
| 返回值 | `Promise<AsyncResult<T>>` 包装 | 直接返回 `Promise<T>` |
| 事件系统 | 按消息类型分事件（onTextMessage/onImageMessage...） | 统一 `onMessage` + 独立群组/聊天室事件名 |
| 消息结构 | 扁平结构（`type: 'txt'`, `msg: '...'`） | 嵌套结构（`type: 'text'`, `body: { content: '...' }`） |
| 类型安全 | 弱类型，大量 `any` | TypeScript strict，完整类型推导 |
| 模块化 | 全量引入 | 按需注册 Manager，支持 tree-shaking |

### Manager 对照表

| 旧 SDK（conn 上的方法） | 新 SDK Manager |
|------------------------|----------------|
| `conn.send` / `WebIM.message.create` | `client.chatManager` |
| `conn.getContacts` / `conn.addContact` 等 | `client.contactManager` |
| `conn.createGroup` / `conn.getGroupInfo` 等 | `client.groupManager` |
| `conn.publishPresence` / `conn.subscribePresence` 等 | `client.presenceManager` |

---

## 二、迁移策略

### 2.1 核心原则：直接对接 5.x 原生接口

UIKit 上层代码（composables、components、stores）全面直接对接 `im-sdk-web@5.x` 原生接口，不保留任何 `easemob-websdk@4.x` 兼容层：

- **下行（接收）**：新 SDK `Message`（嵌套 `body` 结构）直接在 `event-handler.ts` 和各模块中提取字段，构造 UIKit 独立的 `Message` 类型
- **上行（发送）**：各模块直接调用新 SDK `createXxxMessage` / `sendMessage` 等原生方法，参数按 5.x 规范构造
- **类型定义**：`store/message.ts` 中 `Message` 类型完全独立定义，不再继承或依赖 SDK 类型

### 2.2 消息格式映射

| 旧 SDK 字段 | 新 SDK 字段 | 说明 |
|------------|------------|------|
| `type: 'txt'` | `type: 'text'` | 文本 |
| `type: 'img'` | `type: 'image'` | 图片 |
| `type: 'audio'` | `type: 'voice'` | 语音 |
| `type: 'video'` | `type: 'video'` | 视频 |
| `type: 'file'` | `type: 'file'` | 文件 |
| `type: 'loc'` | `type: 'location'` | 位置 |
| `type: 'custom'` | `type: 'custom'` | 自定义 |
| `type: 'cmd'` | `type: 'cmd'` | 命令 |
| `type: 'combine'` | `type: 'combine'` | 合并 |
| `msg` | `body.content` | 文本内容 |
| `url` | `body.url` / `body.originalImageUrl` | 文件/图片地址 |
| `thumb` | `body.thumbnailUrl` | 缩略图 |
| `secret` | `body.secret` | 下载密钥 |
| `filename` | `body.filename` | 文件名 |
| `length` | `body.duration` | 语音/视频时长 |
| `width` / `height` | `body.width` / `body.height` | 宽高 |
| `id` | `msgServerId` | 服务器消息 ID |
| `chatType` | `conversationType` | 会话类型 |
| `time` | `timestamp` | 时间戳 |
| `from`, `to`, `ext` | 同名 | 保持不变 |

---

## 三、文件改动清单

### 3.1 配置层

| 文件 | 改动内容 |
|------|----------|
| `packages/uikit/package.json` | 依赖 `easemob-websdk` → `im-sdk-web`（本地路径引用） |
| `packages/uikit/vite.config.ts` | external 和 globals 更新 |

### 3.2 SDK 层（核心）

| 文件 | 改动内容 |
|------|----------|
| `packages/uikit/src/sdk/types.ts` | 类型定义全面替换为新 SDK 类型 |
| `packages/uikit/src/sdk/client.ts` | `UIKitClient` 重构：包装 `ChatClient` 而非 `Connection` |
| `packages/uikit/src/sdk/event-handler.ts` | 事件系统重写：按 Manager 分离注册，统一 `onMessage` + 字段提取构造 UI `Message` |

### 3.3 Store 层

| 文件 | 改动内容 |
|------|----------|
| `packages/uikit/src/store/message.ts` | `Message` 类型重新定义，不再依赖旧 SDK `ExcludeAckMessageBody` |

### 3.4 Composables 层

| 文件 | 改动内容 |
|------|----------|
| `packages/uikit/src/composables/use-client.ts` | 登录/登出 API 适配，移除 `AsyncResult.data` 解包 |
| `packages/uikit/src/composables/use-chat.ts` | 消息发送 API 适配，移除 `WebIM.message.create` 调用 |
| `packages/uikit/src/composables/use-conversation.ts` | 会话 API 适配（getConversationList/setConversationPinned 等） |
| `packages/uikit/src/composables/use-contact.ts` | 联系人 API 适配（contactManager.getContacts 等） |
| `packages/uikit/src/composables/use-blocklist.ts` | 黑名单 API 适配（contactManager.getBlocklist 等） |
| `packages/uikit/src/composables/use-group.ts` | 群组 API 适配（groupManager.getJoinedGroupList 等） |
| `packages/uikit/src/composables/use-presence.ts` | Presence API 适配（presenceManager.subscribePresence 等） |

### 3.5 组件层（仅类型引用）

| 文件 | 改动内容 |
|------|----------|
| `pinned-bar.vue` | `EasemobChat.TextMsgBody` → 新文本消息类型 |
| `editing-bar.vue` | `EasemobChat.TextMsgBody` → 新文本消息类型 |
| `combine-message-modal.vue` | `client.connection.downloadAndParseCombineMessage` → `client.chatManager.downloadAndParseCombineMessage` |

---

## 四、关键 API 变更详情

### 4.1 初始化

```typescript
// 旧 SDK
import WebIM from 'easemob-websdk'
const conn = new WebIM.connection({ appKey, isHttpDNS: true, delivery: true })

// 新 SDK
import { ChatClient, ChatManager, ContactManager, GroupManager, PresenceManager } from 'im-sdk-web'
const client = ChatClient.init({
  appKey,
  enableDeliveryReceipt: true,
  managers: [ChatManager, ContactManager, GroupManager, PresenceManager],
})
```

### 4.2 登录/登出

```typescript
// 旧 SDK
await conn.open({ user: 'userId', accessToken: 'token' })
conn.close()

// 新 SDK
await client.login({ userId: 'userId', token: 'token' })
await client.logout()
```

### 4.3 消息创建与发送

```typescript
// 旧 SDK
const msg = WebIM.message.create({ type: 'txt', to: 'user2', chatType: 'singleChat', msg: 'Hello!' })
const result = await conn.send(msg)

// 新 SDK
const msg = client.chatManager.createTextMessage({
  conversationId: 'user2',
  conversationType: 'singleChat',
  content: 'Hello!',
})
const sentMsg = await client.chatManager.sendMessage(msg)
```

### 4.4 事件注册

```typescript
// 旧 SDK
conn.addEventHandler('handler', {
  onTextMessage: (msg) => {},
  onImageMessage: (msg) => {},
  onConnected: () => {},
})

// 新 SDK
client.addEventHandler('conn', {
  onConnected: () => {},
  onDisconnected: () => {},
})
client.chatManager.addEventHandler('chat', {
  onMessage: (msg) => {},
  onMessageRead: (payload) => {},
  onMessageRecalled: (payload) => {},
})
```

### 4.5 会话 API

```typescript
// 旧 SDK
await conn.getServerConversations({ pageSize: 50 })
await conn.pinConversation({ conversationId, conversationType, isPinned })
await conn.deleteConversation({ channel, chatType, deleteRoam })

// 新 SDK
await client.chatManager.getConversationList({ pageSize: 50 })
await client.chatManager.setConversationPinned({ conversationId, conversationType, pinned: true })
await client.chatManager.deleteConversation({ conversationId, conversationType, deleteRoamingMessages })
```

### 4.6 联系人 API

```typescript
// 旧 SDK
await conn.getAllContacts()
await conn.addContact(userId, reason)
await conn.getBlocklist()

// 新 SDK
client.contactManager.getContacts() // 返回 ReadonlyArray<Contact>
await client.contactManager.addContact({ userId, message: reason })
await client.contactManager.getBlocklist() // 返回 ReadonlyArray<UserInfo>
```

### 4.7 群组 API

```typescript
// 旧 SDK
await conn.getJoinedGroups({ pageSize, pageNum, needAffiliations, needRole })
await conn.getGroupInfo({ groupId })

// 新 SDK
await client.groupManager.getJoinedGroupList({ pageSize, needMemberCount, needRole })
await client.groupManager.getGroupInfo({ groupId })
```

---

## 五、返回值变更处理

旧 SDK 所有 REST API 返回 `Promise<AsyncResult<T>>`，需要通过 `.data` 访问实际数据。新 SDK 直接返回 `Promise<T>`。

UIKit 中大量代码使用 `res?.data?.conversations`、`res?.data?.contacts` 等模式，迁移后需要去掉 `.data` 解包。

**示例**：
```typescript
// 旧 SDK（需要 .data）
const res = await client.getServerConversations()
const list = res.data.conversations

// 新 SDK（直接返回）
const page = await client.chatManager.getConversationList()
const list = page.items
```

---

## 六、错误处理变更

旧 SDK 错误通过 `onError` 事件或 Promise reject 返回松散对象。新 SDK 使用类型化错误类：

```typescript
import { SDKError, ValidationError, ConnectionError } from 'im-sdk-web'

try {
  await client.chatManager.sendMessage(msg)
} catch (error) {
  if (error instanceof SDKError) {
    console.error(error.code, error.message)
  }
}
```

UIKit 内部目前主要使用 `console.warn` / `console.error` 处理错误，无需大规模改动错误处理逻辑。

---

## 七、已移除 API 的替代方案

| 旧 API | 替代方案 |
|--------|----------|
| `WebIM.message.create({ type: 'read' })` | `chatManager.sendMessageReadAck()` |
| `WebIM.message.create({ type: 'channel' })` | `chatManager.markConversationRead()` |
| `conn.getGroupMsgReadUser()` | `chatManager.getGroupMessageReadUsers()` |
| `conn.isOpened()` | `client.getConnectionState()` |

---

## 八、迁移状态

| 模块 | 状态 |
|------|------|
| 迁移计划文档 | ✅ 已完成 |
| package.json / vite.config.ts | ✅ 已更新 |
| sdk/types.ts | ✅ 已更新 |
| sdk/normalize-message.ts | ✅ 已新增（纯函数：统一提取 SDK Message 字段构造 UI Message） |
| sdk/client.ts | ✅ 已重构 |
| sdk/event-handler.ts | ✅ 已重构 |
| store/message.ts | ✅ 已更新 |
| composables/use-client.ts | ✅ 已更新 |
| composables/use-chat.ts | ✅ 已更新 |
| composables/use-conversation.ts | ✅ 已更新 |
| composables/use-contact.ts | ✅ 已更新 |
| composables/use-blocklist.ts | ✅ 已更新 |
| composables/use-group.ts | ✅ 已更新 |
| composables/use-presence.ts | ✅ 已更新 |
| 组件层类型引用 | ✅ 已更新 |

---

## 九、后续注意事项

1. **包名切换**：当前使用 `im-sdk-web` 作为开发依赖，正式发布后需根据实际包名调整
2. **Message 类型**：UIKit 内部 `Message` 类型已重构为独立定义，不再依赖 SDK 的 `ExcludeAckMessageBody`
3. **事件监听**：连接事件仍通过 `client.addEventHandler` 监听；消息/会话事件需通过 `client.chatManager.addEventHandler` 监听
4. **返回值**：所有 API 调用已移除 `AsyncResult` 的 `.data` 解包
5. **调试**：新 SDK 使用 `logger.setLevel()` 替代 `isDebug = true`
