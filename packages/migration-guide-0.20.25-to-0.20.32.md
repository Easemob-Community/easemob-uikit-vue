# Web SDK 接入迁移指南（0.20.25 → 0.20.32）

> 说明：本文档用于帮助真实项目从 `easemob-websdk@0.20.25` 升级到 `0.20.32`（对外 npm 包版本 `5.0.0`），汇总 0.20.26 → 0.20.32 的主要变更与迁移建议。内容全部来自 `CHANGELOG.md`，未做夸大或推测。

---

## 一、版本概览

- **旧版本**：`0.20.25`（2026-08-04）
- **新版本**：`0.20.32`（2026-08-06），对外 npm 包版本 `5.0.0`
- **升级跨度**：0.20.26 → 0.20.32，共 7 个 patch 版本
- **核心主题**：
  - `clearConversationUnreadMessageCount` 改为本地优先清理，离线也能成功（0.20.32）
  - `GroupMembersJoinedEventPayload` 新增可选 `groupName`，事件名称补齐策略完善（0.20.30 / 0.20.31）
  - `onMembersJoined` 派发时序调整：等待群详情补拉完成后再回调（0.20.29）
  - 跨端消息/附件/语音发送集成文档完善（0.20.26 / 0.20.27 / 0.20.28，无 API 变化）

---

## 二、行为变更（建议适配）

### 2.1 `clearConversationUnreadMessageCount` 本地优先清理（0.20.32）

| 场景                                 | 0.20.25-                            | 0.20.32+                                          |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------- |
| 未连接 / 服务端同步失败（本地有会话） | 调用失败并抛错                      | **按成功返回**，先清本地未读再尽力同步服务端，记录结构化警告 |
| 本地无目标会话 + 远端同步失败        | 抛错                                | 仍抛出连接或服务端错误                            |
| 清理成功后的会话列表通知             | 取决于服务端返回时机                | 本地快照变化时**立即派发 `onConversationListUpdate`** |

```ts
// 旧：需要自己处理"未连接时清理失败"的重试逻辑
try {
  await chatManager.clearConversationUnreadMessageCount(conversationId);
} catch (err) {
  // 旧版未连接时会走到这里
}

// 新：本地有会话时离线也可成功，无需额外容错
await chatManager.clearConversationUnreadMessageCount(conversationId);
```

### 2.2 `onMembersJoined` 派发时序（0.20.29）

- 当前用户收到新群 `onMembersJoined` 通知时，SDK 会**等待群详情补拉结束后**再对外派发事件，确保回调触发时本地已加入群列表已补齐详情；详情请求失败时保留最小群记录并正常派发事件。
- 新群详情补拉完成后会检查本地群会话：名称为空或仍为群 ID 时，用群详情名称补齐并派发 `onConversationListUpdate`（事件原因为 `profile`），已有有效名称不会被覆盖。
- 群详情成功返回后不再对已包含最新成员数的 `memberCount` 重复累加。

> UI 影响：回调触发时本地群资料已可用，无需在 UI 侧再自行补拉；但仍应容忍 `groupName` 为 `undefined` 的情况（补拉失败兜底）。

### 2.3 群成员加入事件新增 `groupName`（0.20.30 / 0.20.31）

- `GroupMembersJoinedEventPayload` 新增**可选字段 `groupName`**：当前用户加入新群且详情补拉成功时返回详情中的真实群名称。
- 名称来源优先级：运行时群资料 / 本地已加入群摘要 → 原始通知携带名称 → 补拉群详情；均无有效名称时保持 `undefined`。
- 新增字段为可选，不破坏现有事件消费代码；UI 可在收到 `onMembersJoined` 时直接展示 `groupName`。

---

## 三、文档完善（无 API 变更）

### 3.1 跨端消息发送集成文档（0.20.26）

- 发送消息集成文档新增微信小程序、uni-app、Taro 小程序和 React Native 的图片、视频发送示例，使用 `@tab` 容器按平台切换查看。
- 明确普通文件消息的平台能力差异：限制来自宿主文件选择 API，给出原生文件选择插件及 `originalUrl` 远程文件发送方案。
- 修正旧版附件、自定义消息和发送选项字段，与当前 `data`、`filename`、`event`、`params` 及 `SendMessageOptions` 类型保持一致。

### 3.2 跨端附件示例准确性修订（0.20.27）

- 补充附件元数据优先级：本地 `data` 优先读取自身 `name/type/size`，顶层字段仅作回退；远程文件需要传递协议附件大小时使用 `fileLength`。

### 3.3 跨端语音消息集成示例（0.20.28）

- 语音消息发送新增五组平台示例（Web `File`、小程序 `path`、React Native `uri`）；宿主录音返回的毫秒时长需转换为 SDK 要求的 `durationSeconds`（秒）。

---

## 四、迁移步骤

### 4.1 升级依赖

```bash
# 本地 tgz（对外包名 easemob-websdk，版本 5.0.0）
npm install ./easemob-websdk-5.0.0.tgz
```

### 4.2 建议检查的代码点

1. **清理未读**：若业务对 `clearConversationUnreadMessageCount` 有"未连接即失败"的容错或重试逻辑，可简化；本地有会话时现在会直接成功。
2. **成员加入事件**：确认 `onMembersJoined` 处理不依赖旧时序（旧版可能在详情补齐前触发）；可选用新增 `groupName` 展示群名称。
3. **会话列表刷新**：清理未读、群详情补齐会话名称时，`onConversationListUpdate` 的触发时机与原因（`profile`）可能更频繁，UI 应能容忍幂等更新。

---

## 五、验证清单

升级后建议至少验证：

- [ ] 离线（未连接）状态下清理本地会话未读成功，会话列表快照立即更新
- [ ] 本地无目标会话且服务端同步失败时，清理未读仍抛出错误
- [ ] 收到新群 `onMembersJoined` 时，事件回调后本地群列表已有详情，`groupName` 有值时正确展示
- [ ] 群详情补齐会话名称后 `onConversationListUpdate` 正常派发，已有有效名称不被覆盖
- [ ] 多端发送图片/视频/语音消息按文档示例工作正常

---

## 六、常见问题

| 问题                                                     | 原因                                             | 处理                                                       |
| -------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| 清理未读在断网时仍报错                                   | 本地没有该会话，远端同步也失败                   | 符合预期；确认传入的 `conversationId` 本地确实存在          |
| `onMembersJoined` 回调比旧版稍晚                         | 0.20.29 起等待群详情补拉完成后再派发             | 正常行为；回调触发时群详情已就绪                            |
| `groupName` 为 `undefined`                               | 本地与通知均无名称且详情补拉失败                 | 兜底设计，UI 应优雅降级                                    |
| 会话列表收到比预期更频繁的 `onConversationListUpdate`     | 本地优先清理、详情名称补齐会主动派发更新补丁     | 按 `conversationId` 幂等处理更新事件                       |

---

## 七、参考链接

- 完整 CHANGELOG：`CHANGELOG.md`
- 上一份迁移指南：`migration-guide-0.20.2-to-0.20.25.md`
- 会话/未读 API 文档：`docs/reference/chat-manager-api.md`
- 群组事件文档：`docs/reference/group-manager-api.md`
- 跨端消息发送集成文档：`docs/integration/message_send.md`
