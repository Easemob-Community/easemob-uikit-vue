/**
 * @easemob/uikit-persist-sqlite 入口：`createPersistence(options)` 工厂。
 *
 * 定位（规格书决策 1）：`uikit-sdk-contract` persistence hooks / repository
 * 契约的 SQLite 参考实现 + 官方 Electron 载体，只外挂「实现」，不新增接口面。
 * 业务项目侧只负责：主进程定库文件路径、创建实例注入 Provider、处理宿主适配点。
 *
 * 健壮性纪律（决策 3）：服务端权威，本地永远只是缓存；库损坏 / 迁移失败
 * 一律「删库重建」；写库失败只 warn 不阻塞。
 *
 * 库文件命名（`uikit_<appKey>_<userId>.db`）是 Electron 集成侧的事，
 * 本包 `dbPath` 模式接受调用方给的完整路径。
 */

import { renameSync, rmSync } from 'node:fs'

import { MESSAGE_STATUS } from '@easemob/uikit-sdk-contract'
import type { SdkPersistenceHooks } from '@easemob/uikit-sdk-contract'
import type { PersistenceContext, PersistenceLogger } from './context'
import { openBetterSqlite3Driver } from './driver/driver'
import type { SqliteDriver } from './driver/driver'
import { FtsIndexQueue } from './fts/fts'
import { createPersistenceHooks } from './hooks/hooks'
import { createManagementApi } from './manage/manage'
import type { PersistenceManagementApi } from './manage/manage'
import { createPersistenceRepository } from './repository/repository'
import type { PersistenceRepository } from './repository/repository'
import { ensureSchema } from './schema/schema'

export interface CreatePersistenceOptions {
  /**
   * 宿主注入的已有驱动实例（决策 5「实例可复用」一等场景：
   * 复用 better-sqlite3 Database 时经 `wrapBetterSqlite3` 包一层；
   * SQLCipher 编译版 / node:sqlite 等自定义驱动实现 `SqliteDriver` 注入）。
   * 与 `dbPath` 二选一。
   */
  db?: SqliteDriver
  /** 库文件完整路径（包内用 better-sqlite3 打开）；与 `db` 二选一 */
  dbPath?: string
  /** 账号维度（appKey + userId），写入 meta 供排障与复用校验 */
  account: { appKey: string, userId: string }
  /** SDK adapter 标识：检测到更换 → sync_state 漫游游标清零重校准（数据不动） */
  adapterId?: string
  /** 建库期 ext 索引键（默认预置 `em_at_list`）；运行时不支持动态加 key */
  indexedExtKeys?: string[]
  /** chatRoom 消息是否落库（决策 8.1，默认 false 不落库） */
  persistChatRoom?: boolean
  /**
   * `PRAGMA busy_timeout`（毫秒，默认 3000，WAL 多窗口读场景的锁等待上限）。
   * 经驱动 SQL 下发：dbPath 与注入驱动两种模式都会尽量设置；
   * 注入的自定义驱动若不支持 PRAGMA 语句则只 warn 不生效（包内拿不到底层句柄）。
   * `PRAGMA busy_timeout` in ms (default 3000). Applied via driver SQL in both
   * dbPath and injected-driver modes; drivers without PRAGMA support only warn.
   */
  busyTimeoutMs?: number
  /** 告警通道（默认 console.warn；写库失败只 warn 不阻塞） */
  logger?: PersistenceLogger
}

/** createPersistence 返回句柄 */
export interface UikitPersistence {
  /** 旁路写库钩子（注入 `SdkConfig.persistence`） */
  hooks: SdkPersistenceHooks
  /** repository 读实现（注入 `SdkConfig.repositories`） */
  repository: PersistenceRepository
  /** FTS 队列同步落盘等待口（测试 / 关键时序点用） */
  flushFts: () => void
  close: () => void
}

export type UikitPersistenceHandle = UikitPersistence & PersistenceManagementApi

/**
 * integrity_check 探测：'ok' 正常；'not-ok' 明确损坏；'error' 为探测本身失败
 * （文件头损坏时 better-sqlite3 打开即抛 / 首查抛 SQLITE_NOTADB，按损坏处理）。
 * Integrity probe: 'ok' | 'not-ok' (explicit corruption) | 'error' (probe itself
 * failed — e.g. unreadable file header; treated as corruption in dbPath mode).
 */
function probeIntegrity(db: SqliteDriver): 'ok' | 'not-ok' | 'error' {
  try {
    const row = db.prepare('PRAGMA integrity_check').get()
    return row?.integrity_check === 'ok' ? 'ok' : 'not-ok'
  }
  catch {
    return 'error'
  }
}

/**
 * dbPath 模式开库：integrity_check 自检 + 损坏自愈（决策 3.1 服务端权威兜底）。
 * 损坏时把库文件改名备份为 `<原名>.corrupt-<时间戳>`（WAL 侧车一并清理）后新建空库，
 * 事件经 logger 上报；`:memory:` 无文件语义，直接跳过自检。
 */
async function openWithIntegritySelfHeal(dbPath: string, logger: PersistenceLogger): Promise<SqliteDriver> {
  if (dbPath === ':memory:')
    return openBetterSqlite3Driver(dbPath)

  let driver: SqliteDriver | undefined
  let intact = false
  try {
    driver = await openBetterSqlite3Driver(dbPath)
    intact = probeIntegrity(driver) === 'ok'
  }
  catch {
    intact = false
  }
  if (intact)
    return driver as SqliteDriver

  // 关闭损坏句柄（close 可能抛错，忽略），改名备份 + 清理 WAL 侧车后重建
  try {
    driver?.close()
  }
  catch { /* 损坏库 close 抛错属预期，忽略 */ }
  const backupPath = `${dbPath}.corrupt-${Date.now()}`
  renameSync(dbPath, backupPath)
  for (const sidecar of [`${dbPath}-wal`, `${dbPath}-shm`])
    rmSync(sidecar, { force: true })
  logger.warn(
    `[uikit-persist-sqlite] 库文件损坏或无法打开，已备份为 ${backupPath} 并新建空库（服务端权威，本地只是缓存）`,
  )
  return openBetterSqlite3Driver(dbPath)
}

/**
 * 创建本地持久化实例：打开 / 升级库 → 启动降级 → 装配 hooks / repository / 管理 API。
 *
 * 启动降级（决策 8.4）：库加载后一次性把 `sending` 置为 `failed`——
 * 重启即发送链路已断，避免永远转圈，由用户手动重发。
 *
 * 开库自检：dbPath 模式 integrity_check 失败自动备份重建；宿主注入驱动模式
 * 包内拿不到文件语义，只做探测、损坏时 warn 上报（删库重建由宿主决策）。
 */
export async function createPersistence(options: CreatePersistenceOptions): Promise<UikitPersistenceHandle> {
  if (!options.db && !options.dbPath)
    throw new Error('[uikit-persist-sqlite] createPersistence 需要 db 或 dbPath 之一')

  const logger = options.logger ?? console
  const ownDriver = !options.db
  let db: SqliteDriver
  if (options.db) {
    db = options.db
    // 注入驱动模式：无法改名重建（文件归宿主所有），损坏只 warn 上报；
    // 后续建库 / 读写失败会如实抛出，由宿主按「删库重建」处理
    if (probeIntegrity(db) !== 'ok') {
      logger.warn(
        '[uikit-persist-sqlite] 注入驱动的库 integrity_check 未通过；包内无法自动重建（宿主持有文件），请按「删库重建」处理',
      )
    }
  }
  else {
    db = await openWithIntegritySelfHeal(options.dbPath as string, logger)
  }

  try {
    ensureSchema(db, {
      indexedExtKeys: options.indexedExtKeys,
      account: options.account,
      adapterId: options.adapterId,
      busyTimeoutMs: options.busyTimeoutMs,
      logger,
    })
    // 重启「发送中」降级（sendStatus 取值走契约常量）
    db.prepare('UPDATE uikit_messages SET sendStatus = ? WHERE sendStatus = ?')
      .run(MESSAGE_STATUS.FAILED, MESSAGE_STATUS.SENDING)
  }
  catch (error) {
    // 建库 / 迁移失败：库损坏按「删库重建」处理（服务端权威兜底），这里如实抛出由调用方决策
    if (ownDriver)
      db.close()
    throw error
  }

  const ctx: PersistenceContext = {
    db,
    fts: new FtsIndexQueue(db, logger),
    logger,
    persistChatRoom: options.persistChatRoom ?? false,
  }

  return {
    hooks: createPersistenceHooks(ctx),
    repository: createPersistenceRepository(ctx),
    ...createManagementApi(ctx),
    flushFts: () => ctx.fts.flush(),
    close: () => {
      // 关闭前落盘 FTS 队列尾部，避免尾部消息索引丢失
      ctx.fts.flush()
      // 注入驱动模式不关宿主的 Database（实例归宿主所有，可能还被其它模块复用）；
      // 仅 dbPath 模式（包内自开）由包负责关闭
      if (ownDriver)
        db.close()
    },
  }
}

// 驱动薄接口与默认实现
export { wrapBetterSqlite3 } from './driver/driver'
export type { BetterSqlite3DatabaseLike, SqliteDriver, SqliteStatement } from './driver/driver'

// schema 常量（migration 测试 / 排障用）
export { DEFAULT_INDEXED_EXT_KEYS, SCHEMA_VERSION } from './schema/schema'

// DTO 行映射类型（读回形状含本地库专属列）
export type { LocalStoredMessage } from './records/records'

// 管理 API 类型
export type {
  ClearMessagesFilter,
  LocalMessageInput,
  PersistenceManagementApi,
  StorageStats,
  StoredGroupMember,
  StoredUserInfo,
} from './manage/manage'

// repository / 内部上下文类型
export type { PersistenceRepository } from './repository/repository'
export type { PersistenceLogger } from './context'
