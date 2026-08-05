# Electron + 本地数据库（SQLite）持久化场景概念预研

> 调研日期：2026-08-05。文中行号为当日代码快照，可能随改动漂移，以文件+特征定位为准。
> 状态：**预研结论，未实施**。后续启动该专项时以本文档为入口。

## 背景

未来 UIKit 有较大可能在 Electron 环境中使用。Electron 场景下消息/会话数据极有可能外接本地数据库（如 SQLite）：登录后先从本地库加载历史会话与消息回流到 UIKit 渲染（冷启动不依赖网络），新消息在收发时同步写库，翻页优先读本地、未命中再走服务端漫游。

## 总体结论

**架构底子是支持的，但「消息/会话持久化」这一层目前是空白，需要新增一层适配器。属于"低侵入扩展"，不是"推翻重构"，组件层基本不用动。**

- 「登录后从 DB 加载回流 UIKit」这条路**今天就能走通**：store 已有现成的批量注入入口，adapter 可复用做数据形态对齐。
- 缺的是：一个正式的持久化抽象接口、历史加载的数据源分支、会话列表与 SDK 同步快照的覆盖竞争处理。
- Electron 环境本身的适配障碍很少（渲染进程即 Chromium）。

## 现状架构对扩展的支持点

### 1. Domain 层已是依赖注入形态，天然留了挂点

- `sdk/domain/message-domain.ts`（`MessageStoreLike` 接口，约 L42-60）等 Domain 构造时注入 `ManagerHost` + `StoreLike` 最小接口，不直接 import Pinia store。未来加第三个依赖 `MessageRepository`（SQLite 读写）很自然。
- **写库精确位置**：
  - `MessageDomain._send` 成功后（约 L277，此时已有服务端 `msgServerId`）；
  - `MessageDomain.fetchHistory` 拉漫游结果后（约 L319，`prependMessages` 前）。
- **收消息写库单一入口**：`sdk/event/chat-events.ts` `onMessage`（约 L266）→ `stores.message.addMessage`。撤回（约 L305）、编辑（约 L333）、送达/已读状态更新（约 L310/315）都集中在事件层，旁路写库容易保持一致。

### 2. store 层已有现成的「批量回流」入口（自带去重排序）

- 会话：`conversationStore.setConversationList(list)`（`store/conversation.ts:42`，整体替换，含"保留当前会话"补回逻辑）；composable 层另有 `useConversation().setLocalConversationList()`（`composables/use-conversation.ts:237`，注释明确写了"业务自定义数据源 / demo 注入 mock 用"）。
- 消息：**`messageStore.prependMessages(conversationId, msgs)`（`store/message.ts:188`）——自带按 msgServerId/msgLocalId 去重 + 按 timestamp 排序 + trim，是历史消息回流的最佳入口**；DB 侧无需保证顺序。
- 数据形态对齐：DB 读出的消息过一遍现成的 `toUiMessage(sdkMsg, currentUserId)`（`sdk/adapter/message-adapter.ts:30`），产物与 SDK 链路完全一致，下游渲染零改动。前提是 DB 存 SDK Message 原始 JSON，关键字段齐全：`msgServerId`/`msgLocalId`（去重键）、`conversationId`、`from/to`、`type`（走 `MESSAGE_TYPE` 常量）、`body`（按类型的 body 结构）、`timestamp`（排序键）、`sendStatus`/`isPeerRead`。
- 会话形态要求：完整 `UiConversation`（`sdk/types.ts:86-115`），`type` 必须走 `CONVERSATION_TYPE` 常量值。

### 3. 已有可插拔数据源先例

`UIKitDataSource`（`composables/types.ts:9-18`）允许业务注入 `fetchContacts/fetchBlocklist/fetchGroups/fetchPresence/fetchUserInfos` 接管联系人/群/presence/用户资料获取——这是项目认可的扩展惯例。**但它不覆盖消息和会话**。照此模式扩展 `messageDataSource`/`conversationDataSource` 是阻力最小的路线。

### 4. 登录/初始化流程

入口 `useUIKitProvider`（`composables/use-uikit.ts:86`）。`login`（约 L229）只调 `client.login` 并写 currentUser，**登录后 UIKit 本身不主动拉数据**，数据回流完全靠 SDK 自动同步（`enableSyncData`）触发 `onSyncDataFinished` 回填 store。DB 冷启动预填的挂载点：`login` 成功后、或 `chat-events.ts` `onSyncDataStart('conversation')`（约 L186）处。

## 需要注意的四个缺口（未来的主要工作量）

1. **会话列表会被 SDK 同步事件整体覆盖**。`onSyncDataFinished`（`chat-events.ts:193-209`）用 SDK 快照整体替换列表，DB 独有的会话/字段会被冲掉。现有 `mergeWithExistingConversations`（约 L165）只保留 name/avatar，不够。需要合并策略或协调回填时序。
2. **历史加载数据源硬编码在 `MessageDomain.fetchHistory`**（约 L302 直连 `chatManager.getHistoryMessages`）。接 DB 需加"先读本地、未命中再走漫游"分支；翻页游标 `historyCursorMap`（`composables/use-message-history.ts:5`，模块级 `{cursor, isLast}` 结构）是纯内存，可直接复用为 DB 分页游标，但要让游标感知本地数据边界。
3. **入库前需要序列化清洗**。`UiMessage` spread 了 SDK Message，含 `markRaw` 的 combine messageList 和可能的 File 对象，不能直接 `JSON.stringify` 入库。`composables/use-chat.ts:36` 的 `toCleanSdkMessage` 是现成的清洗范本。
4. **写库无现成钩子 + 内存 trim**。store action 都是同步纯内存操作，写库要在 Domain/事件层旁路做；内存有 300 条/会话上限（`store/message.ts:69` trim），需设计 DB 与内存的边界（翻页翻穿内存后从 DB 继续）。

## 建议的落地形态（未来实施参考）

1. 新增 `sdk/repository/`（或扩展 `dataSource`）：定义 `MessageRepository` / `ConversationRepository` 接口——`loadConversations / loadMessages(conversationId, cursor) / saveMessage / updateMessageStatus / recallMessage` 等。
2. `useUIKitProvider` 的 options 允许注入 repository 实例；Domain 构造时透传（与现有 `ManagerHost`/`StoreLike` 注入同模式）。
3. 登录后（`login` 成功或 `onSyncDataStart` 处）：从 DB `setConversationList` + 各会话 `prependMessages` 最近 N 条；配合 `modules/chat/chat.vue`（约 L578）"本地无消息才拉首屏"的判断，可跳过/延迟服务端请求。
4. Electron 侧：SQLite 住主进程（如 better-sqlite3），渲染进程经 IPC 调 repository——UIKit 侧只面向接口，不感知 Electron。

## Electron 环境适配点（与持久化无关，但同属该专项）

渲染进程 = Chromium，绝大多数浏览器 API 直接可用；产物是纯 ESM 浏览器库，无 Node 依赖。真正要处理的：

- **麦克风权限**：录音用 `getUserMedia`（`modules/chat/message-input/index.vue:479`），Electron 需 `webContents.setPermissionRequestHandler` 授权。
- **`window.open` 外链接管**：`text-message.vue:163`、`utils/download.ts:104`，需 `setWindowOpenHandler`。
- **下载桌面化体验**：`utils/download.ts` 的 `downloadFile` 是 fetch → Blob → a.download，无注入点；做"另存为/打开所在目录"需加下载策略注入点（`file-message.vue`/`image-message.vue`/`video-message.vue` 直接调 `downloadFile`）。
- **本地文件路径 → File 对象**：渲染进程无文件路径概念，业务"拖入本地文件直接发"需主进程读文件转 `File`/`Blob`；websdk `InitConfig.useCustomAttachmentUpload` 提供自定义附件上传通道，可接主进程直传。
- **websdk 平台适配层**：`easemob-websdk/platform/`（socket/request/runtime/env），`InitConfig.platformAdapterOptions` 可覆盖宿主能力——SDK 侧已预留非标准宿主适配口。
- **依赖引用隐患**：`packages/uikit/package.json` 当前 `easemob-websdk` 是 `file:../../easemob-websdk-next-5.0.0.tgz` 本地 tgz 引用，外部项目（含 Electron 工程）引用时需注意。

## 一句话总结

「登录后从 DB 加载回流 UIKit」今天就能走通（store 入口和 adapter 现成）；缺的是一个正式的持久化抽象接口和会话覆盖竞争处理。预计是一次**中等规模、不动组件层**的扩展，而不是架构级改造。
