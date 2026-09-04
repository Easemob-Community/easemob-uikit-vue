/**
 * SQLite 驱动薄接口（决策 3 / 决策 5 / 决策 6 加密条款）。
 *
 * 包本体只依赖该形状，不硬绑具体驱动：
 * - 默认实现基于 `better-sqlite3`（peer 依赖，`dbPath` 模式自动加载）；
 * - 宿主可注入自定义驱动（如 SQLCipher 编译版 `@journeyapps/sqlcipher`、
 *   Node 22+ 内置 `node:sqlite`），实现本接口后经 `createPersistence({ db })` 注入。
 *
 * Driver shim: the package only depends on this shape. The default driver wraps
 * `better-sqlite3`; hosts may inject a custom driver (SQLCipher build,
 * `node:sqlite`, …) via `createPersistence({ db })`.
 */

/** 预编译语句薄接口（参数仅限 SQLite 标量：string / number / bigint / null / Uint8Array） */
export interface SqliteStatement {
  /** 执行写操作，返回影响行数与 lastInsertRowid */
  run: (...params: unknown[]) => { changes: number, lastInsertRowid?: number | bigint }
  /** 查询单行（无结果返回 undefined） */
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  /** 查询全部行 */
  all: (...params: unknown[]) => Array<Record<string, unknown>>
}

/** 驱动薄接口：prepare / exec / transaction / close */
export interface SqliteDriver {
  prepare: (sql: string) => SqliteStatement
  /** 执行无参数的批量 SQL（DDL / PRAGMA） */
  exec: (sql: string) => void
  /** 同步事务：fn 内所有写操作要么全部提交要么全部回滚 */
  transaction: <T>(fn: () => T) => T
  close: () => void
}

/** better-sqlite3 Database 的最小结构形状（避免包本体依赖其类型） */
export interface BetterSqlite3DatabaseLike {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number, lastInsertRowid: number | bigint }
    get: (...params: unknown[]) => unknown
    all: (...params: unknown[]) => unknown[]
  }
  exec: (sql: string) => unknown
  transaction: <T>(fn: () => T) => () => T
  close: () => void
}

/** 把 better-sqlite3 Database 实例包成驱动薄接口（宿主复用已有实例时直接用） */
export function wrapBetterSqlite3(db: BetterSqlite3DatabaseLike): SqliteDriver {
  return {
    prepare: sql => db.prepare(sql) as SqliteStatement,
    exec: (sql) => { db.exec(sql) },
    transaction: fn => db.transaction(fn)(),
    close: () => db.close(),
  }
}

/**
 * 打开默认驱动（better-sqlite3）。
 * better-sqlite3 为 optional peer：仅 `dbPath` 模式运行时按需动态加载，
 * 注入 `db` 的场景完全不触碰该依赖。
 */
export async function openBetterSqlite3Driver(dbPath: string): Promise<SqliteDriver> {
  // 动态引入：构建产物中保持 external，运行时才解析宿主的 better-sqlite3
  const mod = (await import('better-sqlite3')) as unknown as {
    default: new (path: string) => BetterSqlite3DatabaseLike
  }
  const BetterSqlite3 = mod.default
  return wrapBetterSqlite3(new BetterSqlite3(dbPath))
}
