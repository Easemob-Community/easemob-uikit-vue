# 会话列表最佳实践

本文档面向接入方业务开发者，说明 SDK 会话列表的底层架构、API 选型与推荐调用模式。

## 前提条件

- 完成 SDK 初始化并登录，详见 [初始化文档](./initialization.md) 与 [登录文档](./login.md)。
- 已注册 `ChatManager`。
- 理解 SDK 中"会话"（Conversation / Session）指单聊、群聊或聊天室的对话单元。

## 架构概览

会话列表模块由 **两层缓存 + 一组同步控制器** 构成：

```
业务调用层
  getConversationList()    getSessionList()
  getPinnedConversationList()   getConversationListByMark()
  refreshSessionList()

查询投影层 (session-list-query.ts)
  SessionItem → ConversationItem 投影 + 游标分页 + 过滤

缓存层（两套独立共存）
  SessionListCache (035 新，主力)     ConversationCache (034 旧，回退用)
   + sessions_last_sync_ts  checkpoint

同步控制器 (SessionListSyncController)
  WebSocket protobuf → 批量写入 → checkpoint 推进 → 事件分发
```

## 核心数据模型

SDK 同时维护两种会话数据结构，字段集与适用场景不同。

### SessionItem（新会话列表，字段最全）

```typescript
interface SessionItem {
  sessionId: string;                           // 会话 ID
  type: 'singleChat' | 'groupChat' | 'chatRoom'; // 会话类型
  unreadCount: number;                         // 未读数
  lastMessage: SessionMessageSnippet | null;   // 最后消息（含 from 发送者字段）
  lastMessageAt?: number;                      // 最后消息时间（毫秒）
  isPinned?: boolean;                          // 是否置顶
  pinnedTime?: number;                         // 置顶时间（毫秒）
  marks: ReadonlyArray<ConversationMark>;      // 标记列表（0-19）
  readReceipt?: number;                        // 已读位置时间戳（毫秒）
  remindType: 'default' | 'all' | 'at' | 'none'; // 提醒类型
  display: SessionDisplayProjection;           // 展示投影
}

interface SessionDisplayProjection {
  displayName: string;   // 展示名称
  avatarUrl?: string;    // 头像地址
  remark?: string;       // 联系人备注
  source: 'contactRemark' | 'userInfo' | 'sessionMetadata' | 'groupSnapshot' | 'chatRoomSnapshot' | 'fallback';
}
```

**特点：** 包含 UI 渲染所需的全部字段（展示名称、头像、提醒类型、已读位置）。`lastMessage` 额外包含 `from`（发送者）字段，方便在会话列表直接展示"xxx: 最后一条消息内容"。

### ConversationItem（公开会话摘要，SessionItem 的子集投影）

```typescript
interface ConversationItem {
  conversationId: string;
  conversationType: 'singleChat' | 'groupChat' | 'chatRoom';
  lastMessage: { msgId: string; type: string; body: Record<string, unknown>; timestamp: number } | null;
  unreadCount: number;
  isPinned?: boolean;
  pinnedTime?: number;
  marks: ReadonlyArray<ConversationMark>;
  lastAccess: number;  // 最近访问时间戳
  lastUpdate: number;  // 最近更新时间戳
}
```

**特点：** 字段更精简，`lastMessage` 不含 `from` 字段。命名采用 `conversationId`/`conversationType` 风格。

### 两个模型的关系

`ConversationItem` 是 `SessionItem` 的投影子集——每次调用 `getConversationList()` 时，SDK 内部通过 `toConversationItem()` 将 `SessionItem` 转换为 `ConversationItem` 返回。如果不需要 `display`、`remindType`、`readReceipt` 等字段，直接用 `getConversationList()` 即可。

## 缓存机制

### 排序规则

会话列表始终按以下规则排序（由缓存层保证）：

1. **置顶会话优先**（`pinnedTime` 降序）
2. **最近活跃在前**（`lastMessageAt` / `updatedAt` 降序）

### 数据生命周期

```
登录 → loadSessionList（读 localStorage 缓存）
  → refreshSessionList（WebSocket 同步服务端最新数据）
  → 新消息到达（实时 patch SessionListCache）
  → 登出（缓存保留在 localStorage）
  → 下次登录（直接从缓存恢复，无需等待网络）
```

### 同步模式

SDK 根据本地 checkpoint（`sessionsLastSyncTs`）自动选择：

| 条件 | 模式 | 行为 |
|------|------|------|
| `sessionsLastSyncTs === 0`（首次/缓存被清） | 全量同步 | 拉取全部会话，覆盖本地缓存 |
| `sessionsLastSyncTs > 0` | 增量同步 | 仅拉取 `last_sync_time` 之后的变更，upsert 到现有缓存 |

### 回退机制

当 session-list 同步链路不可用时（例如未配置 `syncWsUrl` 且 DNS 探测不可用），SDK 自动将旧的 `ConversationCache` 转换为 `SessionItem[]` 返回，确保调用方始终能拿到数据。

## API 选型指南

### API 速查表

| 方法 | 数据来源 | 网络请求 | 返回类型 | 适用场景 |
|------|---------|---------|---------|---------|
| `getSessionList()` | SessionListCache | 否（同步） | `SessionItem[]` | 需要展示名称/头像/提醒类型的完整 UI |
| `getConversationList(params)` | SessionListCache | 否 | `ConversationPage` | 仅需基础会话信息 + 分页 |
| `getPinnedConversationList(params)` | SessionListCache | 否 | `ConversationPage` | 置顶会话页 |
| `getConversationListByMark(params)` | SessionListCache | 否 | `ConversationPage` | 按业务标记分类（如"未处理"/"已处理"） |
| `refreshSessionList(params)` | WebSocket 服务端 | **是** | `SessionItem[]` | 主动刷新最新数据 |
| `pushManager.getConversationListByRemindType(params)` | REST API | **是** | `MutedConversationPageResponse` | 获取免打扰会话 |

### 关键区别

**`getConversationList()` 不是服务端请求。** 它是纯本地缓存读取——从 `SessionListCache` 中分页并投影为 `ConversationItem`。必须先调用 `refreshSessionList()` 将服务端数据拉取到本地缓存，`getConversationList()` 才能返回最新内容。

**`getSessionList()` 是同步方法。** 直接返回缓存中的 `SessionItem[]`，无需 `await`，适合在渲染循环中直接取用。

## 推荐调用模式

### 1. 登录后首屏加载

```typescript
// 步骤 1：初始化 + 登录
const client = new ChatClient({ appKey: 'your-app-key' });
client.use(ChatManager);
await client.init({ userId: 'user1', token: 'xxx' });
await client.login();

// 步骤 2：主动触发同步（关键步骤！）
const sessions = await client.chatManager.refreshSessionList({
  needEmptySession: false,  // 不拉空会话
  needSessionMark: true,    // 需要标记数据
});

// 步骤 3：用同步后的数据渲染 UI
sessions.forEach(session => {
  console.log(session.display.displayName, session.unreadCount);
});

// 后续：直接读缓存即可，无需再 refresh
const cached = client.chatManager.getSessionList();
```

### 2. 分页加载更多

```typescript
async function loadAllConversations(chatManager: ChatManager) {
  let cursor = '';
  const allItems: ConversationItem[] = [];

  do {
    const page = await chatManager.getConversationList({
      pageSize: 50,   // 最大 50
      cursor,         // 第一页传 '' 或不传
    });
    allItems.push(...page.items);
    cursor = page.cursor;  // 空字符串 = 没有更多
  } while (cursor);

  return allItems;
}
```

### 3. 按标记分类（业务自定义分类）

```typescript
// 示例：mark=0 表示"待处理"，mark=1 表示"已归档"
const pending = await client.chatManager.getConversationListByMark({
  mark: 0,
  pageSize: 20,
});

const archived = await client.chatManager.getConversationListByMark({
  mark: 1,
  pageSize: 20,
});
```

### 4. 通过事件驱动 UI 更新

**不要**在修改会话后立即重新查询列表。应监听事件，在事件回调中更新 UI。

```typescript
client.addEventHandler('conversation', {
  // 同步开始——显示 loading
  onConversationListSyncDidStart: () => {
    showLoadingIndicator();
  },

  // 同步完成——刷新 UI
  onConversationListSyncDidFinish: (event) => {
    hideLoadingIndicator();
    if (event?.error) {
      showErrorToast('会话列表同步失败');
      return;
    }
    const sessions = client.chatManager.getSessionList();
    renderConversationList(sessions);
  },

  // 会话变更——增量更新 UI
  onConversationUpdate: (event) => {
    // source 标识变更来源：
    //   'serverSync' — 会话列表同步
    //   'message'     — 新消息
    //   'notify'      — 系统通知
    const sessions = client.chatManager.getSessionList();
    renderConversationList(sessions);
  },
});
```

### 5. 使用 SessionItem 渲染完整会话卡片

如果需要展示名称、头像、最后消息发送者等完整信息：

```typescript
function renderConversationCard(session: SessionItem) {
  return {
    // 展示名称（SDK 已按优先级自动选择：备注 > 昵称 > ID）
    title: session.display.displayName,
    // 头像
    avatar: session.display.avatarUrl,
    // 最后消息摘要（含发送者）
    subtitle: session.lastMessage
      ? `${session.lastMessage.from}: ${extractText(session.lastMessage.body)}`
      : '',
    // 未读角标
    badge: session.unreadCount > 0 ? session.unreadCount : undefined,
    // 提醒状态
    isMuted: session.remindType !== 'default',
    // 置顶标识
    isPinned: session.isPinned ?? false,
    // 时间
    time: session.lastMessageAt
      ? formatRelativeTime(session.lastMessageAt)
      : '',
  };
}
```

## 常见错误与避免方式

### ❌ 错误：mutation 后立即查询

```typescript
// 错误：置顶后立刻查列表，缓存还没更新
await client.chatManager.setConversationPinned({ conversationId: 'xxx', conversationType: 'singleChat', pinned: true });
const list = await client.chatManager.getConversationList(); // 拿到的还是旧数据
```

**正确做法：** 监听 `onConversationUpdate` 事件，在回调中重新渲染。

```typescript
client.addEventHandler('conversation', {
  onConversationUpdate: () => {
    const sessions = client.chatManager.getSessionList();
    renderList(sessions);
  },
});
```

### ❌ 错误：每次进入页面都调 refreshSessionList

```typescript
// 错误：频繁全量同步浪费带宽
useEffect(() => {
  client.chatManager.refreshSessionList(); // 每次组件挂载都触发
}, []);
```

**正确做法：** 仅在登录后或用户主动下拉刷新时调用 `refreshSessionList()`，其余场景直接读 `getSessionList()`。

### ❌ 错误：把 cursor 当作字符串 ID 自行构造

```typescript
// 错误：cursor 是 SDK 内部的数字偏移量编码，不可自行构造
await client.chatManager.getConversationList({ cursor: 'next-page-id' });
```

**正确做法：** cursor 必须来自上一次 SDK 返回的值（`page.cursor`），第一页传 `''` 或不传。

### ❌ 错误：使用 `getConversationList()` 渲染带发送者的最后消息

```typescript
// ConversationItem.lastMessage 不含 from 字段
const page = await client.chatManager.getConversationList();
page.items.forEach(item => {
  console.log(item.lastMessage?.from); // undefined！
});
```

**正确做法：** 需要发送者信息时使用 `getSessionList()`，其 `lastMessage` 包含 `from` 字段。

## 注意事项

1. **`getConversationList` 默认排除空会话**，如需展示空会话请设置 `includeEmptyConversations: true`。
2. **服务端最多存储 100 个会话**，超出部分由服务端按规则清理。
3. **标记槽位共 20 个（0-19）**，由业务方自行定义含义（如"待处理"、"已归档"、"星标"等）。
4. **会话排序规则**（置顶优先 → 最近活跃在前）由缓存层保证，调用方无需自行排序。
5. **`refreshSessionList()` 有去重保护**：同一时刻多次调用只发起一次同步，后续调用复用同一个 Promise。
6. **能力探测结果在同一次登录周期内缓存**：如果首次判定 session-list 同步不可用，后续 `refreshSessionList()` 直接走回退链路，不再重复探测。
