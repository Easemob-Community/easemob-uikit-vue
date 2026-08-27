# SDK 适配层 + 数据入口层抽象（双 adapter + 中立契约 + repository）设计执行计划

> 状态：**关键决策已全部确认，待 Phase 1 启动**（规划完成，用于未来 4.x 私有化落地评估）
> 对应 TECH-DEBT D122（SDK 抽象），联动 D85（Electron 持久化预研，见 `docs/ELECTRON-PERSISTENCE-RESEARCH.md`）。
> 修订（基于 `easemob-websdk@4.24.2` 源码核对）：会话列表 API 修正为 `getServerConversations`（游标分页）；补 4.x 消息体字段映射表（`msg`/`thumb`/`length`/`addr`/`customEvent` 等差异）与事件模型差异（`onMessage` 批量数组、回执独立回调）；`SdkAdapter` 补操作面；Provider 兼容策略明确为非 breaking；UMD 全局名决策修正；chatroom 本期暂缓接入 adapter。
> 背景：公有云推荐 `easemob-websdk` 5.x（当前 UIKit 已接近开发尾声）；存量用户主力仍是 IM4.x；另有一个**私有化项目仅支持 4.x SDK，且运行在 Electron 环境**，聊天消息 / 会话可能需外接本地库注入或新增数据入口层。目标：一套 UI 产物不重来，底层 SDK 可低成本切换、数据来源可插拔。

---

## 一、背景与结论

### 1.1 需求背景

1. **5.x 是战略方向**：公有云推荐，当前 UIKit（`@easemob/uikit-im` + `@easemob/uikit-core`）已按 5.x 开发接近尾声，UI 逻辑产物（消息气泡 / 会话列表 / 联系人 / 群管理 / 输入框 / 主题 / 文案）不愿舍弃重来。
2. **4.x 是真实存量 + 硬需求**：4.x 仍是主要存量用户在用的 SDK；且有一个**私有化项目仅支持 4.x**（目标为 `easemob-websdk@4.24.2`：`connection.open()` 登录 + `connection.send()` 发消息 + `body` 判别联合，非更老的全局 `WebIM`/`msg.bodies` 形态）。
3. **两代长期并存**：4.x 与 5.x 会长期双轨，不是"短期迁到 5.x 就完"。
4. **私有化项目还是 Electron 环境**：聊天消息 / 会话可能需外接本地库（如 SQLite）注入，或新增数据入口层——登录后从本地库回流渲染（冷启动不依赖网络）、新消息收发时同步写库、翻页优先读本地。这一诉求与"SDK 切换"是**同一个端口-适配器问题**：SDK 是一个数据来源，本地库是另一个数据来源，应统一收敛到同一中立契约。

### 1.2 结论

- **方向正确，采用「端口-适配器（Ports & Adapters）+ 中立契约」架构**，不采用"4.x 单独再开发一套 UIKit"。
- 理由：单独开发意味着**两套 UI 双份维护**，直接违背"不期望舍弃 UI 重来"的核心诉求；而两代 SDK 的**领域概念高度重合**（消息 / 会话 / 联系人 / 群组 / presence 是同一套），真正差异在 wire 格式与 API 形态，中立契约天然存在、抽象层收益大。
- 关键取舍：**"低成本切换"成立的前提是先做一次「防腐层收口」**。当前架构"先进但未收口"（详见第三节），离"切一下 SDK 就完"只差一次收口，不是差一次架构推翻。

### 1.3 明确边界（不可逾越）

- ✅ 可做到：下游业务方接入 API 稳定；uikit-im 的 UI 产物零重写；4.x 与 5.x 的**能力对齐**（合并消息 / 置顶消息 / 流式消息 / 已读回执等 4.x 均支持，见「八、4.x 能力映射」）。
- ❌ 做不到：让两代 SDK 的 **API/事件/wire 形状**天然一致——差异是客观存在的，必须靠 adapter 做字段映射 + 语义归一化（这正是本计划的 Phase 2 工作量）。
- ❌ 非目标：同一个运行时实例同时连两个 SDK（不做）；UI 组件重写（不做）。
- ⏸️ 本期暂缓：`@easemob/uikit-chatroom` 暂不接入 adapter 体系，维持现状直连 `easemob-websdk@5.x`（其 `ClientConfig.managers` 注入 ChatRoomManager 的机制不受影响——中立化后 `managers` 字段保留在 adapter 专属配置透传槽中，chatroom 经 5.x adapter 初始化路径继续可用）。chatroom 的 adapter 化待 Phase 1/2 稳定后单独评估。

---

## 二、目标架构（端口-适配器）

### 分层总览（四层，先建立心智模型）

> 一句话：**uikit-im 只面向契约要数据；契约定义"我要什么"；适配层实现"怎么从某个 SDK 拿到并翻译"；core 提供 SDK 无关底座 + 承载契约，不碰 SDK。**

```text
┌────────────────────────────────────────────────┐
│  uikit-im（UI 组件 + store + 交互逻辑）            │
│  只面向「契约」，不 import 任何 SDK                 │
└───────────────────────┬────────────────────────┘
                        │ 依赖（只用契约里的类型/接口）
┌───────────────────────▼────────────────────────┐
│  契约层（=「我需要什么数据 + 什么能力」）            │
│  UiConversation / UiMessage                       │
│  ConversationRepository / MessageRepository       │
│  SdkCapabilities   —— 纯 TS 类型 + 接口，无 SDK     │
└───────────────────────┬────────────────────────┘
                        │ 实现（implements 契约）
┌───────────────────────▼────────────────────────┐
│  适配层（SDK 集成在这里，每个 SDK 一套）            │
│  adapter-websdk5   → 翻译 5.x 的 API/wire/事件    │
│  adapter-webim4    → 翻译 4.x 的 API/wire/事件    │
└───────────────────────┬────────────────────────┘
                        │ 真正 import SDK（只有这里碰 SDK）
             ┌──────────┴──────────┐
             │ easemob-websdk@5.x  │
             │ easemob-websdk@4.24 │
             └─────────────────────┘
```

三个关键澄清：

1. **契约不放在 uikit-im，放中立层**：语义上"数据需求"由 uikit-im 的诉求驱动，但定义/发布在中立包（`@easemob/uikit-sdk-contract`）。若契约写进 uikit-im，适配层就不得不 `import uikit-im`——方向反了（适配层是更底层，不能依赖上层 UI 包）。
2. **core 不碰 SDK**：当前 `@easemob/uikit-core` 的 `sdk/client.ts` / `sdk/types.ts` 里仍残留 `import ... from 'easemob-websdk'`——这正是 D122 要收口的点；目标状态下 core 只剩"SDK 无关底座（theme/locale/原子组件/composable/Provider 壳）+ 契约"，SDK 相关实现全部下沉适配层。
3. **适配层才是 SDK 集成**：初始化/登录、事件注册、消息体字段映射、分页收敛、头像昵称补全，全部且只发生在 adapter。

依赖方向（单向向下，禁止反向）：

`uikit-im ──依赖──▶ 契约 ◀──实现(implements)── 适配层 ──import──▶ SDK`

**uikit-im 的灵活性来源**：uikit-im 是需求方——通过契约层**声明**「要哪些事件（`SdkEventHandlers`）+ 要哪些查询（repository 接口）」；adapter 是实现方，负责**派发事件**与**实现查询**。因此 uikit-im 想新增事件/查询 = 改契约 + 两 adapter 各自实现，**UI 层与下游业务方零改动**；两代差异与未来扩展都收敛在 adapter 内。成本是每加一个事件/查询两 adapter 都要实现，某 SDK 不支持时用 `SdkCapabilities` 降级。

### 2.1 包拆分（不要 fork 整个 core）

core 里 theme / locale / constants / 原子组件（Avatar / Icon / Popup / Button …）都是 **SDK 无关**的，fork 两套 core 会重复维护无意义代码。建议拆成：

| 包 | SDK 相关性 | 版本数 | 职责 |
| --- | --- | --- | --- |
| `@easemob/uikit-core` | 无关 | 1 份 | theme / locale / constants / 原子组件 / UI composables / Provider 壳 |
| `@easemob/uikit-sdk-contract`（契约包） | 无关 | 1 份 | 中立 wire 类型 + 接口 + `SdkCapabilities` |
| `@easemob/uikit-sdk-websdk5`（adapter） | 相关 | 各自独立发版 | SDK5 的 client / domain / event / adapter 实现 |
| `@easemob/uikit-sdk-webim4`（adapter） | 相关 | 各自独立发版 | IM4.x 的 client / domain / event / adapter 实现 |

- `@easemob/uikit-im` 只依赖前两个（core + contract），**不再直接依赖任何 SDK 包**；SDK adapter 作为 peer dep / 注入，**下游 app 装哪个就接哪个**，uikit-im 的 dist 不用重发。
- 契约包必须**单一真相源、只有一个版本**：若把 core 复制成两套各写各的类型，TS 结构类型来源变了，uikit-im 换依赖时会大面积红，漂移后"无感知切换"名存实亡。

### 2.2 中立契约设计要点（关键：以 5.x 字段命名为基准）

- 现有 UI 已按 5.x 字段写死（`msg.body.content` / `thumbnailUrl` / `originalImageUrl` / `duration` / `url` / `latitude` / `longitude` / `event` / `params` 等）。**中立 body 类型直接复用这套语义命名**，让 4.x adapter 负责把 4.x 的 `body` 判别联合（`TextMsgBody`/`ImgMsgBody`/`CombineMsgBody`/`StreamMsgBody`/`ReadMsgBody`…）**翻译成这套命名**——这样 `modules/chat/message-item/*` 渲染代码零改动。
- `UiMessage` 从 `SdkMessage & UiMessageExtension`（extend SDK5 `Message`）改为 `SdkMessage & UiMessageExtension`（extend **中立** `SdkMessage`）。
- 消息 body 类型与类型守卫（`isTextBody` / `isImageBody` …）从 `export type ... from 'easemob-websdk'` 改为**本地复刻中立类型**，字段名沿用 5.x 语义。

### 2.3 capability 矩阵（能力差异显式化）

> 修正（基于 `easemob-websdk@4.24.2` 源码核对）：合并消息 / 置顶消息 / 流式消息 / 已读回执 **4.x 均支持**，能力上无缺失（详见「八、4.x 能力映射」）。因此 `SdkCapabilities` 不再是"4.x 降级开关"，而是**极少数真实能力差异的显式声明** + 未来新增能力的扩展位。

契约层定义能力矩阵，由各 adapter 如实上报；uikit-im 按 `capabilities` 分支渲染/隐藏：

```ts
interface SdkCapabilities {
  combineMessage: boolean   // 两代都 true；差异在字段映射（compatibleText/combineLevel），不在能力
  pinnedMessage: boolean    // 两代都 true；4.x 支持 cursor 分页、5.x 不分页（max 20）
  streamingMessage: boolean // 两代都 true；差异在 stream.text vs deltaText/fullText
  groupReadReceipt: boolean // 两代都 true；差异在回执模型（消息类型 vs 专用 API）
  // ... 按需扩充
}
```

与现有 Provider `features`（`UIKitFeatures`）合并：`capabilities` 是"SDK 客观能力"，`features` 是"业务开关"，二者取交集决定最终是否展示。

### 2.4 语义归一化（真正的隐藏成本，别低估）

两代 SDK 在**未读清零、已读回执、消息排序、会话列表更新事件、草稿**上的行为不一致。adapter 层必须把这些归一化成同一套语义，让 uikit-im 看到一致行为。类型只是皮，语义才是肉——这是 Phase 2 的主要工作量，不是类型定义。

### 2.5 数据入口层（repository）与 SDK 抽象同构

SDK 是一个数据来源，Electron 本地库（SQLite）是另一个数据来源；两者都应接到同一个中立数据契约上，因此 repository 接口应**与 SDK adapter 接口共用同一套中立 `UiMessage` / `UiConversation` 契约**，而非另起一套。

- 契约包（`@easemob/uikit-sdk-contract`）除中立 wire 类型外，**同时定义数据入口接口**：

```ts
interface MessageRepository {
  loadMessages(conversationId: string, cursor?: string): Promise<{ list: UiMessage[], cursor?: string, hasMore?: boolean }>
  saveMessage(msg: UiMessage): Promise<void>
  updateMessageStatus(msgId: string, status: MessageStatus): Promise<void>
  recallMessage(msgId: string): Promise<void>
}
interface ConversationRepository {
  // 统一游标分页语义：cursor 为空拉第一页；返回 list + nextCursor + hasMore
  fetchConversations(params: { cursor?: string, pageSize?: number }): Promise<{ list: UiConversation[], cursor?: string, hasMore: boolean }>
  saveConversation(cv: UiConversation): Promise<void>
  removeConversation(conversationId: string): Promise<void>
}
```

- **SDK 默认实现**：repository 不注入时，退回"直连 SDK 内存 + 服务端漫游"（现状行为）。
- **Electron 实现**：SQLite 住主进程（如 better-sqlite3），渲染进程经 IPC 调 repository——UIKit 侧只面向接口、不感知 Electron。
- **`UIKitDataSource` 规划为最新形式（已确认）**：现有 `UIKitDataSource`（`composables/types.ts:9-36`，联系人/群/presence/用户资料/search/addContact/createGroup 接管）**无生产使用**，不保留旧双线——统一迁移为 repository 数据入口层（消息/会话/联系人/群/presence 全部走 repository 接口），旧 `dataSource` 废弃或作为薄别名过渡。

### 2.6 现状对数据入口层的支撑点（证据，D85 已核）

1. **store 已有现成回流入口**：`conversationStore.setConversationList(list)`（`store/conversation.ts:49`）、`messageStore.prependMessages(conversationId, msgs)`（`store/message.ts:204`，自带 `msgServerId`/`msgLocalId` 去重 + `timestamp` 排序 + trim）——这是"注入数据"的地基，DB 侧无需保证顺序。
2. **形态对齐 adapter 现成**：`toUiMessage()`（`sdk/adapter/message-adapter.ts:59`）把 DB 读出的消息转成与 SDK 链路同款的 `UiMessage`，下游渲染零改动。
3. **Domain 层是依赖注入形态**：构造时注入 `ManagerHost` + `StoreLike` 最小接口，加第三个依赖 `MessageRepository` 很自然。
4. **可插拔先例已确立**：`UIKitDataSource` 即项目认可的"数据源接管"惯例，照此扩展 repository 阻力最小。

### 2.7 需要新补的缺口（D85 已列全，主要工作量）

1. **`UIKitDataSource` 废弃、统一 repository**：消息/会话/联系人/群/presence 全部收敛到 repository 接口（见 2.5，已确认不保留旧双线）。
2. **历史加载数据源分支**：`MessageDomain.fetchHistory` 现在直连 `chatManager.getHistoryMessages`，要加"先读本地、未命中再走漫游"；翻页游标需感知本地数据边界。
3. **会话覆盖竞争**：`onSyncDataFinished` 用 SDK 快照整体替换列表，DB 独有的会话/字段会被冲掉，需合并策略或协调回填时序。
4. **入库前序列化清洗**：`UiMessage` 含 `markRaw`/`File` 等不能直接 `JSON.stringify`（`toCleanSdkMessage` 是现成范本）。
5. **Electron 环境适配点**（与持久化同属该专项，D85 已列）：麦克风权限（`setPermissionRequestHandler`）、`window.open` 外链拦截（`setWindowOpenHandler`）、下载桌面化（`utils/download.ts` 无注入点）、本地文件路径→`File`（主进程读文件）、SDK 平台适配（`InitConfig.platformAdapterOptions`）。

### 2.8 会话列表：分页与补全归一化（读/展示分离的落地范例）

> 这是「读数据（数据访问）与展示数据分离」+「SDK 差异收敛到 adapter」的一个**具体落点**。会话列表的两代差异：4.x 只有分页拉取（一页最大 50 条），5.x 可一次全量/本地快照；且 4.x 会话不携带头像昵称、需单独补全。

#### 分页差异 → 统一「游标分页 + hasMore」，5.x 向下收敛

- 契约统一为 `ConversationRepository.fetchConversations({cursor, pageSize}) → {list, cursor, hasMore}`（见 2.5）。
- **4.x adapter**：原生 `getServerConversations({pageSize, cursor})`（游标分页，pageSize 取值 1-50）直接映射，`hasMore` 由返回判断——这是它的自然语义。
  > ⚠️ 注意不是 `getConversationlist`：后者是旧 REST 接口（`pageNum`/`pageSize`，pageSize 上限 20、无游标），游标分页的正确 API 是 `getServerConversations`；置顶会话对应 `getServerPinnedConversations({pageSize, cursor})`。
- **5.x adapter**：把"一次全量/本地快照"**向下收敛**成分页语义——会话数在阈值内直接 `hasMore:false` 一次给完，否则 adapter 内部按固定页大小切本地数组维护游标。
- **原则：统一语义选「分页」，让 5.x 向下兼容，而非让 4.x 向上模拟全量**（4.x 循环分页拉全量，几千会话会拉爆 + 拖慢冷启动）。
- uikit-im 的会话列表因此只有一套逻辑：首屏 `fetchConversations({})` → `hasMore` 为真时滚动到底 `fetchConversations({cursor})` 追加，**完全不感知是 4.x 分页还是 5.x 全量**。

#### 头像/昵称补全 → 下沉到 adapter

- 中立 `UiConversation` 的 `name`/`avatar` 定义为"**最终展示值**"（可为空）。
- **adapter 统一负责补全**：4.x adapter 在 `fetchConversations` 返回后，对 `name`/`avatar` 缺失的会话批量走用户资料源补全再返回；5.x adapter 走 `enableUserInfoSync` 已补全的直接返回、未补全的走同一套补全。
- 复用现有兜底机制：`UiConversation.lastMessageFrom`（异步资料就绪后重解析昵称）、`patchConversationNames`、`fetchedGroupNameIds` 缓存（见 D94）——把这条链路从 uikit-im 的 event 层下沉到 adapter，UI 零改动。

#### 「加载更多」交互 → hasMore 驱动，SDK 无关

- uikit-im 会话列表从"一次全量渲染"升级为"`hasMore` + 滚动加载更多"：4.x 下 `hasMore=true` 逐页追加；5.x 下 `hasMore=false` 加载入口自然退化。
- 这是 uikit-im 内部一次性的 UI 增强，建立在 repository 分页契约之上，与 SDK 版本彻底解耦。

#### 三个必须处理的坑

1. **5.x 事件全量替换 vs 分页追加的协调**：`onConversationListUpdate` 会整体替换列表，与"分页追加"的 store 状态冲突；adapter 需统一"快照"与"增量"两种来源（对齐 D85 会话覆盖竞争处理）。
2. **排序稳定性**：分页追加要保证与首屏排序一致（置顶优先 + 时间倒序），否则加载更多会导致重排、重复或漏条。
3. **补全的批量 + 缓存**：4.x 每页 50 条会话都需补头像昵称，必须批量 `fetchUserInfos` + 去重缓存（复用 D94 的 Promise 去重思路），否则每翻一页就打一堆请求。

### 2.9 事件契约与装配机制（adapter 推事件 + Provider 注入）

> 决策（已确认）：adapter **推事件**给 uikit-im，不直接操作 store——保证灵活度与可控性；adapter 由 **Provider 直接传入**。

- **事件订阅接口（推事件，不写 store）**：契约层定义中立事件集，adapter 内部 `addEventHandler` 后把 SDK 事件**翻译成中立事件再回调**，uikit-im 订阅中立事件去写 store，全程不知道 SDK 事件名。

```ts
interface SdkEventHandlers {
  onMessage?: (msg: UiMessage) => void                    // 新消息（含离线同步回填）
  onConversationChange?: (conversations: UiConversation[]) => void // 会话列表更新
  onMessageReceipts?: (receipts: ReceiptEvent[]) => void   // 已读/送达回执
  onRecall?: (messageId: string) => void                    // 撤回
  onConnectStateChange?: (state: ConnectState) => void      // 连接状态
  // ...
}
interface SdkAdapter {
  init(config: SdkConfig): Promise<void>
  login(user: string, token: string): Promise<void>
  logout(): Promise<void>
  subscribe(handlers: SdkEventHandlers): () => void  // 返回取消订阅函数
  readonly capabilities: SdkCapabilities
  // 数据访问 + 消息/会话操作（读写一体，见下「操作面」）
  conversation: ConversationRepository
  message: MessageRepository
  contact: ContactRepository
  group: GroupRepository
  presence: PresenceRepository
}
```

- **操作面（不能只定义查询）**：repository 接口必须是**读写一体**的，否则现有 Domain 层（`MessageDomain.sendText/sendImage/recall/markRead/modifyText/pinMessage` 等，`message-domain.ts` 约 30 个方法）无处安放。契约层按域聚合操作：

```ts
interface MessageRepository {
  // —— 读 ——
  loadMessages(params: { conversationId: string; cursor?: string; pageSize?: number }): Promise<{ list: SdkMessage[], cursor?: string, hasMore: boolean }>
  // —— 写/操作（对应现有 MessageDomain 全部方法）——
  sendText(params: { conversationId: string; conversationType: ConversationTypeValue; content: string; ext?: Record<string, unknown>; needReadReceipt?: boolean }): Promise<SdkMessage>
  sendImage(params: { conversationId: string; conversationType: ConversationTypeValue; data: File | string; ext?: Record<string, unknown>; needReadReceipt?: boolean }): Promise<SdkMessage>
  // sendFile / sendVoice / sendVideo / sendLocation / sendCustom / sendCmd / sendCombine 同模式
  recall(params: { conversationId: string; conversationType: ConversationTypeValue; messageId: string }): Promise<void>
  markMessagesRead(params: { conversationId: string; conversationType: ConversationTypeValue; messageIds: string[] }): Promise<void>
  markConversationRead(params: { conversationId: string; conversationType: ConversationTypeValue }): Promise<void>
  modifyText(params: { conversationId: string; conversationType: ConversationTypeValue; messageId: string; text: string }): Promise<void>
  getGroupReadReceiptUsers(params: { groupId: string; messageId: string; cursor?: string; pageSize?: number }): Promise<GroupReadReceiptPage>
  // TODO（Phase 3 DB 接入时补）：saveMessage / updateMessageStatus
}
```

> 上表仅为示意骨架，精确签名以 Phase 1 开发时对照 `MessageDomain`/`ConversationDomain`/`ContactDomain`/`GroupDomain`/`PresenceDomain` 的全部公开方法逐项落地；**原则：Domain 现有公开方法 = 契约操作面的最小集合**。
>
> 注意：4.x 群聊"标已读"的 channel 消息需要 `mid`（最后一条已读消息 ID），单聊 read 消息需要 `id`（已读消息 ID）+ `to`——4.x adapter 内部需维护"每会话最后一条已读消息 ID"状态，`markConversationRead` 接口不暴露该细节。

- **装配（Provider 直接传入）**：下游 `import { Webim4Adapter } from '@easemob/uikit-sdk-webim4'`，`<UIKitProvider :adapter="new Webim4Adapter()">`（或 `adapter={Webim4Adapter}` 传构造器）。Provider 的 `sdkConfig` 只保留 SDK 无关字段（`appKey`/`userId`/`token`/`debug`），透传给 adapter。
- **Provider props 兼容策略（向下兼容，非 breaking）**：`appKey`/`sdkConfig` 旧 props **保留不删**，语义定义为"websdk5 快捷方式"——未传 `adapter` 时内部自动 `new Websdk5Adapter()` 并用 `appKey`+`sdkConfig` 初始化；显式传 `adapter` 时 `adapter` 优先、`appKey`/`sdkConfig` 仅作 adapter 的中立 `SdkConfig` 入参。共存规则：`adapter` 传入则忽略默认构造，两边都传时以 `adapter` 为准并告警。这样存量业务方零改动、新接入方才需要 import adapter 包。
- **core Provider 职责重构**：core `useCoreUIKitProvider` 当前承担 SDK 客户端生命周期（`createClient` / `ManagerHost` 代理 / `init`/`login`/`logout` / `PresenceDomain`/`UserInfoDomain` 创建）。收口后 core 不再 `createClient`，改为：**adapter 实例由场景包 Provider 注入 core**，core 负责 adapter 生命周期编排（调用 `adapter.init/login/logout`、把 `adapter.subscribe` 的中立事件桥接到 core stores）、并保留 `ManagerHost` 形态的**中立化接口**（不再是 SDK manager 集合，而是"adapter 操作门面"）供 Domain 消费。`PresenceDomain`/`UserInfoDomain` 改为面向 `adapter.presence` / `adapter.contact`（或注入的用户资料源）实现，不下沉 adapter。装配图：

```text
<UIKitProvider adapter={websdk5Adapter} appKey sdkConfig>
  └─ useUIKitProvider（im 场景）
       └─ useCoreUIKitProvider(adapter, ...)          ← core 编排生命周期
            ├─ adapter.init({appKey, ...sdkConfig})   ← init 时调用
            ├─ adapter.subscribe(handlers)            ← 中立事件 → core stores
            └─ 暴露 ManagerHost 形态的中立门面给 Domain
```

- 两个 adapter 实现同一 `SdkAdapter` 接口；uikit-im 依赖 `SdkAdapter` 契约，**不感知具体 adapter**——切 SDK = 换注入的 adapter。

---

## 三、当前架构现状与耦合盘点（证据）

### 3.1 分层现状（已具备的地基）

- SDK 已收敛到固定位置：core 基座层（`sdk/client.ts` / `sdk/types.ts` / `sdk/types/message.ts` / `sdk/domain/presence|user-info` / `sdk/event/connection-events`）+ im 场景层（`sdk/adapter/*` / `sdk/domain/message|conversation|contact|group` / `sdk/event/*`）。
- UI 层（`modules/` / `components/` / `containers/`）基本 SDK 无关，经 `UiMessage` / `UiConversation` 等展示类型 + adapter 取数。

### 3.2 尚未收口的耦合点（切 SDK 前必须清干净）

1. **运行时（value）import，共 4 处**：
   - core `sdk/client.ts`：`import { ChatClient }`、`import('easemob-websdk').then(({ setLogLevel }))`
   - core `utils/sdk-error.ts`：`import { isSDKError }`
   - im `composables/use-uikit.ts`：`import { ChatManager, ContactManager, GroupManager, PresenceManager, PushManager, UserInfoManager }`（6 个 SDK5 manager 构造器）
2. **类型（type）import，约 40 处**：core 约 21 处、im 约 23 处（`store/message.ts`、`sdk/adapter/message-adapter.ts`、`sdk/event/chat-events.ts`、`modules/chat/message-list.vue`、`components/user-card/user-card-modal.vue` 等）。
3. **类型真相源耦合**：`UiMessage = SdkMessage & UiMessageExtension`（core `sdk/types.ts:96`）直接 extend SDK5 `Message`；`ClientConfig extends InitConfig`（core `sdk/client.ts:51`）；`ManagerHost` 直接暴露 7 个 SDK5 `*Manager` 类型（core `sdk/client.ts:24-45`）。
4. **body 类型守卫按 5.x wire 写死**：core `sdk/types/message.ts:39-74`（`isImageBody` 判 `'localUrl'`、`isVideoBody` 判 `'thumbnailUrl'/'width'`）。
5. **包依赖与构建假设**：
   - im `package.json` `"easemob-websdk": "^5.0.0"` 硬依赖；
   - im `vite.config.ts:69` `external: [... 'easemob-websdk' ...]`、`:78` `globals: { 'easemob-websdk': 'Easemob' }`（UMD 全局名假设）；
   - im `vite.config.ts:10-24` `getSdkVersion()` 读 SDK `package.json` 注入 `__EASEMOB_SDK_VERSION__`。

### 3.3 判断

架构方向先进、UI 已基本 SDK 无关，但**防腐层没收干净**。收口是"UI 零重写"的一次性投入，改的是 SDK 层与类型引用，不动 UI 产物。

---

## 四、执行计划（三阶段）

### Phase 0 —— 前置准备（切全新分支 + 基线）

1. **切全新分支**（必做，大重构 + 新增 adapter，隔离主分支、可随时回滚）：
   - 推荐分两条：Phase 1 → `refactor/sdk-adapter-contract`（合并验证 5.x 后再切 Phase 2）；Phase 2 → `feat/webim4-adapter`。
   - 或一条全包 `feature/sdk-dual-adapter`。从最新 main/develop 切出。
2. **确保工作区干净**：未提交改动先 commit 或 stash，切分支前无残留。
3. **基线记录**：记录当前 5.x 的"行为基线"（demo 各功能截图 / 关键行为清单），作为 Phase 1 收口后"行为不变"回归的对照基准。
4. commit message 用中文；不主动 push（遵循 AGENTS.md）。

### Phase 1 —— 防腐层收口（一次性；做完 5.x 行为不变、UI 不变）

> 施工细节见 [`docs/SDK-ADAPTER-PHASE1-IMPLEMENTATION.md`](SDK-ADAPTER-PHASE1-IMPLEMENTATION.md)（契约类型骨架 + 精确文件改动清单 + 关键映射决策）。

| 步骤 | 内容 | 产出 |
| --- | --- | --- |
| 1.1 | 契约包：定义中立 `SdkMessage` / `*MessageBody` / `SdkConversation` / `SdkContact` / `SdkGroup` / `SdkPresence` + `SdkCapabilities` + `MessageRepository` / `ConversationRepository` 接口 | 中立类型 + 能力矩阵 + 数据入口接口 |
| 1.2 | core 中立化：`UiMessage` 改 extend 中立 `SdkMessage`；body 类型/守卫本地复刻（沿用 5.x 字段名）；`ManagerHost` / `ClientConfig` 泛化为中立接口 | core 不再暴露 SDK5 专属类型 |
| 1.3 | SDK5 adapter 化：把现有 core `client.ts` + im `sdk/adapter|domain|event` 的 SDK5 实现沉淀为 `websdk5` adapter | 现有逻辑迁入 adapter，行为不变 |
| 1.4 | uikit-im 剥干净：删 `package.json` 的 `easemob-websdk` 依赖、改 `vite.config.ts` external/globals/版本注入、约 23 处 `import type` 改经 core 中立符号、`use-uikit.ts` 的 manager 构造器改为注入 | uikit-im 零 SDK 直接依赖 |
| 1.5 | 验证：现有 5.x 全功能回归 + type-check + build + demo 全绿 | Phase 1 完成，5.x 行为与 UI 不变 |

### Phase 2 —— 4.x adapter（每新增一个 SDK 的固定成本；UI 零改动）

> **范围（已确认）**：第一版只做**核心 IM（消息 / 会话 / 联系人 / 群 / 回执）**；Reaction / Thread / 翻译 / 语音转文字 留 TODO 二期。

| 步骤 | 内容 | 产出 |
| --- | --- | --- |
| 2.1 | 新写 `webim4` adapter：`new WebIM.connection({ appKey })` 初始化 + `conn.open({user, accessToken})` 登录 + `connection.send()` 发消息 + `body` 判别联合 → 中立 `UiMessage` 映射 | 4.x 数据链路打通 |
| 2.2 | 语义归一化：清未读（发 read/channel 隐式清）/ 已读回执 / 消息排序 / 会话更新事件对齐 5.x 行为 | uikit-im 看到一致行为 |
| 2.3 | 能力映射：按「九」归一化映射表逐项实现（核心 IM 范围）；回执"消息类型 vs 专用 API"重点回归 | 4.x 能力与 5.x 对齐 |
| 2.4 | 私有化验收：私有化项目接入 4.x adapter，uikit-im dist 与 UI 零改动；先手测核心 IM 逐项可用 | 端到端可用 |

### Phase 3 —— 数据入口层（repository）+ Electron 持久化（与 Phase 2 可并行；UI 零改动）

> **决策（已确认）**：第一版 4.x adapter **无本地库、纯内存 + 服务端漫游**；但 repository 接口在 Phase 1 就定义好（**留口子**），SQLite 实现与"本地/服务端谁权威"时序决策后续再确认。

| 步骤 | 内容 | 产出 |
| --- | --- | --- |
| 3.1 | repository 接口落地：`MessageRepository` / `ConversationRepository` 注入到 Domain（与 `ManagerHost`/`StoreLike` 同模式），不注入时走 SDK 默认实现（现状行为）——**此步即"留口子"，后续 DB 实现只需实现接口** | 数据入口可插拔 |
| 3.2 | 历史加载数据源分支：`MessageDomain.fetchHistory` 改"先读本地、未命中再走漫游"，翻页游标感知本地边界 | 冷启动本地优先 |
| 3.3 | 会话覆盖竞争处理：DB 预填与 SDK 快照合并策略 | DB 独有会话不被冲掉 |
| 3.4 | 序列化清洗：入库前 `toCleanSdkMessage` 式清洗（去 `markRaw`/`File`） | 可 JSON 序列化入库 |
| 3.5 | Electron 实现：SQLite 住主进程 + IPC 桥接 repository 实现 + Electron 环境适配点（麦克风/外链/下载/本地文件/SDK 平台适配） | 端到端持久化可用 |

> 3.2~3.5 为后续 DB 接入时的扩展，**不影响第一版"无本地库"上线**；IPC 边界与一致性已定（见「五、已确认决策」第 12/13 条：DTO 分离 + 服务端权威 + 墓碑 + `msgServerId` 去重），冷启动"先读本地 vs 先连 SDK"的时序细节留待 DB 专项启动时确认。

---

## 五、关键决策点（全部已确认）

### 已确认决策（架构与机制）

1. **事件抽象**：adapter **推事件**给 uikit-im（事件订阅接口），不直接操作 store——保证灵活度与可控性。
2. **装配机制**：adapter 由 **Provider 直接传入**（下游 import adapter 包注入 Provider）；`appKey`/`userId`/`token` 为 SDK 无关字段透传给 adapter。
3. **功能范围**：4.x adapter 第一版只做**核心 IM（消息/会话/联系人/群/回执）**，Reaction/Thread/翻译/语音转文字 留 TODO。
4. **清未读**：4.x 靠"发 read/channel 回执消息"隐式清未读（无专用 API）。
5. **初始化模型**：4.x `new WebIM.connection({ appKey })` 构造传 appKey + `conn.open({user, accessToken})` 登录；与 5.x `ChatClient.init({appKey})` + `client.login()` 对齐。密码登录：4.x `open({user, pwd})` 仍支持（已标 deprecated 但可用），中立 `SdkAdapter.login(user, token)` 的 `token` 参数承载 accessToken 或密码，由 adapter 内部决定如何映射。
6. **中立契约以 5.x 字段命名为基准**：接受，4.x adapter 承担 `body` 判别联合到中立命名的字段映射。**字段名沿用现有 UI 代码使用的 `msgServerId`/`msgLocalId`**（不新造 `serverId`/`localId`，避免大面积改 UI 调用点）；4.x adapter 把 `id` 映射为 `msgServerId`、`SendMsgResult.localMsgId` 映射为 `msgLocalId`。
7. **UMD 全局名**：~~统一改为 `Easemob_4.x` / `Easemob_5.x`~~（原决策有误，已核对源码修正）。**两代 SDK 自带全局名天然不冲突**：4.x 是 `window.WebIM`（`entry.ts` 硬编码），5.x 是 `Easemob`，UIkit 无法也无需改 SDK 自身的全局名。要声明的是 **adapter 包自己产物的 UMD 全局名**：`EasemobUIKitSdkWebsdk5` / `EasemobUIKitSdkWebim4`（合法 JS 标识符，不含 `.`）；adapter 构建的 `external globals` 按 SDK 原生全局名声明（`'easemob-websdk': 'WebIM'` 或 `'Easemob'`，按版本区分）。
8. **Electron 持久化**：第一版**无本地库、纯内存 + 服务端漫游**；repository 接口 Phase 1 定义好（留口子），SQLite 实现后置。

### 已确认决策（数据入口层与验收，本轮定）

9. **契约独立包**：`@easemob/uikit-sdk-contract` 独立包（单一真相源 + 两 adapter 与 im 三方可共享）。
10. **repository 并入契约包**：`MessageRepository`/`ConversationRepository`/`ContactRepository`/`GroupRepository`/`PresenceRepository` 统一放契约包，与中立类型同源。
11. **`UIKitDataSource` 规划为最新形式**：无生产使用，**不保留旧双线**，统一迁移为 repository 数据入口层，旧 `dataSource` 废弃或薄别名过渡。
12. **Electron IPC 序列化边界**：IPC/落库只传**纯数据 DTO**（`MessageRecord`/`ConversationRecord`，JSON 安全、无 `File`/`Blob`/`markRaw`）；分页游标传输不拉全量；附件二进制不进 IPC/SQLite，只存元数据（`url`/`secret`/`filename`/`size`/`duration`）。
13. **本地/服务端数据一致性**：服务端（SDK 漫游）**权威**，本地库是缓存 + 冷启动加速；去重键 `msgServerId`（4.x `id`→中立 `msgServerId`，与决策 6/16 一致）；撤回/删除用**墓碑**（`recalled`/`deleted` + 时间戳）不物理删；本地 pending（仅 `msgLocalId`）回执确认后升格。
14. **验收标准**：Phase 1 门禁全绿 + 5.x 行为不变 + 无 breaking；Phase 2 门禁全绿 + **核心 IM 手测矩阵**（登录/会话/消息/回执/撤回/联系人/群）+ 高级功能正确隐藏 + 消费者验证。
15. **`SdkConfig` 透传槽**：中立 `SdkConfig` 保留 `adapterConfig?: Record<string, unknown>` 透传槽（或等价机制），现有 `sdkConfig` 里的 SDK 特定字段（`enableSyncData`/`deviceId`/`enableUserInfoSync`/`managers` 等）经此透传给 adapter 的 `init`，不被中立契约约束。chatroom 的 `ChatManager/ChatRoomManager/UserInfoManager` 注入也走该槽。
16. **消息 ID 去重键沿用 `msgServerId`**：不新造 `serverId` 字段名，避免 UI 层大面积改名；4.x `id` → `msgServerId` 的映射由 adapter 承担（与决策 6 一致）。

> 剩余**实施细节**（DTO 精确字段清单、归一化映射表补齐、手测矩阵 checklist）在 Phase 1/2 开发前逐项生成，不影响架构决策。

---

## 六、验证门禁（与仓库规则一致）

> **验证顺序原则（必须遵守）**：先 5.x 后 4.x。Phase 1 收口后**必须先验证 5.x 行为不变**（回归隔离），通过后才进入 Phase 2 写 4.x adapter——4.x adapter 建立在中立契约之上，契约的正确性靠 5.x 验证兜底，禁止用未验证的契约去写 4.x。

- `pnpm -F @easemob/uikit-im exec vue-tsc --noEmit`（0 错误）
- `pnpm -F @easemob/uikit-im build`（= vite build + vue-tsc --emitDeclarationOnly）
- `cd apps/demo && pnpm exec vue-tsc --noEmit`
- 5.x 全功能回归（Phase 1 后必须"行为不变"）
- 4.x 手测可用（Phase 2 第一版：核心 IM 逐项手测，对照 5.x 行为）
- 4.x 私有化端到端验收（Phase 2 收尾）
- 消费者验证（tgz 独立工程，参考 `docs/CONSUMER-VALIDATION-CHECKLIST.md`）

---

## 七、风险与工作量提示

1. **语义归一化是主要成本**：未读 / 回执 / 排序 / 事件的行为差异抹平比"写类型"更耗时、更易埋 bug。
2. **回执模型归一化是主要差异**（非能力缺失）：4.x 已读/送达回执是消息类型（`type:'read'|'delivery'|'channel'`，需创建并发送）+ `onReadMessage`/`onDeliveredMessage` 事件；5.x 是 `sendMessageReadReceipts` + `onMessageReceipts`。把"标已读"这一业务语义翻译成两套动作，是 adapter 里最容易出错、需重点回归的部分。
3. **"最小公分母"税**：中立契约要同时满足两代，可能既非 4.x 最优也非 5.x 最优表达；需控制契约不过度抽象。
4. **Phase 1 是一次性投入**：会把 4.x 的交付时间推后（先收口再写 adapter）；若 4.x 时间极紧，可评估"先最小化 4.x 快速版"的并行方案，但长期仍应收口。
5. **数据入口层是"中等规模、不动组件层"扩展**（D85 结论）：store 回流入口与 adapter 现成，缺的是 repository 抽象接口 + 会话覆盖竞争 + 序列化清洗；别低估"本地/服务端数据一致性"的语义成本，它与 SDK 语义归一化同属主要风险。
6. **Electron 环境本身障碍少**（渲染进程 = Chromium、纯 ESM 无 Node 依赖），真正要处理的是权限/外链/下载/文件路径等"注入点"级适配，见 D85「Electron 环境适配点」。
7. **双 adapter 同包名共存**：两代 SDK 同为 `easemob-websdk`（4.24.2 vs ^5.0.0），同装两 adapter 时 npm/pnpm 按版本 range 嵌套共存（合法），但根 `pnpm.overrides` 的 `sdk:use-tgz` 切换脚本只针对 5.x——4.x 联调需要独立的本地引入机制（file: 协议或单独 override），别复用错脚本。
8. **结构型 body 守卫的字段精确性**：中立 `MessageBody` 无 `type` 判别字段，守卫靠字段存在性（`'duration' in body` 等）。4.x 原始 body 字段比中立命名多（如 `ImgMsgBody` 同时有 `url`/`thumb`/`bigImageUrl`）——adapter 映射时**必须精确产出中立字段集**（多余的原始字段要剔除），否则守卫误判（带 `duration` 的视频被误判语音、带 `url` 的图片被误判文件）。这是 4.x adapter 最容易踩的坑，需要针对性单测。
9. **adapter 不能反向依赖 uikit-im**：现有 `sdk/adapter/message-adapter.ts` import 了 im 内部的 `customEventPreviewMap`（`utils/resolve-last-message-text`）。迁入 adapter 包时该工具需下沉 core（贴近 locale）或改为**依赖注入**（adapter 构造参数传入 preview resolver，与 `ConversationDomain` 注入 `resolveSenderName` 同模式）。
10. **`UIKitDataSource` 是已发布的公开 prop**：`uikit-provider.vue` 的 `dataSource?: UIKitDataSource` 即使无生产使用也已发版。处理路径：Phase 1 标记 `@deprecated` 并薄别名转发到 repository 实现；大版本升级时再移除。不直接删。
11. **core 隔离门禁需扩展**：core 现有 `check-engine-isolation.mjs` 只禁 vue/pinia/@vueuse 值依赖；收口后必须把 `easemob-websdk` 加入禁用列表（值 + 类型 import 都禁），防止耦合回流。

---

## 八、4.x 能力与差异映射（基于 `easemob-websdk@4.24.2` 源码核对）

> 本节为 adapter 字段/API 映射的**权威基准**，替代早期"4.x 缺失能力"的误判。所有能力 4.x 均支持，差异在形状与语义。

### 8.1 能力对照表

| 能力 | 4.x（4.24.2）关键 API / 类型 | 5.x 对应 | 差异性质 |
| --- | --- | --- | --- |
| 合并消息 | `CombineMsgBody`（`type:'combine'`，含 `title`/`summary`/`compatibleText`/`combineLevel`/`url`/`secret`/`filename`）、`CreateCombineMsgParameters.messageList`、`downloadAndParseCombineMessage()` | `CombineMessageBody` + `downloadCombine` | `compatibleText`/`combineLevel` 在 body 暴露 vs 5.x 仅创建参数 |
| 置顶消息 | `pinMessage()`/`unpinMessage()`/`getServerPinnedMessages({pageSize,cursor})` → `CursorPinnedMessagesResult`（分页）、`PinnedMessageInfo` | `pinMessage()`/`getPinnedMessageList()`（不分页 max 20） | 4.x 支持分页，5.x 不分页 |
| 置顶会话 | `pinConversation()`/`getServerPinnedConversations()` | `pinConversation` | 形状差异 |
| 流式消息 | `StreamMsgBody extends TextMsgBody`（`stream:{customType,status,errorType,text,finishReason}`，`text` 为增量）、`StreamStatus` 数字 enum、`onStreamMessage` | `StreamMessageMeta`（`deltaText`/`fullText`）+ `onStreamMessage` | `stream.text` vs `deltaText`/`fullText`；status 数字 vs 字符串 |
| 已读/送达回执 | read/delivery/channel 是**消息类型**：`CreateReadMsgParameters`(`type:'read'`,`id`,`ackContent`)、`CreateDeliveryMsgParameters`(`type:'delivery'`,`ackId`)、`ChannelMsgBody`(`type:'channel'` 群已读)；事件 `onReadMessage`/`onDeliveredMessage`；`getGroupMsgReadUser()` | `sendMessageReadReceipts()` + `onMessageReceipts`（批量事件） | **模型差异**：回执即消息 vs 回执即 API |
| 撤回 | `recallMessage({mid,to,type,isChatThread})` | `recallMessage({conversationId,conversationType,messageId})` | 参数形状差异 |
| 编辑 | `modifiedInfo` / `ModifiedMsg` | `modifyMessage` | 形状差异 |
| Reaction / 翻译 / Thread / 语音转文字 | `reactions` / `msgConfig.languages` / `chatThread`+`isChatThread` / voice-to-text | 同域 | 形状差异 |

### 8.2 消息与连接模型差异（adapter 映射核心）

- **消息模型**：4.x `Message{ id, type, body? }`，`body` 是 `type` 判别联合（`MessagesType` = Text/Delivery/Channel/Cmd/Custom/Img/Location/Audio/Video/File/Read/Combine/Stream）；创建走 `Message.create(options)`，发送走 `connection.send(params: MessageBody)`（返回 `SendMsgResult { localMsgId, serverMsgId, message? }`）。**注意：4.x 消息体上无 `conversationId`/`conversationType` 字段**，只有 `chatType` + `to`/`from`——adapter 必须自行推导 `conversationId`（单聊取对端 ID、群聊取 `to`）。
- **消息 ID**：4.x 接收消息单 `id`（映射中立 `msgServerId`）；发送结果 `SendMsgResult` 携带 `localMsgId`/`serverMsgId` 双 ID（映射 `msgLocalId`/`msgServerId`）；单聊消息体带 `isRead`/`isDelivered` 字段（映射 `isPeerRead`/`isPeerDelivered`）。
- **消息体字段名映射（adapter 映射核心，基于 4.24.2 源码核对）**：4.x 字段名与 5.x 语义命名差异较大，adapter 必须逐项翻译，**且输出中立 body 时只写中立字段、不带 4.x 原始字段**（否则结构型守卫会被多出的字段误导判，如 4.x `ImgMsgBody` 同时带 `url` 和 `thumb`）：

| 中立字段（= 5.x 命名） | 4.x 字段 | 备注 |
| --- | --- | --- |
| `type: 'text'` | `type: 'txt'` | 类型字面量也要映射（`txt/img/audio/loc` → `text/image/voice/location`） |
| `body.content` | `body.msg` | 文本 |
| `body.thumbnailUrl` | `body.thumb`（+ `thumb_secret`） | 图片缩略图 |
| `body.originalImageUrl` | `body.originalImageUrl` / `bigImageUrl` | 原图/大图 |
| `body.duration` | `body.length` | 语音/视频时长 |
| `body.fileSize` | `body.file_length` | 文件大小 |
| `body.address` | `body.addr` | 位置地址 |
| `body.latitude` / `longitude` | `body.lat` / `lng` | 经纬度 |
| `body.event` / `params` | `body.customEvent` / `customExts` | 自定义消息 |
| `timestamp` | `time` | 时间戳 |
| `conversationType` | `chatType`（值同为 `singleChat/groupChat`） | |
| `body.title` / `summary` / `compatibleText` / `combineLevel` / `url` / `secret` / `filename` | 同名（`CombineMsgBody`） | 合并消息字段两代基本一致 |
- **事件模型**：4.x 所有事件挂单一 `connection.addEventHandler(id, EventHandlerType)`；**`onMessage` 是批量数组回调**（`msg: MessageBody[]`，离线消息一次多条，且不含 read/delivery/channel/cmd——这些走独立回调），adapter 必须**逐条展开**再回调中立 `onMessage(msg)`；回执走独立 `onReadMessage(ReadMsgBody)`/`onDeliveredMessage(DeliveryMsgBody)`/`onChannelMessage(ChannelMsgBody)`；流式走 `onStreamMessage(StreamMsgBody)`；撤回 `onRecallMessage(RecallMsgBody)`；编辑 `onModifiedMessage(ModifiedEventMessage)`；置顶 `onMessagePinEvent`；presence `onPresenceStatusChange(PresenceType[])`。
- **初始化/连接/登录**（实际用法已确认）：`import WebIM from 'easemob-websdk'` → `const conn = new WebIM.connection({ appKey })`（**appKey 在构造时传入**，与 5.x `ChatClient.init({ appKey })` 对齐）→ `conn.open({ user, accessToken?|pwd? })` 登录。连接事件 `conn.addEventHandler('connectionListener', {...})`：`onConnected` / `onDisconnected`（4.8.0 起带断开原因参数）/ `onReconnecting` / `onTokenWillExpire`（4.15.0 起，Token 有效期 80% 时回调）/ `onTokenExpired` / `onOfflineMessageSyncStart` / `onOfflineMessageSyncFinish`。
- **清未读（已确认）**：4.x 无 `clearConversationUnreadMessageCount` 等价 API（源码已核无此方法），**靠"发 read/channel 回执消息"隐式清未读**：单聊发 `type:'read'` 消息（需 `id` = 已读消息 ID + `to`）；群聊发 `type:'channel'` 消息（**需 `mid` = 最后一条已读消息 ID**，`CreateChannelMsgParameters.mid`）。adapter 内部需维护每会话"最后一条消息 ID"以构造这两个参数。
- **联系人/资料/presence（已核对源码）**：联系人 `getContacts()`（全量）/ `getContactsWithCursor({pageSize:50, cursor})`（游标分页）、`addContact(userId, message)`、黑名单 `getBlocklist()`；用户资料 `fetchUserInfoById(userId | userId[])`；presence `publishPresence` / `subscribePresence` / `unsubscribePresence` / `getSubscribedPresenceList` / `getPresenceStatus({usernames})`——均挂 `connection`，能力与 5.x manager 一一对应。
- **管理器拆分**：4.x 无 ChatManager/ContactManager/GroupManager/PresenceManager/PushManager/UserInfoManager 拆分，全部挂单一 `connection`。
- **会话列表（已核对源码修正）**：游标分页用 `getServerConversations({pageSize: 1-50, cursor, includeEmptyConversations})` → `AsyncResult<ServerConversations>`（含 `cursor` + `channel_infos` → `ConversationItem{conversationId, conversationType, isPinned, pinnedTime, unReadCount, lastMessage}`）；置顶会话 `getServerPinnedConversations({pageSize: 50, cursor})`。⚠️ `getConversationlist()` 是旧 REST 接口（`pageNum`/`pageSize`，上限 20、无游标），`getSessionList()` 已 deprecated——**不要用这两个做 adapter 主链路**。

### 8.3 对 Phase 2 的影响

1. adapter 不是"降级隐藏"，而是**双向字段/API 映射**：把 4.x 的 `body` 判别联合 + read/delivery/channel 消息类型，翻译成中立 `UiMessage`/`UiConversation` 契约。
2. 已读回执需专门设计归一化：中立契约暴露"标已读 / 拉群已读回执用户"语义，adapter 分别落到 4.x 的 read/delivery/channel 消息发送 + `getGroupMsgReadUser`，与 5.x 的 `sendMessageReadReceipts` + `getMessageReadReceipts`。
3. 置顶消息分页语义需在契约层统一（建议契约统一为"分页"：4.x 原生、5.x 一次性全量对齐，或按 max 20 截断）。

---

## 九、功能语义归一化映射表（adapter 开发施工图）

> 这是「八、能力对照表」的下一步：对照表说"都有、差异在写法"，本表把**每个功能点"具体怎么写"**钉死，adapter 开发照着抄、不用再翻两代 SDK 文档。第一版只覆盖核心 IM（消息/会话/联系人/群/回执），Reaction/Thread/翻译/语音转文字 留 TODO 二期补齐。

| 中立契约接口（uikit-im 只调这个） | 5.x adapter 实现 | 4.x adapter 实现 | 差异点 / 注意 |
| --- | --- | --- | --- |
| `markConversationRead({ conversationId, type })` | `chatManager.clearConversationUnreadMessageCount({ conversationId, conversationType: type })` | 单聊：`Message.create({ type:'read', id: lastMsgId, to, chatType:'singleChat' })` 后 `connection.send`；群聊：`Message.create({ type:'channel', mid: lastReadMsgId, ... })` 后 `connection.send` | 4.x 无清未读专用 API，靠发回执消息**副作用**隐式清；**channel 消息必须带 `mid`**（最后一条已读消息 ID），adapter 内部维护 |
| `recallMessage({ conversationId, type, messageId })` | `chatManager.recallMessage({ conversationId, conversationType: type, messageId })` | `connection.recallMessage({ mid: messageId, to: conversationId, type: 'singleChat'\|'groupChat' })` | 参数名/结构不同 |
| `sendMessage(...)` / 各类型消息 | `chatManager.createTextMessage(...)` + `sendMessage(msg)` | `Message.create({ type, ... })` + `connection.send(body)` → `SendMsgResult{localMsgId, serverMsgId}` | 创建/发送 API 形态不同，body 字段需映射（见 8.2 字段映射表）；4.x 类型字面量为 `txt/img/audio/loc` |
| `fetchHistory({ conversationId, type, cursor, pageSize })` | `chatManager.getHistoryMessages({ conversationId, conversationType, pageSize, cursor, searchDirection:'up' })` | `connection.getHistoryMessages({ targetId, chatType, pageSize, cursor, searchDirection })` → `HistoryMessages{cursor?, messages, isLast?}` | 参数名不同（`conversationId` vs `targetId`）；4.x 支持 `searchOptions`（from/msgTypes/时间段） |
| `fetchConversations({ cursor, pageSize })` | 本地快照 + 事件同步，收敛为 `hasMore:false` 或本地切页 | `connection.getServerConversations({ pageSize, cursor, includeEmptyConversations })`（pageSize 1-50）；置顶 `getServerPinnedConversations` | 4.x 原生游标分页、5.x 向下收敛；**勿用 `getConversationlist`**（旧 REST pageNum 分页） |
| `getGroupReadReceiptUsers({ groupId, messageId })` | `chatManager.getMessageReadReceipts(...)` / `getGroupMessageReadUsers(...)` | `connection.getGroupMsgReadUser({ groupId, msgId })` | 参数名 `messageId` vs `msgId` |
| `fetchContacts` | `contactManager.getContacts()`（同步会话同步） | `connection.getContacts()`（全量）/ `getContactsWithCursor({pageSize:50, cursor})` | 4.x 有游标分页可用 |
| `fetchUserInfos` | `userInfoManager.fetchUserInfoById(userIds)` | `connection.fetchUserInfoById(userId \| userId[])` | 同名方法，挂接对象不同 |
| presence 订阅/查询 | `presenceManager.subscribePresence/getPresenceStatus(...)` | `connection.subscribePresence/getPresenceStatus/publishPresence(...)` | 同名方法，挂接对象不同 |
| `subscribe(handlers)` 事件 | `xxxManager.addEventHandler(id, handlers)`（按 manager 拆分） | `connection.addEventHandler(id, EventHandlerType)`（所有事件一个 handler 对象）；**`onMessage` 为批量数组回调，adapter 需逐条展开**；回执走 `onReadMessage`/`onDeliveredMessage`/`onChannelMessage` 独立回调 | 事件名/payload 需逐一映射 |
| TODO | Reaction / Thread / 翻译 / 语音转文字 / 置顶 / 合并转发 | Reaction / Thread / 翻译 / 语音转文字 / 置顶 / 合并转发 | 二期补齐 |

> 完整清单在 Phase 2 开发前逐项补齐；上表先确立"中立接口 × 两代实现"的表格式，开发时照此扩充每一行。
