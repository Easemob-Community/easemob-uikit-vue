# Electron SQLite 持久化专项：实施前决策备忘

> 讨论日期：2026-09-04。状态：**决策已沉淀，未实施**。启动专项时以本文为入口，技术细节仍以下游两份文档为准：
> - 概念预研与现状挂点：[ELECTRON-PERSISTENCE-RESEARCH.md](ELECTRON-PERSISTENCE-RESEARCH.md)（D85）
> - 契约/接口/验收矩阵：[SDK-ADAPTER-ABSTRACTION-PLAN.md](SDK-ADAPTER-ABSTRACTION-PLAN.md) Phase 3.5/3.6（D122，3.1~3.4 已落地）
>
> 本文只记录「讨论中新定的四个决策」，不重复上述文档已有的接口定义与验收清单。

## 决策 1：形态——独立外挂库，但只外挂「实现」

- 新建 `@easemob/uikit-persist-sqlite`（参考名），**实现 `uikit-sdk-contract` 已有的 repository / persistence hooks 接口**，不进 UIKit 本体，不新增接口面。
- 业务项目侧只做三件事：主进程定库文件路径（`app.getPath('userData')`）、创建实例注入 Provider（走已落地的 `SdkConfig.repositories` / persistence hooks 链路）、处理 Electron 宿主适配点（麦克风/外链/下载，D85 已列全）。**同步、去重、翻页、搜索逻辑一律不吃项目代码**。
- 通用性判断成立的理由：IM 本地持久化（冷启动/搜索/离线/用户属性缓存）是所有桌面端 IM 的通用需求；SDK 双 adapter 并存倒逼持久化必须走中立 DTO（`MessageRecord`/`ConversationRecord`）与 SDK 版本解耦；同步一致性语义（墓碑/`msgServerId` 去重/pending 升格/漫游权威合并）是最难且最不该被各项目复制一遍的部分——这是「收进库里」的最硬理由。

## 决策 2：仓库归属——当前 monorepo，不单独开仓库

- 落 `packages/uikit-persist-sqlite`。决定性理由：它与 contract 包的 DTO/接口是**共同演化**关系（搜索接口、`maxCachedConversations` 透出、展示态入库 v2 均待定），跨仓库在接口未稳定期摩擦过大；工具链（vitest / aux:gen / vue-tsc 门禁 / changelog:check）与验证环境（apps/）现成。
- **与 D126「五包封顶」的关系**：五包封顶封的是 IM 架构层（portal/集成/总线/OA 适配），persist-sqlite 是契约的参考实现 + 官方 Electron 载体，定位同 websdk5/webim4 adapter（「唯一碰 SQLite 的地方」）。**实施时需在 D126 文档补一句例外说明，避免评审争议**。
- 原生依赖隔离：`better-sqlite3` 声明为该包 peer + devDependency，不进 dependencies，不进任何 Web 产物依赖链；CI/单测可用 Node 22+ 内置 `node:sqlite` 替代（驱动层抽 `prepare/run/all/get` 薄接口）。
- 何时才拆独立仓库：私有化交付要求独立制品库/审批，或 OA 团队需独立 fork。届时拆出成本低（包边界干净），反向合并才贵。

## 决策 3：健壮性设计纪律（按优先级）

1. **服务端权威，本地永远只是缓存**（D122 决策 13）：库损坏/不一致/迁移失败的处理永远是「删库重建」，代码里杜绝任何「本地有就以本地为准」的分支。
2. **写库失败只 warn 不阻塞**：所有 DB 操作 try/catch，错误进 log-store，永不向 UI 冒；对应测试用例为「驱动层抛错时钩子 resolve 而非 reject」。
3. **入库边界只过纯 DTO**（决策 12，`toCleanSdkMessage` 清洗已在 UIKit 侧落地）；附件只存元数据不存二进制。
4. **schema migration 版本化**，按版本号顺序跑升级脚本；禁止「比对表结构再 ALTER」的隐式迁移（桌面端 DB 事故高发源）。**版本号存包自维护的 `uikit_meta` 表，不用 `PRAGMA user_version`**——后者是库文件级全局，与宿主共享库文件时互踩（见决策 5）。
5. **单写者**：SQL 只在主进程执行，渲染进程一律 IPC；多窗口读开 WAL。
6. **中文全文搜索用 FTS5 trigram tokenizer**：默认 `unicode61` 对中文不切词（「明天下午开会」搜「下午」不命中），trigram 零外部依赖、索引体积约 2~3 倍，为本包推荐项；结巴等外部分词扩展引入原生分发问题，与健壮性目标相悖，不采用。
7. `@electron/rebuild` 链路在首次打包验收时跑通一次并写进包 README。
8. **已落地（2026-09-04）**：开库 `integrity_check` 自检 + 损坏自动改名备份重建（`.corrupt-<时间戳>`，仅 dbPath 模式，注入驱动降级为 warn）、`PRAGMA busy_timeout`（默认 3000ms 可配）、`PRAGMA synchronous=NORMAL`、`backup(targetPath)` API（VACUUM INTO）、包 README 运维口径，五项补强已进 `packages/uikit-persist-sqlite`。

## 决策 5：库实例复用与表封闭（「实例可复用，表封闭」）

- **存储范围**：消息 / 会话 / 用户属性（`uikit_user_info` 表 + hooks，契约 user-info domain 已有挂点）/ FTS 索引；附件只存元数据。
- **支持宿主复用 DB 实例（一等场景）**：`createPersistence({ dbPath })` 自开库，`createPersistence({ db })` 注入宿主已有 better-sqlite3 `Database` 实例；宿主库在别的进程或别的库（sql.js/ORM）时，可实现驱动薄接口（`prepare/run/all/get`）注入兜底。
- **复用三规则**：① 表名一律 `uikit_` 前缀；② 版本号走 `uikit_meta` 表（不用 user_version）；③ better-sqlite3 实例不可跨进程，宿主实例须住主进程（与单写者纪律一致）。
- **表封闭**：读写只走 repository/hooks API，表结构不承诺稳定；文档明确「直接读写 `uikit_*` 表 = 后果自负，损坏按删库重建处理」（服务端权威兜底使该策略成立）。用户自有业务数据可在同库文件建自己的表，随意。
- **账号隔离**：库文件按 `appKey + userId` 隔离（文件名或库内 account 维度），复用实例切账号不串数据——schema 设计必须含此维度。

## 决策 4：验证体系——四层测试 + 专项 Electron 验证工程

### 测试分层（用例三来源：D122 决策 12/13 一致性语义、接口签名正常/边界/异常三档、Phase 3.6 验收矩阵）

- **L1 契约行为套件（最先写）**：把 hooks/repository 应满足的语义写成参数化套件（入参 `factory: () => Hooks`），SQLite 实现只是被测对象之一；行为契约被测试固定，实现可换。
- **L2 SQLite 单测**：`better-sqlite3` `:memory:` 实例，同步 API 无需 fake timers；每用例独立实例 + afterEach 清理；覆盖事务回滚、游标边界、排序稳定性、FTS（中文语料必测）。
- **L3 Migration 测试**：历史版本库文件 fixture 提交进仓库，测升级到最新且数据无损；每个新 schema 版本加一条 fixture。
- **L4 E2E**：见下。

### 专项验证工程 `apps/demo-electron`（定位：验证工具 harness，不是产品 demo）

- **单独建的理由**：electron/原生依赖不能进 `apps/demo`（它是 Web 产物消费者验证基准，不能污染其 install 链路）；破坏性测试入口（删库重建/灌消息/断网/DB 状态）不该出现在消费者 demo；主进程适配点（权限/外链/IPC）本身是测试对象。先例：`apps/demo-chatroom`。
- **形态 = 壳 + 测试面板，复用现有 demo 渲染层**：`main.cjs`（窗口 + 权限/外链拦截 + 持久化 IPC 注册）+ `preload.cjs`（IPC 桥）+ 注入 demo 页面一角的测试面板（删库重开/批量灌消息/断 SDK 模拟断网/DB 行数统计）。开发期 `loadURL('http://localhost:5173')` 直连 `apps/demo` dev server，热更新照常；**不为它写任何聊天 UI**。
- private 不发布；生命周期跟随本专项，验收后留作回归工具。
- 验收顺序：冷启动有数据（断网重开）→ 全新安装路径（删 userData）→ 翻页穿内存（300 条后读库再漫游）→ 中文搜索 → 多端撤回/编辑墓碑一致 → 库损坏自愈。打安装包仅首验 rebuild 链路一次。

## 决策 6：Schema 定稿（v1）

> 2026-09-04 与需求方逐条确认后定稿。库文件：`uikit_<appKey>_<userId>.db`（每账号一文件，零 account 列）。`PRAGMA journal_mode=WAL; auto_vacuum=INCREMENTAL;`。

```sql
-- 元信息：schema_version（迁移按序执行，不用 PRAGMA user_version——与宿主共享库时互踩）、
-- adapter_id（SDK adapter 标识，检测到更换 → sync_state 游标清零重校准，数据不动）、account、created_at
CREATE TABLE uikit_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- 消息：写一次整行读的档案型数据，只把过滤/排序/状态更新用到的字段提成列，其余 JSON。
CREATE TABLE uikit_messages (
  msgServerId      TEXT UNIQUE,          -- pending 期为 NULL（NULL 不触发 UNIQUE 冲突）；升格时 UPDATE
  msgLocalId       TEXT NOT NULL UNIQUE, -- 恒存在，pending 定位键；insertLocalMessage 强制 local_ 前缀
  conversationId   TEXT NOT NULL,
  conversationType TEXT NOT NULL,        -- singleChat / groupChat / chatRoom（wire 三值）
  fromUid          TEXT NOT NULL,
  toUid            TEXT NOT NULL,
  type             TEXT NOT NULL,        -- MESSAGE_TYPE 常量值
  sendStatus       TEXT NOT NULL,
  timestamp        INTEGER NOT NULL,     -- ms，排序/游标/水位线键
  isPeerRead       INTEGER,
  isPeerDelivered  INTEGER,
  recalled         INTEGER NOT NULL DEFAULT 0,  -- 墓碑：不物理删
  deleted          INTEGER NOT NULL DEFAULT 0,  -- 墓碑：不物理删（与 clearMessages 物理删语义分立）
  tombstoneTime    INTEGER,
  recallOperator   TEXT,
  pinnedTime       INTEGER,              -- 消息置顶：远端事件校准 + 本地 setMessagePinned 操作
  isLocal          INTEGER NOT NULL DEFAULT 0,  -- 本地插入消息：不参与同步/漫游去重
  body             TEXT NOT NULL,        -- JSON（按类型的 body 结构，附件仅元数据）
  ext              TEXT,                 -- JSON；indexedExtKeys 生成 generated column + 索引
  sender           TEXT,                 -- JSON 冻结快照（发出时资料；展示侧优先 user_info 最新值）
  modifiedInfo     TEXT,                 -- JSON
  extra            TEXT,                 -- JSON：reactions / chatThread 等低频杂项，整列覆盖
  localPath        TEXT                  -- 附件本地缓存路径（被动缓存，见决策 8.5）；未缓存为 NULL
  -- 翻译 / 语音转文字 / 发送进度等 UI 展示态不入库（消息编辑即作废，维护成本大于收益，v2 再议）
  -- chatRoom 类型消息整行不落库（弹幕高频无持久化价值，见决策 8.1）
);
CREATE INDEX idx_msg_cv_ts ON uikit_messages(conversationId, timestamp DESC);

-- FTS：external content，trigram（unicode61 不切中文）。
-- 内容列 = 文本内容 / 文件名 / 位置文本 / 合并消息内层文本（命中跳外层消息）。
-- 不含 sender 昵称：昵称可变，入 FTS 后改名即出现「搜新不命中、搜旧反命中」的错位；
--   昵称搜索走 uikit_user_info / uikit_conversations 小表 LIKE（量级小，无需 FTS）。
-- 不含 tip 类中性事件消息（入库但无人搜，入索引只会稀释结果）。
-- cmd 透传消息整行不入库（控制信令，不进消息流）。
-- 维护方式：主表先写，FTS 队列异步批量合并写，避免高频消息逐条维护索引卡 IPC。
CREATE VIRTUAL TABLE uikit_messages_fts USING fts5(
  content, content='uikit_messages', tokenize='trigram'
);

-- 会话：UiConversation 全标量平铺；与消息表无外键依赖（空会话天然支持）。
CREATE TABLE uikit_conversations (
  id TEXT PRIMARY KEY, type TEXT NOT NULL,
  name TEXT NOT NULL, avatar TEXT,      -- 冗余快照：冷启动快速出画面，user_info 就绪后由 UI 刷新
  unreadCount INTEGER NOT NULL DEFAULT 0,  -- 服务端权威，本地仅快照
  lastMessageText TEXT, lastMessageFrom TEXT, lastMessageTime INTEGER,
  isPinned INTEGER NOT NULL DEFAULT 0, pinnedTime INTEGER,
  isMuted INTEGER NOT NULL DEFAULT 0,
  marks TEXT,                            -- JSON number[]
  draft TEXT, draftTime INTEGER, remindType TEXT,
  createdAt INTEGER NOT NULL             -- 本地首次出现时间（空会话排序 fallback，纯本地语义）
);
-- 排序键：isPinned DESC, COALESCE(lastMessageTime, draftTime, createdAt) DESC

-- 用户属性（自己+他人）。更新时机：登录拉自己；收消息/漫游从 sender 顺带 upsert；
-- 点击资料实时拉；本地缺失时批量补。无 TTL 过期。
CREATE TABLE uikit_user_info (
  userId TEXT PRIMARY KEY, nickname TEXT, avatar TEXT,
  ext TEXT, updatedAt INTEGER NOT NULL
);

-- 群名片/群昵称（(groupId,userId) 二维，user_info 装不下）：有则入库取，无则实时拉。
-- 上层批量更新时机实施时细化（进群拉成员 / 成员变更事件 / 点击资料）。
CREATE TABLE uikit_group_member (
  groupId TEXT NOT NULL, userId TEXT NOT NULL,
  nickname TEXT, avatar TEXT, role TEXT, updatedAt INTEGER NOT NULL,
  PRIMARY KEY (groupId, userId)
);

-- 每会话同步状态：roamCursor 为 SDK opaque 字符串（随 meta.adapter_id 失效清零）；
-- clearedBefore 为清除水位线——一切同步/漫游路径跳过 timestamp < clearedBefore，
-- 保证「用户清了就永远不再回来」（含显式全量漫游）。
CREATE TABLE uikit_sync_state (
  conversationId TEXT PRIMARY KEY,
  roamCursor TEXT, lastSyncedTs INTEGER, clearedBefore INTEGER
);
```

**ext 索引**：建库参数 `indexedExtKeys?: string[]`，每 key 生成 `ext_<key> TEXT GENERATED ALWAYS AS (json_extract(ext,'$.<key>'))` + 索引；UIKit 预置 `em_at_list`（@提及，见 `uikit-im/src/utils/mention.ts`），宿主可追加；运行时动态加 key 不支持（避免在线 DDL）。未声明 key 仍可按 `json_extract` 全表扫查询。

**加密**：v1 不内置；驱动薄接口（`prepare/run/all/get` + 打开参数）允许宿主注入 SQLCipher 编译版驱动（如 `@journeyapps/sqlcipher`），包本体不依赖。

**管理 API**（渲染进程经 IPC 调用）：

```ts
getStorageStats(): Promise<{ dbBytes: number; messageCount: number; oldestMessageTime?: number;
  byConversation: Array<{ conversationId: string; count: number }>; byType: Array<{ type: string; count: number }> }>
clearMessages(filter: { before?: number; type?: string; conversationId?: string }): Promise<number> // 物理删 + 清 FTS + 写 clearedBefore 水位线
clearAll(): Promise<void>  // 全表清 + 水位线
vacuum(): Promise<void>    // INCREMENTAL 回收，清大量历史后调用
insertLocalMessage(input: LocalMessageInput): Promise<MessageRecord>  // msgLocalId 强制 local_ 前缀，isLocal=1
setMessagePinned(msgId: string, pinned: boolean): Promise<void>       -- 纯本地操作；远端 pin 事件经 hooks 校准（远端权威）
```

**契约待补项**（本专项同期做）：① `searchMessages`/`searchConversations` 进 repository 契约；② persistence hooks 增补 `updateMessagePinned(msgId, pinnedTime | null)`（5.x pin 事件旁路；契约 `pinned` 字段与 `getPinnedMessages` 已在）；③ persistence hooks 增补 `removeConversations(ids, opts?: { deleteMessages?: boolean })`（删会话旁路，见决策 8.2）。

## 决策 8：细则补强（2026-09-04 第二轮确认）

1. **chatRoom 消息不落库**：聊天室（弹幕）消息高频无持久化价值，写库路径按 `conversationType === 'chatRoom'` 直接跳过（可配开关，默认关）。
2. **删会话级联可选**：`removeConversations(ids, { deleteMessages })`——`true` 时级联物理删该会话消息 + FTS 行 + sync_state 行（微信语义，与 `clearedBefore`「不再回来」一致）；`false` 时只删会话行，消息保留（会话再浮现时历史还在）。调用方按需选择。
3. **墓碑联动撤 FTS 行**：撤回/删除置墓碑时同步删除 FTS 索引行（消息行保留墓碑）——否则已撤回消息的内容仍能被搜到，政企场景是事故。
4. **重启「发送中」降级**：库加载时一次性 `UPDATE ... SET sendStatus='failed' WHERE sendStatus='sending'`（取值走契约 `MESSAGE_STATUS` 常量）——重启即发送链路已断，避免永远转圈，由用户手动重发。
5. **附件离线 v1 做**：`localPath` 列 + **被动缓存**——用户查看/下载过的附件存 `userData/files/` 并回填 `localPath`，不主动预下载；缓存容量上限可配（默认 2GB），超限按 LRU 淘汰文件并清 `localPath`（消息行与远端 url 不动，可重新下载）。
6. **首次安装回填深度跟随 SDK**：不做本地时间截断配置——默认拉 SDK 会话列表一页，本地上拉未命中时走漫游渐进回填入库；可拉深度由 SDK 版本漫游上限天然兜底（专业版 7 天 / 旗舰版 90 天）。写库压力由批量事务 + 异步写队列兜底。
7. **单实例强制**：主进程 `app.requestSingleInstanceLock()`，第二实例直接退出并聚焦已有窗口；打开库前再校验文件锁，杜绝双进程写同一库（违反单写者）。
8. **版本匹配检查**：persist 包对 `@easemob/uikit-sdk-contract` 声明 peer 范围；启动时检查 DTO 契约版本，不匹配只 warn 不阻断（服务端权威兜底）。
9. **登出保留库文件**（企微语义，下次登录秒开）；显式清除走 `clearAll()`。
10. **墓碑 TTL 归 v2**：撤回/删除墓碑行长期只增不减，v2 加保留期（如 180 天后物理清理），v1 不处理。
11. **`maxMessageCount` 已透出（2026-09-04，Phase 3.6 遗留项）**：`EmUIKitProvider` 新增可选 prop `maxMessageCount`（uikit-provider.vue，有值即 `stores.message.setOptions({ maxMessageCount })`，immediate + watch 运行时调大生效）。默认 300 不变；Electron 本地持久化场景建议 10000（demo-electron 已接通：开关开启时传 10000）。该上限是**内存裁剪上限**（超出裁最旧），不是分页上限；滑动窗口式内存管理（无限翻页且内存恒定）为 v2 项。

## 决策 7：本地分页与冷启动加载量（禁止一把搂）

- **会话分页**：`fetchConversations({cursor, pageSize})` 已实现为 keyset 分页——`WHERE (coalesceTs, id) < (:cursor) ORDER BY isPinned DESC, coalesceTs DESC, id LIMIT n`（`coalesceTs = COALESCE(lastMessageTime, draftTime, createdAt)`）。**不用 OFFSET**（O(n) 随翻页线性变慢）；keyset 走索引 O(log n)。置顶段：置顶集合小，首页固定含全部置顶 + 非置顶 keyset 续页。
- **消息分页**：`loadMessages(conversationId, cursor)` 为 `(timestamp, msgServerId)` keyset（同毫秒并列靠 msgServerId 决胜，保证排序稳定），走 `idx_msg_cv_ts`。
- **冷启动加载量修正**（推翻此前「各会话预填最近 N 条」）：登录后只加载**会话列表第一页**（如 50 条）+ **当前会话**的最近 N 条（如 30 条）；其余会话点进去时再 `loadMessages` 第一页。预填总量与会话数解耦，大会话量账号冷启动耗时恒定。
- **验收目标**：单账号 10 万条消息，全局搜索 P95 < 500ms（LIMIT + 游标分页、无实时 COUNT、会话内搜索强制 conversationId 缩圈）。

## 下一步（启动专项时按序执行）

1. 建 `packages/uikit-persist-sqlite` 骨架：包名定稿、schema v1（按决策 6 六表 + FTS + `uikit_meta` 版本表 + 决策 8 细则）、驱动薄接口、契约待补项三项（`searchMessages`/`searchConversations`/`updateMessagePinned`/`removeConversations`）。
2. 写 L1 契约套件 + 中文 FTS 用例，跑绿（纯 vitest，不开 Electron）。
3. D126 文档补「五包封顶」例外说明；本包 README 写 rebuild 与「删库重建」运维口径。
4. 搭 `apps/demo-electron` 壳 + 测试面板，走通注入链路。
5. 按 Phase 3.6 验收矩阵逐项打勾；搜索接口进契约（`searchMessages`/`searchConversations`）与本专项同期做。
