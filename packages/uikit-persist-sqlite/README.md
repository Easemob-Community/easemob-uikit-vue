# @easemob/uikit-persist-sqlite

`@easemob/uikit-sdk-contract` persistence hooks / repository 契约的 **SQLite 参考实现**，
也是官方 Electron 本地持久化载体（规格书：`docs/ELECTRON-PERSISTENCE-IMPLEMENTATION-NOTES.md`）。

- 纯 TS Node 库：零 vue / pinia / electron 依赖，只依赖契约包；
- 只外挂「实现」，不新增接口面：产物为 `SdkPersistenceHooks` + repository 读实现 + 管理 API；
- 同步一致性语义（墓碑 / `msgServerId` 去重 / pending 升格 / 清除水位线 / keyset 分页 /
  FTS 中文搜索）全部收在库内，业务项目只注入不写字库逻辑。

> private 包（0.1.0），当前不发布 npm。

## 安装

```bash
pnpm add @easemob/uikit-persist-sqlite better-sqlite3
```

`better-sqlite3` 是 **optional peer dependency**：
`dbPath` 模式运行时按需加载；注入自有驱动（`db` 模式）时完全不触碰该依赖。
Electron 打包需对 `better-sqlite3` 跑 `@electron/rebuild`（首次打包验收时跑通一次即可）。

## 用法

```ts
import Database from 'better-sqlite3'
import { createPersistence, wrapBetterSqlite3 } from '@easemob/uikit-persist-sqlite'

// dbPath 模式：包内用 better-sqlite3 打开（Electron 主进程）
const persistence = await createPersistence({
  dbPath: '/path/to/userData/uikit_<appKey>_<userId>.db',
  account: { appKey: 'your-app-key', userId: 'user-id' },
  adapterId: 'websdk5',
})

// 注入宿主已有 better-sqlite3 实例（实例复用，一等场景）
const persistence2 = await createPersistence({
  db: wrapBetterSqlite3(new Database('/path/to/userData/uikit_<appKey>_<userId>.db')),
  account: { appKey: 'your-app-key', userId: 'user-id' },
})

// 注入 UIKit Provider
const client = new SDKClient({
  appKey: 'your-app-key',
  // ...其它初始化配置
  persistence: persistence.hooks, // 旁路写库
  repositories: { message: persistence.repository, conversation: persistence.repository }, // 读路径接管
})
void client
void persistence2
```

### Options（`CreatePersistenceOptions`）

| 字段              | 类型                 | 默认             | 说明                                                                 |
| ----------------- | -------------------- | ---------------- | -------------------------------------------------------------------- |
| `db`              | `SqliteDriver`       | —                | 注入驱动实例（与 `dbPath` 二选一）                                   |
| `dbPath`          | `string`             | —                | 库文件完整路径；`':memory:'` 为内存库                                |
| `account`         | `{ appKey, userId }` | 必填             | 账号维度，写入 meta 供排障与复用校验                                 |
| `adapterId`       | `string`             | —                | SDK adapter 标识；检测到更换时 sync_state 漫游游标清零（数据不动）   |
| `indexedExtKeys`  | `string[]`           | `['em_at_list']` | 建库期 ext 索引键（generated column + 索引）；运行时不支持动态加 key |
| `persistChatRoom` | `boolean`            | `false`          | chatRoom（弹幕）消息是否落库                                         |
| `busyTimeoutMs`   | `number`             | `3000`           | `PRAGMA busy_timeout`，WAL 多窗口读场景的锁等待上限                  |
| `logger`          | `{ warn }`           | `console`        | 告警通道（写库失败只 warn 不阻塞）                                   |

### 返回句柄（`UikitPersistenceHandle`）

- `hooks`：`SdkPersistenceHooks`（saveMessage(s) / updateMessageStatus / markMessageRecalled /
  updateMessageContent / deleteMessages / updateMessagePinned / saveConversations / removeConversations）；
- `repository`：`loadMessages` / `fetchConversations` / `searchMessages` / `searchConversations`
  （keyset 分页、FTS5 trigram 中文搜索、无实时 COUNT）；
- 管理 API：`getStorageStats` / `clearMessages` / `clearAll` / `vacuum` / `backup(targetPath)` /
  `insertLocalMessage` / `setMessagePinned`；
- 用户属性 / 群成员：`upsertUserInfos` / `getUserInfos` / `upsertGroupMembers` / `getGroupMembers`；
- `flushFts()`：FTS 异步队列同步落盘口；`close()`：关闭前自动落盘 FTS 尾部。

## 安全与健壮性口径

- **全参数化查询**：所有 SQL 走参数绑定（含 `VACUUM INTO ?`）；唯一文本拼接处是
  `indexedExtKeys` 的 DDL 键名（`/^[a-z_]\w{0,63}$/i` 白名单校验，非法直接抛错）与
  `busy_timeout`（收敛为非负整数），均无注入面。
- **开库自检 + 自动重建**：dbPath 模式打开已有库后跑 `PRAGMA integrity_check`；
  失败时把库文件改名备份为 `<原名>.corrupt-<时间戳>`（WAL 侧车一并清理）并新建空库，
  事件经 logger 上报。**服务端权威，本地永远只是缓存**——库损坏 / 迁移失败的运维口径
  就是「删库重建」，代码里杜绝任何「本地有就以本地为准」的分支。
- **PRAGMA 基线**：`journal_mode=WAL`（多窗口读）、`auto_vacuum=INCREMENTAL`、
  `synchronous=NORMAL`（WAL 标准搭配）、`busy_timeout=3000`（可配）。
- **写库失败只 warn 不阻塞**：hooks 全部 try/catch，错误进 logger，永不向消息链路冒。
  例外：`backup()` 失败在 warn 后原样上抛（调用方必须明确感知备份失败）。
- **单写者 / 单实例**：SQL 只在 Electron 主进程执行（渲染进程走 IPC）；
  宿主侧 `app.requestSingleInstanceLock()` 强制单实例，杜绝双进程写同一库。
- **表封闭**：`uikit_` 前缀表只走本包 API 读写；直接手改表 = 后果自负，损坏按删库重建处理。

## 驱动注入（加密 / 替代驱动）

包本体只依赖 `SqliteDriver` 薄接口（`prepare / exec / transaction / close`）：

- **SQLCipher**：用 SQLCipher 编译版（如 `@journeyapps/sqlcipher`）打开数据库后
  `wrapBetterSqlite3(db)` 注入（接口与 better-sqlite3 一致），加密密钥管理归宿主；
- **`node:sqlite`**（Node 22+ 内置）：实现同形状薄接口后注入即可；
- 注入模式的两个限制：`integrity_check` 损坏只 warn 不重建（文件归宿主，删库重建是宿主决策）；
  `busy_timeout` 经 SQL 下发尽量设置，驱动不支持 PRAGMA 语句时只 warn 不生效。

## 库文件命名约定

`uikit_<appKey>_<userId>.db`（每账号一文件，零 account 列）。
定路径是 Electron 集成侧职责（`app.getPath('userData')`），本包 `dbPath` 接受调用方给的完整路径。
登出保留库文件（下次登录秒开）；显式清除走 `clearAll()`。

## 测试

```bash
pnpm vitest run packages/uikit-persist-sqlite
```

L1 契约行为套件（`src/__tests__/contract-suite.ts`，实现可换）+ L2 SQLite 单测
（`:memory:` + 临时文件库，含中文 FTS 语料与损坏自愈）+ 层 1 属性测试
（`src/__tests__/property.test.ts`，fast-check 随机操作流 + 四类不变量，种子固定可复现）

- 层 2 故障注入（`src/__tests__/fault-injection.test.ts`，随机抛错驱动 + 损坏 fuzz 二值化结局）。

## 性能基准

```bash
pnpm -F @easemob/uikit-persist-sqlite bench   # 先 build 再跑 bench/bench.mjs（dist 产物）
```

数据规模：10 万消息（100 会话，含 1 个 6000 条热点会话）+ 1 万会话。门禁阈值（超标非零退出）：

| 基准项                          | 阈值           | 口径                                                          |
| ------------------------------- | -------------- | ------------------------------------------------------------- |
| 全局三字中文搜索（FTS trigram） | P95 < 500ms    | 规格书验收口径，50 次取 P95                                   |
| 二字 LIKE 回落搜索              | P95 < 1000ms   | 回落路径放宽值：全表扫 body JSON 不走索引，是二字中文词的兜底 |
| 单会话深翻页（100 页）          | 均值 < 50ms/页 | keyset 走索引                                                 |
| 会话列表首页 + 20 续页          | 均值 < 50ms/页 | 置顶段 + keyset 续页                                          |

灌入吞吐与库文件大小仅打印参考（不做阈值断言）。
