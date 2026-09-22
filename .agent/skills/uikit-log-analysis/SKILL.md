# UIKit 日志体系与 AI 日志分析约定（log-store 格式 / 命名空间规律 / 链路对账 / 双 adapter 差异）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-log-analysis**。

## 触发词

- `日志分析` / `分析日志` / `排查日志` / `看日志`
- `下载日志` / `导出日志` / `.log 文件` / `troubleshooting`
- `日志格式` / `log-store` / `collectSdkLog`
- `环境问题对比` / `两个环境日志对比` / `双环境 diff`
- 用户直接贴 UIKit 导出的日志内容让分析问题时

## 目标

1. 不按格式约定解析日志——导出的 `.log` 是固定五段纯文本，瞎猜字段浪费时间；
2. 不知道 ns 命名规律——websdk5 域层裸名 ns（`MessageDomain` 等）搜 `UIKit:` 前缀会漏；
3. 误判 sdk 源为空——webim4 适配下 SDK 日志捕获未接入，`collectSdkLog` 收集不到 SDK 日志；
4. 排查回执/消息类问题不看对账链路——单点日志无法定位「发送成功但无回执」这类断点；
5. 向集成侧（`integrations/skills`）泄漏仓库内部实现——消费侧 skill 只写对外契约，内部路径只进本 skill。

## 1. 日志内核与格式契约

事实源：`packages/uikit-core/src/utils/log-store.ts`、`packages/uikit-core/src/utils/logger.ts`。

- 持久化内核：IndexedDB（库名/保留策略可经 `configureLogPersistence` 配置），双源：`uikit`（UIKit 自身）与 `sdk`（环信 SDK）。
- 导出行格式（`formatPersistedLogs`）：

```
[2026-08-13 11:14:32.249] [INFO] [uikit:UIKit:ChatEvents] onMessage {…json}
```

- 五段：时间（本地时区毫秒）/ 级别（uikit 源 debug|info|warn|error，sdk 源 debug|warn|error **无 info**）/ `source[:ns]` / 首参消息 / 其余参数序列化（可缺省）。
- sink 无条件触发（不跟 console 级别），debug 也落库；**分析以导出文件为准，不以 console 为准**。
- 级别过滤发生在 `appendLog` 写入前（`uikitLevel`/`sdkLevel`），导出的文件里不会出现被过滤级别。

## 2. 命名空间（ns）规律

事实源：全仓 `createLogger(...)` 调用点（72 处，三套件规则不同）：

- **uikit-im / uikit-core / uikit-chatroom**：全部 `UIKit:` 前缀（如 `UIKit:ChatEvents`、`UIKit:UseMessageSend`、`UIKit:UikitProvider`）。
- **uikit-sdk-webim4**：全部 `UIKit:Webim4*` 前缀（如 `UIKit:Webim4MessageDomain`、`UIKit:Webim4ConnEvents`）。
- **uikit-sdk-websdk5**：事件/适配层带 `UIKit:` 前缀，**域层有四个裸名**：`Combine`、`History`、`MessageDomain`、`Conversation`——按 `UIKit:` 前缀检索会漏掉这四类。
- chatroom 场景包：`UIKit:ChatroomEvents` / `UIKit:ChatroomAdapter`。

## 3. 采集与导出链路

- 绑定胶水：`packages/uikit-im/src/utils/logger-binding.ts`（side-effect 引入，`source: 'uikit'`，前缀 `easemob-uikit-im`）。
- Provider 配置入口：`packages/uikit-core/src/composables/use-provider-side-effects.ts`，`logger` prop 键：`enabled / collectSdkLog / uikitLevel / sdkLevel / maxEntries / retentionDays`。
- 导出：`exportPersistedLogs` 从 `@easemob-community/uikit-im` 导出（`packages/uikit-im/src/index.ts`），浏览器触发下载，文件名 `easemob-uikit-im-logs-<时间戳>.log`。
- SDK 日志捕获：`packages/uikit-sdk-websdk5/src/utils/sdk-log-capture.ts`——注入 `setLogger` 优先、console 拦截兜底，开启时把 SDK 级别提升到 DEBUG。
- **webim4 缺口**：`packages/uikit-sdk-webim4/src/client.ts` 仅有 `setSdkLogLevel`；官方钩子 `WebIM.logger.onLog` 尚未接入（源码附注明确「后续直接用，勿再包一层拦截」）→ 4.x 适配下导出文件**没有 sdk 源**，不是配置失效。

## 4. AI 分析工作流（拿到 .log 的固定动作）

1. **解析**：逐行正则匹配，解析失败行保留原文（可能是 JSON 折行）；行内 `{...}` 段尝试 JSON.parse，失败按文本保留。
2. **时间线**：按时间排序，以用户操作（发送/点击/切换会话）为锚点取前后窗口，过滤无关 ns。
3. **对账**：按 §5 链路逐节点核对，找「上一步有日志、下一步无日志」的断点。
4. **双环境 diff**：同一操作两套环境（如不同区 appkey）各导一份，定位首个分歧行——分歧前的最后一条公共日志通常就是环境差异的边界。

## 5. 链路对账实例（已读回执，含本次新增诊断 tag）

发送侧：`[GroupAck] shouldEnableGroupAck 判定`（use-message-send）→ 发送时 `[GroupAck] 发送消息携带 needReadReceipt`（websdk5 `_send`）。
接收侧：收 `onMessage` → 发 `[queueMessageReadReceipt] 批量发送已读回执` → `已读回执发送成功`（chat-events 合并批量）或 `MessageDomain.markRead`（单条）/ `sendPendingReadReceipts`（进入会话补发）。
回执回流：websdk5 `onMessageReadReceipts(single|group)`；webim4 `onReadMessage(single|group)` + `onChannelMessage`（会话级）。
断点判定：发送成功日志在、回流事件无 → 服务端/环境问题；`shouldEnableGroupAck result: false` → 群规模超 `maxGroupSize`（默认 200）或配置未开。

## 硬规则 vs 软约定

**硬规则：**

- 分析必须以导出文件为准；结论要落到具体 ns + 消息文本 + 时间锚点，不接受「看起来像环境问题」。
- 检索必须覆盖 websdk5 四个裸名 ns（`Combine / History / MessageDomain / Conversation`）。
- webim4 适配的日志里 sdk 源缺失是已知行为，排查报告必须显式声明这一点。
- 对外（集成侧 skill / 文档站）只写 `integrations/skills/reference/troubleshooting.md` 里的对外契约；仓库内部路径只写进本 skill。

**软约定：**

- 双环境对比先找首个分歧行，再回溯上下文，而不是全量 diff。
- 新加诊断日志时顺手把 tag 登记到 §5 对账链路（保持链路图新鲜）。
- 排查结论可复用的，回写 `integrations/skills/reference/troubleshooting.md` 的链路对账表。

## 已知漂移（改到相关文件时注意）

- webim4 SDK 日志捕获未接入（`WebIM.logger.onLog` 待用）——若接入，更新 §3 与 `troubleshooting.md` 的「sdk 源仅 websdk5 生效」表述。
- websdk5 域层裸名 ns 是历史命名，统一加前缀会破坏既有日志检索习惯，暂不整改。
- 导出文件前缀由场景包 `setLogFilePrefix` 决定（uikit-im 为 `easemob-uikit-im`，chatroom 场景为其自身前缀），分析多渠道日志时先看文件名前缀区分场景包。

## 反面清单

- ❌ 凭 console 输出下结论——未持久化的日志可能级别不够，必须看导出文件。
- ❌ 只搜 `UIKit:` 前缀——漏掉 websdk5 的 `MessageDomain` 等裸名 ns。
- ❌ 4.x 日志没 sdk 源就报「collectSdkLog 没生效」——webim4 本来就没接入。
- ❌ 贴日志让 AI 分析时不给操作时间锚点——时间线对不上，只能全量瞎翻。
- ❌ 把仓库内部文件路径写进集成侧文档——内外 skill 边界混淆。
