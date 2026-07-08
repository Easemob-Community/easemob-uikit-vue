# Web SDK 接入迁移指南（0.14.161 → 0.14.181)

> 说明：本文档用于帮助真实项目从 `easemob-websdk@0.14.161` 升级到 `0.14.181`，汇总 20 个 patch 版本的主要变更、破坏性 API 调整与迁移建议。

---

## 一、版本概览

- **旧版本**：`0.14.161`（2026-06-23）
- **新版本**：`0.14.181`（2026-07-08）
- **升级跨度**：20 个 patch 版本（0.14.161 → 0.14.181）
- **核心主题**：
  - 消息已读回执 & 会话未读清零 API 统一改造
  - ChatThread（子区）消息链路正式支持
  - 合并消息字段精简
  - 微信小程序兼容性大幅提升

---

## 二、新增功能

### 2.1 消息已读回执

| 新增 API | 说明 |
|----------|------|
| `chatManager.getMessageReadReceipts(params)` | 按群会话批量获取一组消息的已读回执详情 |
| `chatManager.clearAllConversationUnreadMessageCount()` | 清空所有会话未读数 |

新增事件：

- `onAllConversationsUnreadMessageCountCleared`：多设备清空所有会话未读数时派发

### 2.2 ChatThread（子区）消息

| 新增能力 | 说明 |
|----------|------|
| `createTextMessage({ isChatThread: true })` | 创建 Thread 消息 |
| 消息字段 `isChatThread` | 是否为 Thread 消息 |
| 消息字段 `chatThread` | 子区基础信息 |
| 消息字段 `chatThreadOverview` | 子区 overview 信息 |

限制：Thread 消息仅支持群聊会话。

---

## 三、破坏性变更（必须适配）

### 3.1 已读回执 API 统一改造

| 旧 API（0.14.161） | 新 API（0.14.181） | 说明 |
|---------------------|---------------------|------|
| `message.needGroupReadReceipt` | `message.needReadReceipt` | 单聊/群聊统一字段 |
| `chatManager.markMessageRead(...)` | `chatManager.sendMessageReadReceipts(...)` | 单聊/群聊统一 API，支持同会话批量发送 |
| `chatManager.sendGroupMessageReadAck(...)` | `chatManager.sendMessageReadReceipts(...)` | 同上 |
| `chatManager.onMessageRead` | `chatManager.onMessageReceipts` | 统一回调 |

### 3.2 会话未读清零改造

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `chatManager.markConversationRead(...)` | `chatManager.clearConversationUnreadMessageCount(...)` | 协议改为仅同步自己多设备，不再发送给对方 |

- 本机未读数清零继续通过 `onConversationListUpdate` 感知
- 多设备侧派发 `onConversationUnreadMessageCountCleared`

### 3.3 合并消息字段精简

| 变更 | 0.14.161 | 0.14.181 |
|------|----------|----------|
| `combineLevel` 位置 | 消息外层 + `body.combineLevel` | 仅在 `body.combineLevel` 暴露 |
| `compatibleText` | 在 `body` 中暴露 | 不再暴露，仅作为创建参数用于上行协议兼容 |

---

## 四、重点修复（建议关注）

### 4.1 真实环境稳定性

| 版本 | 修复 |
|------|------|
| 0.14.171 | 普通文本消息不再编码空 `meta` 字段，避免真实环境浏览器发送后服务端关闭 WebSocket 导致 ACK 超时 |
| 0.14.177 | 静态 protobuf 反射 decoder 兼容 `repeated enum packed` 编码，修复服务端标准 packed enum 回包被误读 |

### 4.2 微信小程序兼容

| 版本 | 修复 |
|------|------|
| 0.14.176 | 内部 UTF-8 编解码 fallback，不依赖全局 `TextEncoder` / `TextDecoder` |
| 0.14.170 | protobuf 反射运行时改为小程序安全实现，避免动态 `Function(...)` 代码生成 |
| 0.14.170 | 小程序 socket 适配器 `readyState` 初始状态修复 |
| 0.14.170 | MSync bytes 字段兼容跨运行时 `ArrayBufferView` |
| 0.14.169 | 小程序 demo SDK 加载入口改为本地桥接文件，避免动态加载 404 |
| 0.14.169 | 固定 REST / WebSocket 地址校验不依赖运行时 `URL` 构造器 |
| 0.14.172 | 小程序选择图片后通过 `wx.getImageInfo` 补齐宽高 |

### 4.3 同步与通知

| 版本 | 修复 |
|------|------|
| 0.14.165 | 联系人 roster 全量同步模式判定修复，避免本地保留已删除联系人 |
| 0.14.164 | Thread 消息不再写入普通 conversation / session-list 缓存，避免创建父群会话或累加未读数 |
| 0.14.167 | 主 mSync NOTICE 队列重新允许空 `queue.name` 拉取，修复加好友通知 `onContactInvited` 未派发 |

---

## 五、迁移步骤

### 5.1 升级依赖

```bash
npm install easemob-websdk@0.14.181
# 或本地 tgz
npm install ./easemob-websdk-next-0.14.181.tgz
```

### 5.2 替换已读回执相关代码

#### 创建消息时

```ts
// 旧
const msg = chatClient.chatManager.createTextMessage({
  content: 'hello',
  needGroupReadReceipt: true,
});

// 新
const msg = chatClient.chatManager.createTextMessage({
  content: 'hello',
  needReadReceipt: true, // 单聊/群聊统一字段
});
```

#### 发送已读回执时

```ts
// 旧
await chatClient.chatManager.markMessageRead({ conversationId, conversationType, messageId });
await chatClient.chatManager.sendGroupMessageReadAck({ conversationId, messageIds });

// 新
await chatClient.chatManager.sendMessageReadReceipts({
  conversationId,
  conversationType,
  messageIds: [messageId],
});
```

#### 监听已读回执时

```ts
// 旧
chatClient.chatManager.onMessageRead = (event) => {};

// 新
chatClient.chatManager.onMessageReceipts = (event) => {};
```

### 5.3 替换会话未读清零相关代码

```ts
// 旧
await chatClient.chatManager.markConversationRead({ conversationId, conversationType });

// 新
await chatClient.chatManager.clearConversationUnreadMessageCount({
  conversationId,
  conversationType,
});
```

### 5.4 合并消息字段适配

如果业务侧之前读取了 `message.combineLevel` 或 `message.body.compatibleText`，需要调整：

```ts
// 旧
const level = message.combineLevel;
const text = message.body?.compatibleText;

// 新
const level = message.body?.combineLevel;
// compatibleText 已不再对外暴露，如需展示请使用 message.body?.content 或其他业务字段
```

### 5.5 ChatThread 消息接入（可选）

```ts
const msg = chatClient.chatManager.createTextMessage({
  content: 'reply in thread',
  isChatThread: true,
  chatThreadId: 'thread-id',
});

await chatClient.chatManager.sendMessage(msg);
```

---

## 六、验证清单

升级后建议至少验证：

- [ ] 单聊/群聊消息正常收发
- [ ] 消息已读回执 `sendMessageReadReceipts` 与 `onMessageReceipts` 工作正常
- [ ] 会话未读清零 `clearConversationUnreadMessageCount` 生效
- [ ] 合并消息发送/下载/解析正常
- [ ] 小程序环境登录、收发消息、图片消息正常
- [ ] ChatThread 消息（如业务使用）正常

---

## 七、常见问题

| 问题 | 原因 | 处理 |
|------|------|------|
| `needGroupReadReceipt` 字段报错 | 字段已废弃 | 改为 `needReadReceipt` |
| `markMessageRead` 不存在 | API 已移除 | 改为 `sendMessageReadReceipts` |
| `markConversationRead` 不存在 | API 已重命名 | 改为 `clearConversationUnreadMessageCount` |
| 小程序初始化失败 / 真机 `Function` 不可用 | 旧版本使用动态 protobuf 生成 | 升级到 0.14.170+ 后使用反射运行时 |
| 普通文本消息发送后 WebSocket 被关闭 | 空 `meta` 字段问题 | 升级到 0.14.171+ |

---

## 八、参考链接

- 完整 CHANGELOG：`CHANGELOG.md`
- 消息已读回执文档：`docs/reference/chat-manager-api.md`
- 错误码文档：`docs/reference/errors.md`
- ChatThread 集成文档：`docs/integration/chat-thread*.md`
