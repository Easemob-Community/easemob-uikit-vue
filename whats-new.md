# 新 SDK 相对旧 SDK 的变化与使用方式

本文面向从旧版 `easemob-websdk` 迁移到新 SDK 的开发者，也可作为新 SDK 培训提纲。新 SDK 不只是重命名 API，而是重新组织了初始化、数据同步、缓存读取、事件和领域对象的使用方式。

## 一、先建立新的使用模型

旧 SDK 的大多数能力直接挂在 `conn` 上，联系人、会话和已加入群组通常由业务主动调用 REST API 拉取。新 SDK 将能力拆分到不同 Manager，并在登录后按配置同步常用数据，再通过同步方法读取本地快照。

| 维度     | 旧 SDK                                           | 新 SDK                                                                            |
| -------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| 主入口   | `new SDK.connection({ appKey })`                 | `ChatClient.init({ appKey, managers })`                                           |
| API 组织 | 所有方法集中在 `conn`                            | 按领域拆分为 `ChatManager`、`ContactManager`、`GroupManager` 等                   |
| 列表数据 | 业务调用 REST API 拉取并处理分页结果             | 登录同步、缓存恢复和事件增量更新共同维护本地快照                                  |
| 列表读取 | 通常是异步网络请求                               | `getConversationList()`、`getContacts()`、`getJoinedGroupList()` 同步读取本地数据 |
| 消息创建 | `WebIM.message.create({ type, ... })`            | `chatManager.createXxxMessage()`                                                  |
| 事件     | 消息按类型分散，群组/聊天室通过 `operation` 聚合 | 消息统一为 `onMessage`，领域事件拆成独立事件名                                    |
| 返回值   | 常见 `Promise<AsyncResult<T>>` 服务端包装        | 直接返回业务对象，失败抛出类型化错误                                              |

迁移时最重要的观念是：

> 新 SDK 的本地列表读取方法不等于旧 SDK 的服务端列表请求。先监听同步事件，再登录；页面从本地快照取数，并通过事件持续刷新。

## 二、推荐的完整初始化方式

### 1. 注册需要的 Manager

新 SDK 通过 Manager 提供领域能力。只注册业务实际需要的模块：

```typescript
import { ChatClient } from 'easemob-websdk';
import { ChatManager } from 'easemob-websdk/managers/chat';
import { ContactManager } from 'easemob-websdk/managers/contact';
import { GroupManager } from 'easemob-websdk/managers/group';
import { UserInfoManager } from 'easemob-websdk/managers/user-info';

const client = ChatClient.init({
  appKey: 'org#app',
  managers: [ChatManager, ContactManager, GroupManager, UserInfoManager],
  enableSyncData: ['conversation', 'contact', 'group'],
});
```

也可以先初始化，再通过 `use()` 链式注册：

```typescript
const client = ChatClient.init({ appKey: 'org#app' })
  .use(ChatManager)
  .use(ContactManager)
  .use(GroupManager)
  .use(UserInfoManager);
```

Manager 注册决定运行时可使用哪些能力。配合独立子路径导入和构建工具的 tree-shaking，可减少业务最终包体积；实际包体结果应以业务构建产物为准。

### 2. 配置登录后自动同步的数据

`enableSyncData` 控制登录后自动同步的数据类型：

```typescript
// 默认值：只同步会话
enableSyncData: ['conversation'];

// 同步会话、联系人和已加入群组
enableSyncData: ['conversation', 'contact', 'group'];

// 关闭全部登录自动同步
enableSyncData: [];
```

注意：传入的数组会替换默认值，不是在默认 `['conversation']` 上追加。例如 `enableSyncData: ['contact']` 表示只开启联系人同步，不再自动同步会话。

依赖关系如下：

| 同步类型       | 需要注册的 Manager                  | 说明                                                              |
| -------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `conversation` | `ChatManager`                       | 同步链路可由 ChatClient 执行；业务通过 ChatManager 读取和刷新会话 |
| `contact`      | `ContactManager`、`UserInfoManager` | 联系人快照包含用户资料投影，需要用户资料读取能力                  |
| `group`        | `GroupManager`                      | 同步当前用户已加入群组的轻量摘要                                  |

### 3. 在登录前注册事件

自动同步发生在登录流程中或登录尾部。同步监听器应在调用 `login()` 之前注册，否则可能错过事件。

```typescript
client.addEventHandler('initial-data-sync', {
  onSyncDataStart: ({ dataType }) => {
    console.log(`${dataType} 同步开始`);
  },

  onSyncDataFinished: payload => {
    if (payload.status === 'failed') {
      console.warn(`${payload.dataType} 同步失败`, payload.error);
      return;
    }

    switch (payload.dataType) {
      case 'conversation':
        renderConversations(client.chatManager.getConversationList());
        break;
      case 'contact':
        renderContacts(client.contactManager.getContacts());
        break;
      case 'group':
        renderGroups(client.groupManager.getJoinedGroupList());
        break;
    }
  },

  onConversationListUpdate: ({ items, source }) => {
    renderConversations(items);
    console.log('会话列表更新来源:', source);
  },
});

await client.login({
  userId: 'alice',
  token: 'your-im-token',
});
```

## 三、登录成功和业务数据就绪不是同一件事

新 SDK 登录流程大致如下：

```text
建立主消息 WebSocket
        ↓
恢复当前账号的本地缓存
        ↓
按配置同步当前用户资料
        ↓
同步会话列表（login 等待本轮结束）
        ↓
异步触发联系人同步 ─┐
                    ├─ login 返回
异步触发群组同步 ───┘
```

业务侧需要区分以下状态：

- `onConnected`：主消息连接已建立。
- `await client.login()` 完成：登录主流程完成，会话同步已经成功、失败或完成兼容降级。
- `onSyncDataFinished({ dataType: 'contact' })`：联系人本轮同步真正结束。
- `onSyncDataFinished({ dataType: 'group' })`：已加入群组本轮同步真正结束。

因此，联系人页或群组页不能只依赖 `await login()` 判断最新数据已经就绪。推荐先读取可用缓存渲染首屏，再在对应同步完成事件中刷新。

同步失败通常不等于登录失败，也不等于本地没有可用数据：

```typescript
client.addEventHandler('sync-errors', {
  onSyncDataFinished: payload => {
    if (payload.status === 'success') return;

    console.warn('同步失败', {
      dataType: payload.dataType,
      code: payload.error?.code,
      stage: payload.error?.stage,
      retryable: payload.error?.retryable,
    });

    // 刷新失败时仍可展示上一次完整快照或冷启动缓存
    if (payload.dataType === 'contact') {
      renderContacts(client.contactManager.getContacts());
    }
  },
});
```

UI 应区分“有缓存但刷新失败”和“首次登录且没有任何可用数据”，不要在同步失败时直接清空列表。

## 四、会话、联系人和群组的同步变化

### 1. 会话：从 REST 分页结果改为本地会话快照

旧 SDK 主要通过 `getServerConversations({ pageSize, cursor })` 从 REST 获取会话。新 SDK 默认在登录时同步会话列表，并维护当前账号的本地会话快照。

```typescript
// 同步读取当前本地会话快照，不发起网络请求
const conversations = client.chatManager.getConversationList();

// 本地过滤置顶会话
const pinned = client.chatManager.getConversationList({
  isPinned: true,
});

// 本地过滤指定 mark
const marked = client.chatManager.getConversationList({
  mark: 3,
});


```

会话同步使用短生命周期的 sync WebSocket。同步请求完成后该通道会关闭，并不是一条永久推送会话列表的连接。初始同步之后，SDK 会根据以下信息继续修补本地列表：

- 收到或发送消息；
- 会话、消息和多设备通知；
- 删除、置顶、标记等本地操作；
- 调用 `refreshSessionList()` 主动刷新。

会话 UI 应以 `onConversationListUpdate` 携带的完整 `ConversationItem[]` 快照作为主要事件数据源。`onSyncDataFinished` 只表示一轮同步已经结束，仍需检查 `status`：

```typescript
client.addEventHandler('conversation-list', {
  onSyncDataFinished: payload => {
    if (payload.dataType === 'conversation' && payload.status === 'success') {
      console.log('会话服务端校准完成');
    }
  },

  onConversationListUpdate: ({ items }) => {
    renderConversations(items);
  },
});
```

### 2. 联系人：从手动 REST 拉取改为版本化快照同步

旧 SDK 的 `getContacts()`、`getAllContacts()` 和 `getContactsWithCursor()` 会发起服务端请求。新 SDK 登录后会根据服务端版本、缓存版本和缓存完整性，选择全量同步、增量同步或跳过本轮同步。

```typescript
const contacts = client.contactManager.getContacts();
// ReadonlyArray<Contact>，同步读取，不返回 Promise
```

联系人快照包含联系人关系和用户资料投影，典型字段包括：

- `userId`：联系人用户 ID；
- `remark`：联系人备注；
- `addTs`：关系建立时间；
- `userInfo`：昵称、头像、扩展信息等资料摘要。

好友增删、备注修改和联系人通知会继续修补当前本地快照。同步失败时 SDK 会尽量保留上一份完整快照，不把同步半包提交成最新结果。

联系人同步完成事件不直接携带联系人数组，业务应在成功事件后调用 `getContacts()`：

```typescript
client.addEventHandler('contact-list', {
  onSyncDataFinished: payload => {
    if (payload.dataType === 'contact' && payload.status === 'success') {
      renderContacts(client.contactManager.getContacts());
    }
  },
});
```

### 3. 已加入群组：登录全量同步轻量群组摘要

旧 SDK 使用 `getJoinedGroups({ pageNum, pageSize, ... })` 发起 REST 分页请求。新 SDK 可在登录后通过第二同步通道全量校准当前用户的已加入群组列表：

```typescript
const client = ChatClient.init({
  appKey: 'org#app',
  managers: [GroupManager],
  enableSyncData: ['group'],
});

// 同步读取当前本地已加入群组列表，不发起网络请求
const groups = client.groupManager.getJoinedGroupList();
```

`getJoinedGroupList()` 的返回值是 `ReadonlyArray<JoinedGroupSummary>`，表示群组轻量摘要，不等于完整 `GroupDetail`。它不承诺包含成员列表、管理员、黑名单、白名单、公告、共享文件、成员属性或所有群配置。

需要完整详情时应显式请求：

```typescript
const group = client.groupManager.getGroup('group-1');

// getGroup() 只返回群实体，不自动请求完整详情
const detail = await group.getDetail();
const members = await group.getMembers({
  pageSize: 20,
  cursor: '',
});
```

群组快照还需要注意以下边界：

- 每次启用群组同步的登录都会执行全量校准，而不是用上次完成时间跳过全量。
- 当前同步协议单轮最多返回 3000 个群组，超过时结果会被视为受限或不完整。
- 当前登录会话在内存中保存本轮可用结果。
- localStorage 只保存最多 100 个轻量群组预览，用于下次冷启动首屏；这 100 个不代表完整群组列表。
- 完整同步成功后，新快照替换旧的已加入群集合。
- 同步失败、取消或只收到半包时，不会用不完整结果覆盖上一份可用快照。
- 入群、退群、被踢、群解散和群资料变更等 MUC 事件会继续修补运行时列表和本地预览。

## 五、消息模型和发送方式变化

### 1. 每种消息使用独立创建方法

旧 SDK 使用统一工厂，所有类型共用宽泛参数：

```typescript
const message = WebIM.message.create({
  type: 'txt',
  to: 'user2',
  chatType: 'singleChat',
  msg: 'hello',
});
```

新 SDK 为每种消息提供独立方法，TypeScript 可以准确检查必填字段：

```typescript
const message = client.chatManager.createTextMessage({
  conversationId: 'user2',
  conversationType: 'singleChat',
  content: 'hello',
});

const sentMessage = await client.chatManager.sendMessage(message);
```

常见字段迁移如下：

| 旧 SDK              | 新 SDK                       |
| ------------------- | ---------------------------- |
| `to`                | `conversationId`             |
| `chatType`          | `conversationType`           |
| 文本消息 `msg`      | `content`                    |
| 语音/视频 `length`  | `duration`                   |
| 文件 `filename`     | `fileName`                   |
| 位置 `lat/lng/addr` | `latitude/longitude/address` |

`conversationType` 使用 `'singleChat'`、`'groupChat'`、`'chatRoom'`。

### 2. 发送状态、送达和已读分开表达

新 SDK 不再把多个阶段混在单一状态字段中：

- `message.sendStatus`：本地发送阶段，值为 `sending | sent | failed`；
- `onMessageDelivered`：对端 SDK 已收到单聊消息；
- `onMessageReadReceipts`：消息已读回执；
- `message.isPeerRead`：单聊发送消息的对端已读状态；
- `message.groupReadCount`：群聊消息累计已读人数。

送达回执需要接收方初始化时开启：

```typescript
const client = ChatClient.init({
  appKey: 'org#app',
  enableDeliveryReceipt: true,
});
```

### 3. 会话未读清零不再通知对端

旧 SDK 在单聊中发送 `channel ack` 时会把 ACK 发送给会话对端，对方可能收到旧的 `onConversationRead` 语义。新 SDK 将“清空自己的会话未读数”和“通知消息发送方已读”拆成两个独立操作。

`clearConversationUnreadMessageCount()` 底层仍复用 `CHANNEL_ACK`，但固定设置 `send_to_peer = false`：

```typescript
await client.chatManager.clearConversationUnreadMessageCount({
  conversationId: 'user-2',
  conversationType: 'singleChat',
});
```

该操作只处理当前用户自己的会话阅读状态：

- 清空本机会话的 `unreadCount`；
- 更新本机会话的 `readAt`；
- 本地快照变化时触发 `onConversationListUpdate`；
- 同步给当前账号的其他在线设备，其他设备通过 `onMultiDeviceConversation` 收到 `CONVERSATION_UNREAD_MESSAGE_COUNT_CLEARED`；
- 不向会话对端发送 ACK，对端不再收到旧的 `onConversationRead` 语义。

如果业务确实需要通知消息发送方“这些消息已经被阅读”，应显式调用消息已读回执 API：

```typescript
await client.chatManager.sendMessageReadReceipts({
  conversationId: 'user-2',
  conversationType: 'singleChat',
  messageIds: ['message-1'],
});
```

`sendMessageReadReceipts()` 会让原消息发送方收到 `onMessageReadReceipts`，但不会直接修改调用方的 `unreadCount`，也不会推进会话 `readAt`。如果页面既要清空自己的未读数，又要通知对方消息已读，需要根据业务需要分别调用两个 API。

| 操作                                       | 清理本地未读 | 同步当前账号其他设备 | 通知会话对端/原消息发送方 |
| ------------------------------------------ | ------------ | -------------------- | ------------------------- |
| `clearConversationUnreadMessageCount()`    | 是，指定会话 | 是                   | 否                        |
| `clearAllConversationUnreadMessageCount()` | 是，全部会话 | 是                   | 否                        |
| `sendMessageReadReceipts()`                | 否           | 否                   | 是                        |

### 4. 附件上传由 SDK 编排

Web、各类小程序和 React Native 通过统一平台适配层接入附件上传。业务创建图片、语音、视频或文件消息后，`sendMessage()` 会完成上传和消息发送编排。

```typescript
const message = client.chatManager.createImageMessage({
  conversationId: 'user2',
  conversationType: 'singleChat',
  file: imageFile,
});

await client.chatManager.sendMessage(message, {
  onFileUploadProgress: progress => {
    console.log(progress.loaded, progress.total);
  },
});
```

当前支持上传进度回调，但不支持暂停后继续、跨会话恢复或真正的断点续传。

## 六、事件系统变化

### 1. 消息事件统一

旧 SDK 按消息类型提供 `onTextMessage`、`onImageMessage` 等回调。新 SDK 统一为 `onMessage`，再通过 `message.type` 做类型收窄：

```typescript
client.addEventHandler('messages', {
  onMessage: message => {
    switch (message.type) {
      case 'text':
        console.log(message.body.content);
        break;
      case 'image':
        console.log(message.body.url);
        break;
    }
  },
});
```

### 2. 群组和聊天室事件拆分

旧 SDK 将大量群组/聊天室事件聚合到 `onGroupEvent` 或 `onChatroomEvent`，业务需要检查 `event.operation`。新 SDK 将常用事件拆成独立事件名，每个事件拥有更精确的载荷类型：

```typescript
client.groupManager.addEventHandler('group-events', {
  onMembersJoined: event => {
    console.log(event.groupId, event.members);
  },
  onUserRemoved: event => {
    console.log(event.groupId);
  },
});
```

每个公开事件的 JSDoc 会说明触发时机和接收方。联系人、群组和聊天室的领域事件可通过相应 Manager 注册；`onSyncDataStart`、`onSyncDataFinished` 等统一同步事件应通过 ChatClient 注册。

### 3. 多设备事件按领域拆分

旧 SDK 的单一 `onMultiDeviceEvent` 被拆分为：

- `onMultiDeviceContact`；
- `onMultiDeviceGroup`；
- `onMultiDeviceThread`；
- `onMultiDeviceConversation`；
- `onMultiDeviceMessageRemoved`。

业务不再需要在一个宽泛事件中判断所有多设备操作类型。

## 七、Manager API 和实体 API 并存

新 SDK 对群组、聊天室和 Chat Thread 提供两种调用风格。

Manager 平铺风格适合状态管理和批量操作：

```typescript
await client.groupManager.muteGroupMembers({
  groupId: 'group-1',
  userIds: ['user-2'],
  duration: 60_000,
});
```

实体风格适合围绕同一个对象连续操作：

```typescript
const group = client.groupManager.getGroup('group-1');

await group.muteMembers({
  userIds: ['user-2'],
  duration: 60_000,
});

const muteList = await group.getMuteList({ pageSize: 20 });
const announcement = await group.getAnnouncement();
```

两种风格可以并存。需要注意，`getGroup()`、`getChatRoom()` 等方法通常只返回实体 facade，不代表已经从服务端加载完整详情。

## 八、类型安全、返回值和错误模型

### 1. TypeScript strict

新 SDK 使用 TypeScript strict 模式，公开 API 的参数、返回值和事件载荷均提供明确类型。非法字段可在编译阶段被发现，而不是等到运行时请求失败。

```typescript
client.chatManager.createTextMessage({
  conversationId: 'user2',
  conversationType: 'singleChat',
  content: 'hello',
});
```

### 2. 直接返回业务对象

旧 SDK 常把服务端 `{ type, data, entities, cursor }` 等包装直接返回。新 SDK 对服务端字段进行标准化，公开字段统一使用 camelCase，并直接返回业务对象：

```typescript
const detail = await client.groupManager.getGroupInfo({
  groupId: 'group-1',
});

console.log(detail.groupId, detail.name);
```

### 3. 统一错误类和错误码

| 错误类                                | 典型场景                  |
| ------------------------------------- | ------------------------- |
| `ValidationError`                     | 本地参数或依赖校验失败    |
| `ConnectionError`                     | 连接状态或 WebSocket 问题 |
| `AuthenticationError`                 | Token 或认证失败          |
| `NetworkError` / `RestTransportError` | REST 网络和传输失败       |
| `SDKError` / `RestBusinessError`      | 服务端业务错误            |
| `MessageSendError`                    | 消息发送失败              |
| `StorageError`                        | 本地缓存读写失败          |

```typescript
try {
  await client.chatManager.sendMessage(message);
} catch (error) {
  if (error instanceof ValidationError) {
    // 本地参数问题，修正参数后再调用
  } else if (error instanceof SDKError) {
    console.log(error.code, error.details);
  }
}
```

REST 服务端业务错误会按 operation 映射为稳定的 SDK 错误码。业务应主要根据 `error.code` 决策，`details` 用于诊断，不应依赖原始 HTTP 包装结构。

## 九、用户资料订阅与消息资料补齐

旧 SDK 的用户资料主要依靠业务主动调用 `fetchUserInfoById`。新 SDK 使用 `UserInfoManager` 提供资料读取、订阅和变更事件：

```typescript
await client.userInfoManager.subscribeUsersInfo({
  userIds: ['user-1', 'user-2'],
});

client.addEventHandler('user-info', {
  onUserInfoUpdated: users => {
    console.log('订阅的用户资料发生变化', users);
  },
});
```

启用 `enableUserInfoSync` 后，SDK 还会在消息链路中补齐发送者资料，并结合联系人备注、用户资料和群名片更新会话展示信息。用户资料同步与 `enableSyncData` 是不同配置：前者控制资料增强，后者控制会话、联系人和群组列表的登录同步。

## 十、统一跨平台适配层

旧 SDK 的 Web、小程序等运行时存在不同入口和分叉实现。新 SDK 通过 `PlatformAdapter` 统一封装：

- 网络请求；
- WebSocket；
- 本地存储；
- 文件读取与附件上传；
- 图片预处理；
- 运行时和设备信息。

SDK 会根据运行时检测 Web、各类小程序、React Native、Electron 等环境，也允许业务通过 `platformAdapterOptions` 覆盖平台能力。

跨平台统一表示核心调用形式一致，但传入的文件对象仍取决于平台，例如 Web `File`、小程序文件描述和 React Native URI 文件对象。

## 十一、Token 和 RTC 能力

新 SDK 使用 Token 登录，不再支持密码登录：

```typescript
await client.login({
  userId: 'alice',
  token: 'im-token',
});
```

`renewToken()` 会返回新 Token 及其过期时间：

```typescript
const result = await client.renewToken(newToken);
console.log(result.token, result.expireAt);
```

ChatClient 还提供 RTC Token 和 RTC UID 映射能力：

```typescript
const rtc = await client.getRTCTokenInfo({
  channelName: 'demo-channel',
});

const users = await client.getUserIdsWithRTCUids([rtc.uid]);
```

## 十二、API 命名规范化

新 SDK 的公开 API 使用可预测的动词：

| 操作             | 命名                     |
| ---------------- | ------------------------ |
| 读取             | `getXxx`                 |
| 添加/创建        | `addXxx` / `createXxx`   |
| 更新/设置        | `updateXxx` / `setXxx`   |
| 从集合移除       | `removeXxx`              |
| 授予/撤销角色    | `grantXxx` / `revokeXxx` |
| 主动踢出         | `kickXxx`                |
| 当前用户主动退出 | `leaveXxx`               |

参数普遍从多个位置参数改为对象参数，字段统一使用 camelCase。读取类公开 API 不再使用 `fetchXxx` 或 `getXxxFromServer` 一类命名。

## 十三、文档与 AI 集成能力

新 SDK 提供：

- Markdown 格式 API Reference；
- 中英文 API 文档；
- 公开 API 的类型、字段注释和调用示例；
- 可在 IDE 中直接查看的 JSDoc；
- AI 集成 Skill 包 `@easemob/im-sdk-web-ai-kit`。

```bash
npx @easemob/im-sdk-web-ai-kit init
```

严格类型和本地可索引文档可以帮助 IDE、Cursor、Codex 等工具生成更准确的集成代码。

## 十四、当前能力边界

| 项目         | 当前说明                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 密码登录     | 旧 SDK 支持 `conn.open({ user, pwd })`；新 SDK 只支持 Token 登录                               |
| 创建聊天室   | 旧 SDK 暴露 `createChatRoom()`；新 SDK 未暴露，通常通过服务端 REST API 创建                    |
| 注册用户     | 旧 SDK 暴露 `registerUser()`；新 SDK 已移除，应由可信服务端完成                                |
| 消息搜索     | 当前没有本地全文搜索能力                                                                       |
| 会话草稿     | 当前没有 SDK 内置草稿存储 API                                                                  |
| 断点续传     | 支持上传进度，但不支持暂停、恢复或跨会话断点续传                                               |
| 本地消息去重 | 当前未提供完整的本地消息去重存储能力                                                           |
| 端到端加密   | 当前未实现                                                                                     |
| 生态兼容     | 旧 SDK 的 UIKit 和社区案例更多；迁移时需要按新 Manager、事件和数据同步模型适配                 |
| MiniCore     | 旧 SDK 提供独立 MiniCore；新 SDK 通过 Manager 按需导入和注册实现模块裁剪，没有独立 MiniCore 包 |

## 十五、迁移检查清单

从旧 SDK 迁移时，至少检查以下项目：

- 是否把 `conn.xxx` 调用迁移到了对应 Manager。
- 是否在 `login()` 前注册了连接、消息和同步事件。
- 是否显式配置了需要的 `enableSyncData` 类型。
- 开启联系人同步时，是否同时注册了 `ContactManager` 和 `UserInfoManager`。
- 开启群组同步时，是否注册了 `GroupManager`。
- 是否把旧的异步 REST 列表调用改成“本地同步读取 + 事件更新”。
- 是否区分了 `login()` 完成和联系人/群组同步完成。
- 是否在同步失败时保留可用缓存，而不是直接清空 UI。
- 是否把 `to/chatType` 迁移为 `conversationId/conversationType`。
- 是否把消息类型回调迁移为统一 `onMessage`。
- 是否把 `onGroupEvent` / `onChatroomEvent` 的 `operation` 分支迁移为独立事件。
- 是否改为处理业务对象和 `SDKError.code`，不再依赖旧服务端 envelope。
- 是否区分发送成功、送达和已读三个阶段。
- 是否为 Web、小程序和 React Native 使用正确的文件对象。

## 总结

新 SDK 的核心变化可以归纳为四点：

1. 从单一 `conn` 迁移到 `ChatClient + Manager + Entity`。
2. 从业务主动 REST 拉取联系人、会话和群组，迁移到登录同步、本地快照和事件驱动更新。
3. 从宽泛参数、服务端包装和聚合事件，迁移到严格类型、业务对象和精确事件。
4. 从多套平台分叉实现，迁移到统一的平台适配和附件处理链路。

