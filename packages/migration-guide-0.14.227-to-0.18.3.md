# Web SDK 接入迁移指南（0.14.227 → 0.18.3）

> 说明：本文档用于帮助真实项目从 `easemob-websdk@0.14.227` 升级到 `0.18.3`，汇总 0.14.228 → 0.18.3 的主要变更、破坏性 API 调整与迁移建议。内容全部来自 `CHANGELOG.md`，未做夸大或推测。

---

## 一、版本概览

- **旧版本**：`0.14.227`（2026-07-21）
- **新版本**：`0.18.3`（2026-07-27）
- **升级跨度**：0.14.228 → 0.18.3，约 60 个 patch / minor 版本
- **核心主题**：
  - 消息已读回执 API 与事件名最终收敛（多次重命名，必须适配）
  - 会话未读清零多设备事件统一收口
  - 联系人事件 payload 统一收敛
  - 命令消息 `CmdMessageBody.params` 移除
  - 免打扰时长单位与返回语义修正
  - 合并消息协议统一为 `TEXT + COMBINE subType`
  - 初始化参数 `enableMd5Check` 移除，改由 DNS_CONFIG 控制
  - 群组/会话/联系人本地缓存权威替换与多设备删除一致性增强
  - 公开错误类型 `SDKError` 与类型守卫 `isSDKError()` 导出

---

## 二、破坏性变更（必须适配）

### 2.1 群消息已读人数查询重命名并简化入参（0.14.231）

| 变更     | 0.14.227                                                        | 0.14.231+                                      |
| -------- | --------------------------------------------------------------- | ---------------------------------------------- |
| 方法名   | `chatManager.getMessageReadReceipts(...)`                       | `chatManager.getGroupMessageReadReceipts(...)` |
| 入参     | `{ conversationId, conversationType: 'groupChat', messageIds }` | `{ groupId, messageIds }`                      |
| 兼容入口 | 无                                                              | 不保留旧方法                                   |

```ts
// 旧
await chatManager.getMessageReadReceipts({
  conversationId: 'group-id',
  conversationType: 'groupChat',
  messageIds: ['msg-1', 'msg-2'],
});

// 新
await chatManager.getGroupMessageReadReceipts({
  groupId: 'group-id',
  messageIds: ['msg-1', 'msg-2'],
});
```

### 2.2 已读回执事件重命名（0.14.243）

| 变更     | 0.14.227            | 0.14.243+               |
| -------- | ------------------- | ----------------------- |
| 事件名   | `onMessageReceipts` | `onMessageReadReceipts` |
| 兼容别名 | 无                  | 不保留                  |

```ts
// 旧
chatManager.addEventHandler('handler', {
  onMessageReceipts: event => {},
});

// 新
chatManager.addEventHandler('handler', {
  onMessageReadReceipts: event => {},
});
```

### 2.3 已读回执事件 payload 改为联合类型（0.14.232）

`onMessageReadReceipts`（原 `onMessageReceipts`）的元素现在按 `conversationType` 判别：

- 单聊 payload 保持不变。
- 群聊 payload 新增 `receiptDetails: ReadonlyArray<{ messageId: string; count: number }>`。

```ts
chatManager.onMessageReadReceipts = event => {
  for (const receipt of event) {
    if (receipt.conversationType === 'groupChat') {
      console.log(receipt.receiptDetails); // { messageId, count }[]
    }
  }
};
```

### 2.4 会话未读清零多设备事件统一收口（0.14.233）

| 变更       | 0.14.227                                                                                 | 0.14.233+                            |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| 独立事件   | `onConversationUnreadMessageCountCleared`、`onAllConversationsUnreadMessageCountCleared` | **移除**                             |
| 多设备通知 | 通过上述独立事件                                                                         | 统一通过 `onMultiDeviceConversation` |

`MultiDeviceConversationEvent` 改为以 `operation` 判别的联合类型：

- `CONVERSATION_UNREAD_MESSAGE_COUNT_CLEARED`：携带单个会话定位。
- `ALL_CONVERSATIONS_UNREAD_MESSAGE_COUNT_CLEARED`：不包含 `conversationId`。

```ts
chatManager.onMultiDeviceConversation = event => {
  if (event.operation === 'CONVERSATION_UNREAD_MESSAGE_COUNT_CLEARED') {
    console.log(event.conversationId, event.conversationType);
  } else if (event.operation === 'ALL_CONVERSATIONS_UNREAD_MESSAGE_COUNT_CLEARED') {
    console.log('all conversations cleared');
  }
};
```

### 2.5 免打扰时长单位由秒改为分钟，`expireTimestamp` 移除（0.15.0）

| 变更                 | 0.14.227               | 0.15.0+                 |
| -------------------- | ---------------------- | ----------------------- |
| `rule.duration` 单位 | 秒                     | 分钟                    |
| 返回值字段           | `rule.expireTimestamp` | `rule.duration`（分钟） |

**适配建议**：

```ts
// 旧：设置 1 小时
await pushManager.setGlobalSilentMode({
  type: 'DURATION',
  rule: { duration: 3600 }, // 秒
});
const result = await pushManager.getGlobalSilentMode();
console.log(result.rule.expireTimestamp); // 绝对时间戳

// 新：设置 60 分钟
await pushManager.setGlobalSilentMode({
  type: 'DURATION',
  rule: { duration: 60 }, // 分钟
});
const result = await pushManager.getGlobalSilentMode();
console.log(result.rule.duration); // 分钟数
```

### 2.6 联系人事件 payload 统一收敛（0.16.0）

涉及事件：`onContactInvited`、`onContactDeleted`、`onContactAdded`、`onContactRefuse`、`onContactAgreed`。

| 变更                     | 0.14.227                             | 0.16.0+                           |
| ------------------------ | ------------------------------------ | --------------------------------- |
| payload 字段             | `status`、`type`、`rosterVersion` 等 | `{ from, to, message, userInfo }` |
| `status`                 | 原字段                               | 重命名为 `message`                |
| `type` / `rosterVersion` | 存在                                 | 移除                              |

```ts
// 旧
contactManager.onContactInvited = payload => {
  console.log(payload.status, payload.type, payload.rosterVersion);
};

// 新
contactManager.onContactInvited = payload => {
  console.log(payload.from, payload.to, payload.message, payload.userInfo);
};
```

### 2.7 命令消息 `CmdMessageBody.params` 移除（0.17.0）

| 变更                       | 0.14.227 | 0.17.0+  |
| -------------------------- | -------- | -------- |
| `CmdMessageBody.params`    | 存在     | **移除** |
| `CustomMessageBody.params` | 存在     | 保留     |

- 命令消息发送时不再编码遗留 `params`。
- 直接下行、历史消息、置顶消息和合并消息子项即使携带该字段，SDK 也会忽略且不再对外暴露。

```ts
// 旧：可能读取 message.body.params
const cmd = chatManager.createCmdMessage({ action: 'shake', params: { extra: 'x' } });
// 发送后 message.body.params 不再存在

// 新：命令消息只保留 action 与 deliverOnlineOnly
const cmd = chatManager.createCmdMessage({ action: 'shake' });
```

### 2.8 初始化参数 `enableMd5Check` 移除（0.18.0）

| 变更                                 | 0.14.227                     | 0.18.0+                                  |
| ------------------------------------ | ---------------------------- | ---------------------------------------- |
| `InitConfig.enableMd5Check`          | 可选，默认关闭               | **移除**                                 |
| MD5 预检控制                         | 初始化参数 / DNS_CONFIG 下发 | 仅由 DNS_CONFIG 的 `enableMd5Check` 控制 |
| 固定 `serviceConfig.serverUrls` 直连 | 受初始化参数控制             | 保持关闭                                 |

运行时传入已移除的 `enableMd5Check` 会抛出明确校验错误。

---

## 三、新增能力

### 3.1 公开错误类型导出与类型守卫（0.14.237）

- 从包根入口公开导出 `SDKError`、各场景派生错误类及 `ErrorContext`、`ErrorDetails` 类型。
- 新增 `isSDKError(error)` 类型守卫，支持将 `unknown` 收窄为 `SDKError`。

```ts
import { isSDKError } from 'easemob-websdk';

try {
  await chatManager.sendMessage(msg);
} catch (err) {
  if (isSDKError(err)) {
    console.log(err.code, err.toJSON());
  }
}
```

### 3.2 聊天室定向消息（0.14.244）

- 创建聊天室消息时 `receiverList` 不再被错误限制为仅群聊可用；群聊和聊天室均支持定向接收者列表。
- 单聊继续拒绝该参数。

### 3.3 群消息已读成员资料增强（0.14.239 / 0.14.241）

- `getGroupMessageReadUsers()` 在 `enableUserInfoSync=true` 时，对缓存缺失用户并行补拉用户资料与群名片。
- 新增 `GroupUserInfo` 公开类型，`GroupMessageReadUserInfo` 保留为 deprecated 兼容别名。
- 群消息已读成员现在可读取 `user.nameCard`（目标群中的群名片）。

### 3.4 `JoinChatRoomInfo` 返回类型（0.14.226，已在 0.14.227 之前）

- `joinChatRoom()` 成功时返回 `JoinChatRoomInfo`，包含全员禁言、创建时间、白名单状态、成员数与禁言到期时间。

---

## 四、重点修复（建议关注）

### 4.1 消息已读回执批量协议（0.14.228 / 0.14.230）

- `sendMessageReadReceipts()` 现在对同一会话的多个消息只发送一个 MSync `READ_ACK`，统一通过 `ack_message_ids` 携带全部消息 ID。
- 单批最多 50 条消息限制；群聊批量 ACK 恢复设置 `msg_config.allow_group_ack = true`，确保服务端更新群消息已读统计。

### 4.2 合并消息协议统一（0.16.2）

- 单聊、群聊、聊天室统一使用兼容历史漫游和旧端的 `TEXT + COMBINE subType` wire shape。
- 聊天室不再单独发送原生 `COMBINE`。
- 当前设备发送成功后，将 ACK 返回的 `msgServerId` 写入接收去重窗口，避免服务端再次下发同一消息时重复触发 `onMessage`。

### 4.3 群组与会话缓存权威替换（0.14.234 / 0.14.235）

- 群组登录同步完整、校验通过且未受限的结果改为以服务端群组集合权威替换本地，不再用并集保留已退出或已解散的旧群。
- 会话列表首次同步或 checkpoint 归零后以 `last_sync_time=0` 获取的完整空结果，改为权威清空当前用户的 `sessionListMap` 与 `conversationMap`。
- 收到其他设备的 `CONVERSATION_DELETED` 后，SDK 在派发事件前同步清理当前用户的两份会话缓存并完成 localStorage 刷新。

### 4.4 多设备删除联系人缓存一致性（0.14.236）

- 收到其他设备的 `CONTACT_REMOVE` 后，SDK 在派发 `onMultiDeviceContact` 前立即删除当前登录用户内存中的联系人关系，并同步更新 roster version/meta，随后非阻塞地启动 localStorage flush。

### 4.5 群用户资料与群名片统一补齐（0.14.241）

- 新增通用 `GroupUserInfo` 类型，统一用于群消息已读成员、群成员/管理员/禁言/黑名单/allowlist、群详情 owner 与共享文件 owner。
- `enableUserInfoSync=true` 时优先复用 runtime/summary 用户资料及本地群名片，仅在用户资料缺失时按需批量补拉资料，并只为同时缺少群名片的用户请求当前群名片。
- 补拉失败时保留主接口结果，不再导致群读取 API reject。

### 4.6 群组/聊天室单用户禁言查询路径修正（0.18.1）

- 聊天室：`GET /{org}/{app}/sdk/chatrooms/{chatRoomId}/mute/{userId}?version=v3`
- 群组：`GET /{org}/{app}/sdk/chatgroups/{groupId}/mute/{userId}?version=v3`

### 4.7 公开类型双语注释与文档（0.18.2）

- 为流式消息、消息体、连接事件、多设备事件、缓存和平台适配类型补齐 `[zh-CN]` / `[en-US]` 类型级与字段级 JSDoc。
- 从包根补充导出流式消息、各消息体、平台适配器依赖类型、管理器注册上下文及公开事件 payload map。

---

## 五、迁移步骤

### 5.1 升级依赖

```bash
# 本地 tgz
npm install ./easemob-websdk-0.18.3.tgz
# UIKit 仓库（pnpm workspace，沿用 next 命名）
# packages/uikit/package.json 与 apps/demo/package.json 中：
#   "easemob-websdk": "file:../../easemob-websdk-next-0.18.3.tgz"
pnpm install
```

### 5.2 必须检查的代码点（按优先级）

1. **已读回执事件名**：所有 `onMessageReceipts` 改为 `onMessageReadReceipts`。
2. **群已读人数查询**：`getMessageReadReceipts` 改为 `getGroupMessageReadReceipts`，入参改为 `{ groupId, messageIds }`。
3. **群聊已读回执 payload**：读取 `receiptDetails` 获取按消息 ID 的已读人数。
4. **会话未读清零多设备事件**：移除 `onConversationUnreadMessageCountCleared` / `onAllConversationsUnreadMessageCountCleared`，改为监听 `onMultiDeviceConversation` 的对应 `operation`。
5. **联系人事件 payload**：`payload.status` 改为 `payload.message`；停止读取 `payload.type` / `payload.rosterVersion`。
6. **命令消息**：停止读取 `CmdMessageBody.params`；命令消息发送不再携带 params。
7. **免打扰时长**：设置值除以 60 改为分钟；读取 `result.rule.duration` 替代 `result.rule.expireTimestamp`。
8. **初始化参数**：移除 `ChatClient.init({ enableMd5Check })`；MD5 预检改由 DNS_CONFIG 控制。

### 5.3 可选接入

- 使用 `isSDKError()` 统一错误处理。
- 使用 `GroupUserInfo` 替代已废弃的 `GroupMessageReadUserInfo`。
- 利用 `getGroupMessageReadUsers()` 的自动资料/群名片补拉能力展示更完整的已读成员信息。

---

## 六、验证清单

升级后建议至少验证：

- [ ] 单聊/群聊消息正常收发
- [ ] 消息已读回执 `sendMessageReadReceipts` 与 `onMessageReadReceipts` 工作正常
- [ ] 群聊已读人数 `getGroupMessageReadReceipts` 返回正确
- [ ] 会话未读清零：本端通过 `onConversationListUpdate` 反映；多设备通过 `onMultiDeviceConversation` 反映
- [ ] 全部会话未读清零多设备事件正确派发
- [ ] 联系人事件（邀请、同意、删除、拒绝）payload 字段正确
- [ ] 命令消息不再携带或暴露 `params`
- [ ] 免打扰时长设置与查询单位一致（分钟）
- [ ] 合并消息发送后历史漫游可拉取，聊天室合并消息不降级为文本
- [ ] 群组/会话缓存与多设备删除行为符合预期
- [ ] `isSDKError()` 与 `SDKError` 导出可用
- [ ] UIKit 自身测试与构建通过

---

## 七、常见问题

| 问题                                             | 原因                                               | 处理                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `onMessageReceipts` 事件不触发                   | 已重命名为 `onMessageReadReceipts`                 | 统一改为 `onMessageReadReceipts`                                                                                                   |
| `getMessageReadReceipts is not a function`       | 已重命名为 `getGroupMessageReadReceipts`           | 改用新方法，入参改为 `{ groupId, messageIds }`                                                                                     |
| 群聊已读回执收不到 `count`                       | payload 结构改为联合类型                           | 判断 `conversationType === 'groupChat'` 后读取 `receiptDetails`                                                                    |
| `onConversationUnreadMessageCountCleared` 不触发 | 该事件已移除                                       | 监听 `onMultiDeviceConversation` 的 `CONVERSATION_UNREAD_MESSAGE_COUNT_CLEARED` / `ALL_CONVERSATIONS_UNREAD_MESSAGE_COUNT_CLEARED` |
| 联系人事件 `status` / `type` 字段缺失            | payload 已收敛为 `{ from, to, message, userInfo }` | 使用 `message` 替代 `status`，移除 `type` / `rosterVersion` 读取                                                                   |
| 命令消息 `params` 丢失                           | `CmdMessageBody.params` 已移除                     | 改用 `CustomMessage` 携带自定义参数，或仅使用 `action`                                                                             |
| 免打扰时间明显变短                               | 单位由秒改为分钟                                   | 设置值除以 60                                                                                                                      |
| `enableMd5Check` 初始化报错                      | 该参数已移除                                       | 从 `ChatClient.init` 中移除，改由 DNS_CONFIG 控制                                                                                  |
| 合并消息历史漫游拉不到                           | 早期版本使用独立 `COMBINE` 协议                    | 升级到 0.16.2+ 后新发的合并消息可正常漫游                                                                                          |

---

## 八、参考链接

- 完整 CHANGELOG：`CHANGELOG.md`
- 上一份迁移指南：`migration-guide-0.14.203-to-0.14.227.md`
- 消息已读回执文档：`docs/reference/chat-manager-api.md`
- 联系人 API 文档：`docs/reference/contact-manager-api.md`
- 群组 API 文档：`docs/reference/group-manager-api.md`
- 错误码文档：`docs/reference/errors.md`
