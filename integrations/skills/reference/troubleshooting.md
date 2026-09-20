# 日志采集、导出与 AI 辅助排查（logger 配置 / 日志格式约定 / 排查路径）

本文约定两件事：① 业务方如何开启日志持久化并把日志文件交给 AI 分析；② AI 拿到 `.log` 文件后按什么格式约定解析、按什么路径定位问题。

## 开启与导出（业务方操作）

### 1. 开启持久化

```
<EmUIKitProvider
  app-key="your-app-key"
  :logger="{
    enabled: true,        // 日志写入 IndexedDB（默认关闭）
    collectSdkLog: true,  // 同时收集环信 SDK 日志（见下方限制）
    uikitLevel: 'info',   // UIKit 侧级别：debug | info | warn | error
    sdkLevel: 'debug',    // SDK 侧级别：debug | warn | error（无 info）
    maxEntries: 5000,
    retentionDays: 7,
  }"
>
```

### 2. 提供下载入口

`@easemob/uikit-im` 导出了 `exportPersistedLogs()`（返回导出的条数），业务方自行接一个按钮/调试面板：

```ts
import { exportPersistedLogs } from '@easemob/uikit-im'

async function downloadLogs() {
  const count = await exportPersistedLogs()
  // 文件名为 easemob-uikit-im-logs-<时间戳>.log，纯文本
}
```

> 复现路径越短日志越干净：建议复现前先清理（重新登录或清站点数据），复现后立即导出。

## 日志格式约定（AI 解析依据）

每行一条，固定五段：

```
[2026-08-13 11:14:32.249] [INFO] [uikit:UIKit:ChatEvents] onMessage {…json}
```

| 段 | 含义 | 取值 |
| --- | --- | --- |
| 时间 | 本地时区，毫秒精度 | `YYYY-MM-DD HH:mm:ss.SSS` |
| 级别 | 大写 | uikit 源：DEBUG/INFO/WARN/ERROR；sdk 源：DEBUG/WARN/ERROR（无 INFO） |
| 来源 | `source` 或 `source:ns` | source：`uikit` / `sdk`；ns 见下表 |
| 消息 | 首参文本 | 如 `onMessage`、`[GroupAck] shouldEnableGroupAck 判定` |
| 数据 | 其余参数序列化 | 可能缺省；长 JSON 可能被截断 |

解析正则（完整行匹配）：

```js
const LOG_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\] \[(\w+)\] \[(uikit|sdk)(?::([^\]]+))?\] (.*?)(?: (\{.*\}))?$/
```

## 命名空间（ns）速查

| ns | 归属 | 关注点 |
| --- | --- | --- |
| `UIKit:ChatEvents` / `UIKit:Webim4ChatEvents` | 消息事件 | 收发、已读/送达回执、撤回、同步 |
| `MessageDomain` / `UIKit:Webim4MessageDomain` | 消息领域 | 发送、已读回执补发、历史拉取 |
| `UIKit:ConnEvents` / `UIKit:Webim4ConnEvents` | 连接 | 登录、断连、token 过期 |
| `Conversation` / `UIKit:Webim4ConversationDomain` | 会话 | 会话列表同步、清未读 |
| `UIKit:GroupEvents` / `UIKit:Webim4GroupEvents` | 群组 | 群变更、成员事件 |
| `UIKit:PresenceEvents` 等 | 在线状态 | 订阅与状态回调 |
| `UIKit:UikitProvider` / `UIKit:CoreProvider` | 装配 | 初始化、features 生效 |

两个易踩的命名事实：

- **websdk5 域层有四个裸名 ns**（无 `UIKit:` 前缀）：`Combine`、`History`、`MessageDomain`、`Conversation`；webim4 与 uikit-im 全部带 `UIKit:` 前缀。
- **sdk 源当前仅 websdk5 适配生效**；4.x 适配（webim4）下 `collectSdkLog` 收集不到 SDK 日志，只有 UIKit 自身日志，排查时不要把「日志里没有 sdk 源」误判为配置未生效。

## AI 排查工作流（拿到 .log 后按序执行）

1. **结构化**：用上述正则逐行解析为 `{ts, level, source, ns, message, data}`，解析失败的行保留原文（可能是多行 JSON 折行）。
2. **建时间线**：按 `ts` 排序，过滤无关 ns；以用户操作时间点（发送/点击）为锚点取前后窗口。
3. **找断点**：按链路对账表逐节点核对「上一步有、下一步无」的断点位置。
4. **对比环境**：同一操作在两套环境（如不同区 appkey）各导一份，diff 首个分歧行。

### 链路对账表

| 问题现象 | 对账节点（按发生顺序） | 判定 |
| --- | --- | --- |
| 对方看不到我已读 | 收 `onMessage` → 发 `[queueMessageReadReceipt] 批量发送已读回执` → `已读回执发送成功` | 有发成功无回执事件＝服务端/环境问题 |
| 我看不到对方已读（单聊） | 对方侧发送成功日志 → 我侧 `onMessageReadReceipts(single)` | 同上 |
| 群已读人数不更新 | `[GroupAck] shouldEnableGroupAck 判定 result: true` → `[GroupAck] 发送消息携带 needReadReceipt` → `onMessageReadReceipts(group)` | 判定为 false＝群规模/配置问题；携带标记缺失＝发送链路问题 |
| 消息发不出 | `UIKit:UseMessageSend` → `MessageDomain` 发送 → `UIKit:ChatEvents` 回执 | 失败行必有 WARN，直接看 error 字段 |
| 登录失败 | `UIKit:UikitProvider` 初始化 → `UIKit:ConnEvents` | 看连接错误的 code/desc |

### 快速检索关键词

- `WARN`/`ERROR` 全量列出，按 ns 聚类；
- 回执类：`ReadReceipt`、`onMessageReadReceipts`、`onReadMessage`、`[GroupAck]`、`markRead`；
- 连接类：`onConnected`、`onDisconnected`、`token`；
- 同步类：`onSyncDataStart`、`onSyncDataFinished`、`failed`。

## 反面清单

- ❌ 只看 ERROR 忽略 WARN——UIKit 大量失败只打 WARN（如回执发送失败）。
- ❌ 把 sdk 源为空当成配置没生效——webim4 适配下 sdk 源本就不收集。
- ❌ 忽略 `MessageDomain` / `Conversation` 这类裸名 ns——websdk5 域层不带 `UIKit:` 前缀。
- ❌ 拿未开 `enabled: true` 的会话日志来分析——console 里能看到的日志不等于已持久化，必须以导出文件为准。
