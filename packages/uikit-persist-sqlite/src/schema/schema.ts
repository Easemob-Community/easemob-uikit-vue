/**
 * Schema v1（规格书决策 6 定稿 DDL 原样落地）+ 版本化 migration runner（决策 3.4）。
 *
 * 要点：
 * - 版本号存 `uikit_meta` 表（不用 PRAGMA user_version——与宿主共享库文件时互踩）；
 * - migration 按版本号顺序执行，禁止「比对表结构再 ALTER」的隐式迁移；
 * - 建库 PRAGMA：WAL（多窗口读）、auto_vacuum=INCREMENTAL；
 * - `indexedExtKeys` 生成 generated column + 索引（预置 `em_at_list`），
 *   仅建库期生效，运行时不支持动态加 key（避免在线 DDL）。
 */

import type { SqliteDriver } from '../driver/driver'

/** 当前 schema 版本（新增 migration 时 +1 并在 MIGRATIONS 追加） */
export const SCHEMA_VERSION = 1

/** UIKit 预置的 ext 索引键（@提及列表，见 uikit-im/src/utils/mention.ts） */
export const DEFAULT_INDEXED_EXT_KEYS: readonly string[] = ['em_at_list']

/** ext 索引键合法性（作为列名/索引名片段，防 SQL 注入与非法标识符） */
const EXT_KEY_PATTERN = /^[a-z_]\w{0,63}$/i

/**
 * v1 基线 DDL：uikit_meta / uikit_messages / uikit_messages_fts /
 * uikit_conversations / uikit_user_info / uikit_group_member / uikit_sync_state。
 * 注释规则落地为代码行为的位置：
 * - 昵称不进 FTS（FTS 内容列拼装见 fts.ts，只取 body 文本类字段）；
 * - tip（notice）入库但不入 FTS；cmd 整行不入库（hooks 写库路径拦截）；
 * - chatRoom 整行不落库（hooks 写库路径按 conversationType 拦截）。
 */
const V1_DDL = `
CREATE TABLE uikit_messages (
  msgServerId      TEXT UNIQUE,
  msgLocalId       TEXT NOT NULL UNIQUE,
  conversationId   TEXT NOT NULL,
  conversationType TEXT NOT NULL,
  fromUid          TEXT NOT NULL,
  toUid            TEXT NOT NULL,
  type             TEXT NOT NULL,
  sendStatus       TEXT NOT NULL,
  timestamp        INTEGER NOT NULL,
  isPeerRead       INTEGER,
  isPeerDelivered  INTEGER,
  recalled         INTEGER NOT NULL DEFAULT 0,
  deleted          INTEGER NOT NULL DEFAULT 0,
  tombstoneTime    INTEGER,
  recallOperator   TEXT,
  pinnedTime       INTEGER,
  isLocal          INTEGER NOT NULL DEFAULT 0,
  body             TEXT NOT NULL,
  ext              TEXT,
  sender           TEXT,
  modifiedInfo     TEXT,
  extra            TEXT,
  localPath        TEXT
);
CREATE INDEX idx_msg_cv_ts ON uikit_messages(conversationId, timestamp DESC);

CREATE VIRTUAL TABLE uikit_messages_fts USING fts5(
  content, content='uikit_messages', tokenize='trigram'
);

CREATE TABLE uikit_conversations (
  id TEXT PRIMARY KEY, type TEXT NOT NULL,
  name TEXT NOT NULL, avatar TEXT,
  unreadCount INTEGER NOT NULL DEFAULT 0,
  lastMessageText TEXT, lastMessageFrom TEXT, lastMessageTime INTEGER,
  isPinned INTEGER NOT NULL DEFAULT 0, pinnedTime INTEGER,
  isMuted INTEGER NOT NULL DEFAULT 0,
  marks TEXT,
  draft TEXT, draftTime INTEGER, remindType TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE uikit_user_info (
  userId TEXT PRIMARY KEY, nickname TEXT, avatar TEXT,
  ext TEXT, updatedAt INTEGER NOT NULL
);

CREATE TABLE uikit_group_member (
  groupId TEXT NOT NULL, userId TEXT NOT NULL,
  nickname TEXT, avatar TEXT, role TEXT, updatedAt INTEGER NOT NULL,
  PRIMARY KEY (groupId, userId)
);

CREATE TABLE uikit_sync_state (
  conversationId TEXT PRIMARY KEY,
  roamCursor TEXT, lastSyncedTs INTEGER, clearedBefore INTEGER
);
`

interface Migration {
  version: number
  up: (db: SqliteDriver, ctx: MigrationContext) => void
}

interface MigrationContext {
  indexedExtKeys: string[]
}

/**
 * ext 索引：每个 key 生成 `ext_<key>` generated column + 索引。
 * generated column 用 VIRTUAL（不物化，写入开销低）；未声明 key 仍可
 * 按 json_extract 全表扫查询。
 */
function createExtIndexes(db: SqliteDriver, keys: string[]): void {
  for (const key of keys) {
    if (!EXT_KEY_PATTERN.test(key))
      throw new Error(`[uikit-persist-sqlite] 非法 indexedExtKeys 键名: ${JSON.stringify(key)}`)
    const column = `ext_${key}`
    db.exec(
      `ALTER TABLE uikit_messages ADD COLUMN "${column}" TEXT GENERATED ALWAYS AS (json_extract("ext", '$.${key}')) VIRTUAL;`,
    )
    db.exec(`CREATE INDEX "idx_msg_ext_${key}" ON uikit_messages("${column}");`)
  }
}

/** migration 登记表：按版本号顺序执行；v1 为初版建表 */
const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: (db, ctx) => {
      db.exec(V1_DDL)
      createExtIndexes(db, ctx.indexedExtKeys)
    },
  },
]

function getMetaValue(db: SqliteDriver, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM uikit_meta WHERE key = ?').get(key)
  return row?.value as string | undefined
}

function setMetaValue(db: SqliteDriver, key: string, value: string): void {
  db.prepare(
    'INSERT INTO uikit_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value)
}

export interface EnsureSchemaOptions {
  /** 建库期 ext 索引键（默认预置 em_at_list） */
  indexedExtKeys?: string[]
  /** 账号维度（appKey + userId），写入 meta 供排障与复用校验 */
  account?: { appKey: string, userId: string }
  /** SDK adapter 标识：检测到更换 → sync_state 游标清零重校准（数据不动） */
  adapterId?: string
  /** 告警通道 */
  logger?: { warn: (...args: unknown[]) => void }
}

/**
 * 打开/升级库：PRAGMA → meta 表 → 按版本号顺序跑 migration。
 * 库损坏 / 迁移失败由调用方按「删库重建」处理（服务端权威，本地永远只是缓存）。
 */
export function ensureSchema(db: SqliteDriver, opts: EnsureSchemaOptions = {}): void {
  const logger = opts.logger ?? console
  db.exec('PRAGMA journal_mode=WAL;')
  db.exec('PRAGMA auto_vacuum=INCREMENTAL;')
  // meta 表先于版本读取创建（幂等）
  db.exec('CREATE TABLE IF NOT EXISTS uikit_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);')

  const current = Number(getMetaValue(db, 'schema_version') ?? 0)
  const indexedExtKeys = opts.indexedExtKeys ?? [...DEFAULT_INDEXED_EXT_KEYS]

  for (const migration of MIGRATIONS) {
    if (migration.version <= current)
      continue
    db.transaction(() => {
      migration.up(db, { indexedExtKeys })
      setMetaValue(db, 'schema_version', String(migration.version))
    })
  }

  // 账号与创建时间：仅首次写入，复用实例切账号时用于比对（不串数据由调用方按文件隔离保证）
  if (opts.account && getMetaValue(db, 'account') === undefined) {
    setMetaValue(db, 'account', `${opts.account.appKey}:${opts.account.userId}`)
    setMetaValue(db, 'created_at', String(Date.now()))
  }

  // adapter 更换检测：sync_state 游标清零重校准（消息/会话数据不动，服务端权威兜底）
  if (opts.adapterId !== undefined) {
    const prev = getMetaValue(db, 'adapter_id')
    if (prev !== undefined && prev !== opts.adapterId) {
      logger.warn(
        `[uikit-persist-sqlite] adapter 更换（${prev} → ${opts.adapterId}），sync_state 漫游游标清零重校准`,
      )
      db.exec('UPDATE uikit_sync_state SET roamCursor = NULL, lastSyncedTs = NULL;')
    }
    if (prev !== opts.adapterId)
      setMetaValue(db, 'adapter_id', opts.adapterId)
  }
}
