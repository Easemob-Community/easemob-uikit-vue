# Electron 本地持久化（persist-sqlite 包 / demo-electron 验证工程 / 注入链路与排障）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-electron-persistence**。

## 触发词

- `Electron` / `electron 持久化` / `桌面端` / `本地库` / `sqlite` / `better-sqlite3`
- `persist` / `uikit-persist-sqlite` / `createPersistence` / `demo-electron`
- `冷启动` / `离线启动` / `灌数据` / `灌会话` / `数据风暴` / `中文搜索` / `FTS`
- `清库` / `删库重建` / `库损坏` / `backup` / `水位线` / `clearedBefore` / `localPath`

## 目标

避免五类翻车：

1. 把本地库当权威写代码——本地永远只是缓存，服务端（SDK 漫游）才是权威；
2. 凭印象改写库/搜索语义——语义唯一事实源是规格书 + L1 契约套件，不是记忆；
3. 在 UIKit 包里写 Electron 专属逻辑——persist-sqlite 是可选参考实现，UIKit 不依赖它；
4. 调 harness 时踩环境问题（端口错载、原生 ABI、双实例写库）重复浪费时间；
5. 改 persist 包后只跑本包测试——契约/adapter/im 的编译与回归是联动门禁。

## 1. 包与规格（入口）

- 规格唯一事实源：`docs/ELECTRON-PERSISTENCE-IMPLEMENTATION-NOTES.md`（决策 1~8，含六表 DDL、同步语义、验收目标 10 万条全局搜索 P95 小于 500ms）。改设计先改规格书，再改代码。
- 实现包：`packages/uikit-persist-sqlite`（`@easemob/uikit-persist-sqlite`，private 0.1.0 暂不发布），纯 TS Node 库，零 vue/pinia/electron 依赖；`better-sqlite3` 是 optional peer + devDep，宿主可经驱动薄接口注入 SQLCipher / node:sqlite。
- 结构：`src/driver`（薄接口）/ `schema`（DDL + `uikit_meta` 版本化 migration runner）/ `records`（行↔DTO）/ `fts`（trigram + 异步队列）/ `hooks`（写库）/ `repository`（读 + 搜索）/ `manage`（管理 API），入口工厂 `createPersistence(options)`。
- 契约侧配套（`@easemob/uikit-sdk-contract` 1.3.0）：persistence hooks 含 `updateMessagePinned` / `removeConversations`；repository 含可选 `searchMessages` / `searchConversations`。

## 2. 数据语义红线（违反即引入脏数据）

- **服务端权威**：库损坏/不一致的处置永远是删库重建；开库 `integrity_check` 失败自动改名备份（`.corrupt-<时间戳>`）后重建（dbPath 模式）；禁止写「本地有就以本地为准」的分支。
- **墓碑不物理删**：撤回/删除置 `recalled`/`deleted` + `tombstoneTime` 并**联动撤 FTS 行**（否则已撤回内容仍可被搜到）；物理删只有用户主动清除（`clearMessages`/`clearAll`/`removeConversations` 级联可选），清除要写 `clearedBefore` 水位线——之后一切同步/漫游跳过早于水位的消息，「清了就永远不再回来」。
- **去重键 msgServerId**：pending 期存 NULL（不用空串，避开 UNIQUE 冲突），回执后按 `msgLocalId` 升格合并；本地插入消息（`insertLocalMessage`）强制 `local_` 前缀 + `isLocal=1`，不参与同步。
- **写库失败只 warn 不阻塞**（fire-and-forget），显式例外仅 `backup()`（warn 后原样上抛，调用方必须感知）。
- **不落库清单**：chatRoom 消息（弹幕高频无价值）、cmd 透传消息（控制信令）；tip 中性事件**入库但不进 FTS**；翻译/语音转文字/发送进度等展示态 v1 不入库（编辑即作废，维护成本大于收益）。
- **单写者 + 单实例**：SQL 只在主进程，渲染进程一律 IPC；宿主侧 `requestSingleInstanceLock()`；多窗口读走 WAL。
- 重启降级：库加载时一次性把 `sending` 降为 `failed`（重启即发送链路已断），取值走契约 `MESSAGE_STATUS` 常量。
- 登出保留库文件（企微语义），显式清除走 `clearAll()`；库文件按 `appKey + userId` 隔离（文件名特殊字符替换为下划线）。

## 3. 搜索与分页契约

- FTS5 `trigram` 分词（unicode61 不切中文）；**trigram 是三字节滑窗，二字中文词（如「下午」）MATCH 为空——实现侧小于 3 字符自动回落 LIKE**，大于等于 3 字符走 FTS。
- 昵称**不进消息 FTS**（昵称可变，改名后旧索引错位）；昵称搜索走 `uikit_user_info` / `uikit_conversations` 小表 LIKE。合并消息内层文本进 FTS，命中跳外层消息。
- 搜索永远 LIMIT + 游标，无实时 COUNT；会话内搜索强制 `conversationId` 缩圈。
- 分页一律 keyset（消息 `(timestamp, msgServerId)`、会话 `(COALESCE(lastMessageTime, draftTime, createdAt), id)`），**禁用 OFFSET**；会话首页固定含全部置顶。
- 冷启动懒加载：只填会话首页 + 当前会话最近 N 条，禁止「各会话预填」一把搂。
- **内存裁剪是 uikit-im 层行为**：message store `trim` 保留最新 N 条丢最旧，`maxMessageCount` 默认 300 会截断深翻页视图；Electron 场景经 `EmUIKitProvider` 的 `maxMessageCount` prop 调大（demo 传 10000）。**不要**为它加「桌面模式」flag——触发因素是数据源不是平台；推荐值攒多后在 persist 包出 preset 导出。
- 会话列表注入路径：websdk5 adapter 的 `refresh` 只拉首页，`loadMore` 游标续页（触底经 UI 既有 `useInfiniteScroll`）；**webim4 同构旧逻辑（全量拉取）尚未同步**，4.x 联调前必须先对齐。

## 4. 验证工程 demo-electron（harness，非产品 demo）

- 定位：`apps/demo-electron` = Electron 壳 + 测试面板 + **复用 apps/demo 渲染层**（不为它写聊天 UI）；private 不发布。
- 启动：`pnpm -F @easemob/demo-electron dev`（一条命令，自动用专属端口 **5273** 拉起本仓 demo 再起壳）；带 DevTools 用 `dev:console`。**不要**手动另起 `pnpm -F @easemob/demo dev` 配 5173——本机其他项目常占 5173，vite 顺延会错载别的应用（已踩过，demo 已开 strictPort 防顺延）。
- 原生模块：better-sqlite3 必须按 Electron ABI 重编——`pnpm -F @easemob/demo-electron rebuild`（装依赖后或版本变化后一次）；报错 `compiled against a different Node.js version` 即此问题。
- 持久化开关：demo 设置抽屉 → 开发者 →「本地持久化（Electron）」（localStorage 记忆，切换自动刷新；仅壳内可见，Web 模式零影响）。
- 测试面板（右下角 DB 浮球）：库统计 / 灌消息（至 10 万档，中文样本）/ 灌会话（至 1 万档）/ 数据风暴（持续 + 爆发双模式，store + 库双写复刻 onMessage 链路）/ 清空全部 / 删库重开 / 断开 SDK（真断网）；「本地读取活动」区块 + console 的 `[persist]` 日志是判断「数据来自本地库还是 SDK 网络」的精确依据（所有本地读取必经 IPC 代理埋点）。
- 库文件位置：`~/Library/Application Support/@easemob/demo-electron/uikit_<appKey>_<userId>.db`（并行冒烟可用 `DEMO_USER_DATA_DIR` 隔离 userData）；查看用 TablePlus / DB Browser / `sqlite3` CLI，运行中的库是 WAL 模式，数据可能略滞后于 `-wal`。
- 杀进程要杀干净：shell wrapper 被杀不会带走 electron 子进程（`pkill -f "electron/dist/Electron.app"`），残留进程会触发单实例锁让新实例直接退出。

## 5. 排障入口

- 行为不符预期先看面板「本地读取活动」与 console `[persist]` 日志：无记录 = 数据走了 SDK 网络（持久化没接上），有记录看条数/耗时。
- 注入链路：`SdkConfig.persistence` / `repositories` → core 归一化 → adapter Domain（消费点：message.loadMessages / conversation.fetchConversations + loadMore）；demo 侧装配在 `apps/demo/src/composables/use-electron-persist.ts`。
- 改动后门禁（联动）：`pnpm vitest run packages/uikit-persist-sqlite packages/uikit-sdk-contract`（改契约时再加两个 adapter 包）+ 各包 build + `pnpm -F @easemob/demo exec vue-tsc --noEmit`。

## 硬规则 vs 软约定

**硬规则：**

- 本地库永远不是权威；任何不一致的处置都是删库重建。
- 撤回/删除必须联动撤 FTS 行；清除必须写 `clearedBefore` 水位线。
- 分页禁用 OFFSET；搜索禁用无 LIMIT 查询与实时 COUNT。
- uikit-im / core / adapter 包禁止引入 Electron 或 better-sqlite3 依赖；Electron 适配只许存在于 apps/demo-electron 与 persist 包。
- 改 persist 包公开 API（createPersistence options / 管理 API / hooks 行为）必须先改规格书决策条目。
- 事务/upsert/水位线等写库语义变更，必须同步更新 L1 契约套件（`src/__tests__/contract-suite.ts`）。

**软约定：**

- harness 面板功能（灌数/风暴/清理）用最小实现，不引 UI 库。
- 注释中文，对外 API 中英双语；console 输出只用 warn（no-console 规则）。
- 测试数据用 factory（makeRecord/makeConversation）模式。

## 已知漂移（改到相关文件时注意）

- TECH-DEBT D122 Phase 3.5 剩余项：附件被动缓存的 `updateMessageLocalPath` 回填 + LRU 淘汰（`localPath` 列已通）；L3 历史库 fixture migration 测试；webim4 会话分页同构同步；Phase 3.6 验收矩阵真实账号逐项打勾；persist 包发布决策（去 private）。
- v2 项：会话列表虚拟滚动（万级会话 DOM 累积掉帧）、消息滑动窗口内存管理、墓碑 TTL（180 天物理清理）、展示态入库（翻译/语音转文字）。
- trigram 对 emoji/混合符号的召回率未实测，验收时留意。
- **better-sqlite3 ABI 互踩**（2026-09-07 实证）：`demo-electron` 的 rebuild 会把 monorepo 共享存储里的 better-sqlite3 重编为 Electron ABI，之后 Node 侧 vitest 全部 `ERR_DLOPEN_FAILED`（需 `prebuild-install` 恢复 Node ABI）；反之亦然。跑 demo-electron 前先 `pnpm -F @easemob/demo-electron run rebuild`，跑 Node 侧测试前若报错则恢复 Node ABI——两者互斥，以当前要跑的一侧为准。
- 三层自动化验证（2026-09-07）：属性测试 `property.test.ts`（fast-check，种子 20260907 可复现）+ 故障注入 `fault-injection.test.ts` + 性能门禁 `bench/bench.mjs`（`pnpm -F @easemob/uikit-persist-sqlite bench`）；**改动写库语义（事务/upsert/水位线/墓碑/FTS）后必须同步跑属性测试**，撞出反例先定位再修，禁止静默放宽断言。
- 会话搜索链路（2026-09-07）：注入 `searchConversations` 已有 UI 消费者——`conversation-list.vue` 搜索态走 300ms 防抖远程搜索（结果不写 store），未注入回落内存过滤；搜索态触底续页短路 + presence 订阅暂停。改会话搜索时别退回「纯内存过滤」。
- review 待办（2026-09-07 登记，规格书决策 8.14）：conversation-domain 注入路径 refresh/loadMore 并发互斥、refresh 与旁路写库的最终一致瞬时差；websdk5 adapter.ts 既有 `'kicked' is assigned but never used` 死状态（HEAD 存量，非本专项引入）；trim 后 atMe/pinned 关联 map 残留（uikit-im 既有行为）。

## 反面清单

- ❌ 手动起 5173 的 demo 再启动壳——可能加载到本机其他项目；用 `dev` 一条命令。
- ❌ 忘跑 rebuild 就启动——better-sqlite3 ABI 报错，白屏排查半天。
- ❌ 为「Electron 场景」给 Provider 加桌面模式 flag——耦合平台与数据源两个正交维度；用显式 prop / preset。
- ❌ 在 persist 包里加「读不到本地就返回空」以外的兜底权威逻辑——违背服务端权威。
- ❌ 撤回消息只置墓碑不撤 FTS——已撤回内容仍可被搜索命中，政企场景事故。
- ❌ 灌大数据直接用单条 saveMessage 循环——用 saveMessages 分批（500/批）+ 让出事件循环。
