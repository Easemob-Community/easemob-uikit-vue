/**
 * 日志持久化内核（IndexedDB）。
 *
 * 通用性设计（未来可整体抽离为独立通用库）：
 * - 本模块不 import 任何 UIKit 业务代码（logger / sdk / store），只依赖浏览器 IndexedDB；
 * - 日志来源 `source` 是开放字符串，入口统一为 `appendLog()`，任何来源适配器
 *   （UIKit logger sink、环信 SDK 捕获、业务自定义来源）都只是调用方；
 * - 库名 / 保留策略均可配置（`configureLogPersistence`）。
 *
 * UIKit 侧的绑定在 `utils/logger-binding.ts`（sink 注册）与
 * `utils/sdk-log-capture.ts`（环信 SDK 适配器）；抽离通用库时替换这两个文件即可。
 *
 * 降级策略：IndexedDB 不可用（隐私模式 / SSR）时整个模块退化为 no-op，
 * 仅输出一次 console.warn，不影响正常日志的 console 输出。
 */

/** 持久化日志级别（与 UIKit logger 级别一致，但内核不依赖其定义） */
export type PersistedLogLevel = 'debug' | 'info' | 'warn' | 'error'

/** SDK 日志级别（SDK 无 info 级） */
export type SdkPersistedLogLevel = 'debug' | 'warn' | 'error'

const LEVEL_ORDER: Record<PersistedLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/** 内置日志来源；业务可通过 appendLog 传入任意自定义来源字符串 */
export type PersistedLogSource = 'uikit' | 'sdk'

/** 持久化的单条日志 */
export interface PersistedLogEntry {
  /** 时间戳（Date.now()） */
  ts: number
  /** 级别（SDK 的 DEBUG/WARN/ERROR 映射为小写） */
  level: PersistedLogLevel
  /** 来源：内置 'uikit' / 'sdk'，也允许业务自定义 */
  source: PersistedLogSource | (string & {})
  /** 命名空间（如 'UIKit:MessageStore'），可选 */
  ns?: string
  /** 日志主消息 */
  message: string
  /** 附加参数的安全序列化结果（深度/循环兜底 + 单条截断 2KB） */
  data?: string
}

/** 日志持久化配置 */
export interface LogPersistenceConfig {
  /** 是否持久化日志（默认 true） */
  enabled?: boolean
  /** 是否同时收集 SDK 日志（默认 false，UIKit 侧语义，驱动 sdk-log-capture） */
  collectSdkLog?: boolean
  /**
   * UIKit 层（及业务自定义来源）的收集级别（默认 'info'）。
   * 低于该级别的日志在 appendLog 入口即被丢弃（不付序列化成本）。
   * 生产建议 'info'；排查时临时调 'debug' 复现。
   */
  uikitLevel?: PersistedLogLevel
  /**
   * SDK 层的收集级别（默认 'warn'）。
   * SDK 无 info 级；DEBUG 含心跳/同步队列等高频日志，全开会极速冲刷环形缓冲，
   * 生产建议 'warn'，排查时临时调 'debug'。
   */
  sdkLevel?: SdkPersistedLogLevel
  /** 最大保留条数，超出后删除最旧（默认 5000） */
  maxEntries?: number
  /** 保留天数，过期删除（默认 7） */
  retentionDays?: number
  /**
   * IndexedDB 库名（默认 'easemob_uikit_logs'）。
   * 仅在首次打开数据库前配置生效；业务多实例共存时可用库名隔离。
   */
  dbName?: string
}

/** 持久化日志查询过滤条件 */
export interface PersistedLogFilter {
  level?: PersistedLogLevel
  source?: PersistedLogSource | (string & {})
  /** 只查该时间戳之后的日志（Date.now() 口径） */
  since?: number
  /** 最多返回最近 N 条 */
  limit?: number
}

/** 追加日志的入参（来源适配器统一走这个入口） */
export interface AppendLogInput {
  level: PersistedLogLevel
  source: PersistedLogSource | (string & {})
  ns?: string
  message: string
  args?: unknown[]
}

const DEFAULT_DB_NAME = 'easemob_uikit_logs'
const DB_VERSION = 1
const STORE_NAME = 'entries'
const TS_INDEX = 'by_ts'

/** 单条 data 字段最大长度（2KB），防止巨型对象撑爆存储 */
const MAX_DATA_LENGTH = 2048
/** 参数序列化的最大嵌套深度，压平 stringify 的最坏成本 */
const MAX_SERIALIZE_DEPTH = 3
/** 内存缓冲达到该条数即触发落库 */
const FLUSH_THRESHOLD = 20
/** 定时落库间隔（ms） */
const FLUSH_INTERVAL = 2000

interface ResolvedConfig {
  enabled: boolean
  collectSdkLog: boolean
  uikitLevel: PersistedLogLevel
  sdkLevel: SdkPersistedLogLevel
  maxEntries: number
  retentionDays: number
  dbName: string
}

const DEFAULT_CONFIG: ResolvedConfig = {
  enabled: true,
  collectSdkLog: false,
  uikitLevel: 'info',
  sdkLevel: 'warn',
  maxEntries: 5000,
  retentionDays: 7,
  dbName: DEFAULT_DB_NAME,
}

let _config: ResolvedConfig = { ...DEFAULT_CONFIG }

let _dbPromise: Promise<IDBDatabase | null> | null = null
/** IDB 不可用时的降级标记，避免反复尝试打开 */
let _disabled = false
let _warned = false
/** 过期清理每个会话只做一次（容量上限则每次 flush 都执行） */
let _expiryPruned = false

let _buffer: PersistedLogEntry[] = []
let _flushTimer: ReturnType<typeof setInterval> | null = null
let _pageHooksBound = false

function warnOnce(message: string, ...args: unknown[]): void {
  if (_warned)
    return
  _warned = true
  console.warn(`[LogStore] ${message}`, ...args)
}

/**
 * 深度受限的结构克隆：Error 提取 name/message，循环/重复引用兜底，
 * 超过 MAX_SERIALIZE_DEPTH 的层级压平为 '[Deep]'，避免 stringify 巨型对象。
 */
function limitDepth(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value instanceof Error)
    return { name: value.name, message: value.message }
  if (typeof value === 'bigint')
    return String(value)
  if (typeof value === 'function')
    return '[Function]'
  if (!value || typeof value !== 'object')
    return value
  if (seen.has(value))
    return '[Circular]'
  if (depth >= MAX_SERIALIZE_DEPTH)
    return Array.isArray(value) ? '[Array]' : '[Deep]'
  seen.add(value)
  if (Array.isArray(value))
    return value.map(item => limitDepth(item, depth + 1, seen))
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value))
    out[key] = limitDepth(val, depth + 1, seen)
  return out
}

/** 安全序列化附加参数：先深度受限克隆，再 stringify，结果截断 2KB */
export function safeSerializeLogArgs(args: unknown[]): string | undefined {
  if (!args.length)
    return undefined
  try {
    const seen = new WeakSet<object>()
    const text = JSON.stringify(args.map(arg => limitDepth(arg, 0, seen)))
    if (text.length > MAX_DATA_LENGTH)
      return `${text.slice(0, MAX_DATA_LENGTH)}…(truncated)`
    return text
  }
  catch {
    return '[Unserializable]'
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (_dbPromise)
    return _dbPromise
  _dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      _disabled = true
      warnOnce('indexedDB unavailable, log persistence disabled')
      resolve(null)
      return
    }
    try {
      const request = indexedDB.open(_config.dbName, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
          store.createIndex(TS_INDEX, 'ts', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        _disabled = true
        warnOnce('failed to open indexedDB, log persistence disabled', request.error)
        resolve(null)
      }
    }
    catch (e) {
      _disabled = true
      warnOnce('failed to open indexedDB, log persistence disabled', e)
      resolve(null)
    }
  })
  return _dbPromise
}

async function flush(): Promise<void> {
  if (!_buffer.length)
    return
  const batch = _buffer
  _buffer = []
  const db = await openDb()
  if (!db)
    return
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const entry of batch) store.put(entry)

      // 容量维护（与批量写同一事务）：
      // - 容量上限每次 flush 都执行（count + 游标删最旧），长会话也不会超限漂移；
      // - 过期清理每个会话只做一次（_expiryPruned），二者共用一次升序游标扫描：
      //   索引按 ts 升序，过期条目与「最旧超额条目」都是前缀，删到边界即停。
      const doExpiry = !_expiryPruned
      _expiryPruned = true
      const cutoff = Date.now() - _config.retentionDays * 24 * 60 * 60 * 1000
      const index = store.index(TS_INDEX)
      index.count().onsuccess = (e) => {
        let excess = Math.max(0, (e.target as IDBRequest<number>).result - _config.maxEntries)
        const cursorRequest = index.openCursor()
        cursorRequest.onsuccess = (ce) => {
          const cursor = (ce.target as IDBRequest<IDBCursorWithValue | null>).result
          if (!cursor)
            return
          const entry = cursor.value as PersistedLogEntry
          const expired = doExpiry && entry.ts < cutoff
          if (expired || excess > 0) {
            if (excess > 0)
              excess -= 1
            cursor.delete()
            cursor.continue()
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        warnOnce('flush failed', tx.error)
        resolve()
      }
    })
  }
  catch (e) {
    warnOnce('flush failed', e)
  }
}

function bindPageHooks(): void {
  if (_pageHooksBound || typeof window === 'undefined')
    return
  _pageHooksBound = true
  window.addEventListener('pagehide', () => void flush())
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden')
        void flush()
    })
  }
}

/** 追加一条日志（所有来源适配器的统一入口），先进内存缓冲再批量落库 */
export function appendLog(input: AppendLogInput): void {
  if (!_config.enabled || _disabled)
    return
  // 分级过滤前置：低于收集级别的日志直接丢弃，不付序列化成本
  const minLevel = input.source === 'sdk' ? _config.sdkLevel : _config.uikitLevel
  if (LEVEL_ORDER[input.level] < LEVEL_ORDER[minLevel])
    return
  _buffer.push({
    ts: Date.now(),
    level: input.level,
    source: input.source,
    ns: input.ns,
    message: input.message,
    data: input.args ? safeSerializeLogArgs(input.args) : undefined,
  })
  bindPageHooks()
  if (_buffer.length >= FLUSH_THRESHOLD) {
    void flush()
  }
  else if (!_flushTimer) {
    _flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL)
  }
}

/**
 * 应用日志持久化配置（Provider `logger` prop 响应式下发；业务也可直接调用）。
 * `collectSdkLog` 变化时联动启停 SDK 日志捕获。
 */
export function configureLogPersistence(config: LogPersistenceConfig): void {
  const prev = _config
  _config = {
    enabled: config.enabled ?? DEFAULT_CONFIG.enabled,
    collectSdkLog: config.collectSdkLog ?? DEFAULT_CONFIG.collectSdkLog,
    uikitLevel: config.uikitLevel ?? DEFAULT_CONFIG.uikitLevel,
    sdkLevel: config.sdkLevel ?? DEFAULT_CONFIG.sdkLevel,
    maxEntries: config.maxEntries ?? DEFAULT_CONFIG.maxEntries,
    retentionDays: config.retentionDays ?? DEFAULT_CONFIG.retentionDays,
    dbName: config.dbName ?? DEFAULT_CONFIG.dbName,
  }
  if (_dbPromise && _config.dbName !== prev.dbName)
    warnOnce(`dbName changed after database opened ("${prev.dbName}"), keeping the original one`)
  if (_config.collectSdkLog !== prev.collectSdkLog || _config.enabled !== prev.enabled) {
    // 动态引入避免与 sdk-log-capture 形成静态循环依赖
    void import('./sdk-log-capture').then(({ disableSdkLogCapture, enableSdkLogCapture }) => {
      if (_config.enabled && _config.collectSdkLog)
        enableSdkLogCapture()
      else
        disableSdkLogCapture()
    })
  }
}

/** 查询持久化日志（按时间升序返回） */
export async function getPersistedLogs(filter: PersistedLogFilter = {}): Promise<PersistedLogEntry[]> {
  const db = await openDb()
  if (!db)
    return []
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => {
        let list = (request.result as PersistedLogEntry[]).sort((a, b) => a.ts - b.ts)
        if (filter.level)
          list = list.filter(e => e.level === filter.level)
        if (filter.source)
          list = list.filter(e => e.source === filter.source)
        if (filter.since !== undefined)
          list = list.filter(e => e.ts >= filter.since!)
        if (filter.limit !== undefined && filter.limit >= 0)
          list = list.slice(-filter.limit)
        resolve(list)
      }
      request.onerror = () => {
        warnOnce('query failed', request.error)
        resolve([])
      }
    }
    catch (e) {
      warnOnce('query failed', e)
      resolve([])
    }
  })
}

/** 清空全部持久化日志 */
export async function clearPersistedLogs(): Promise<void> {
  _buffer = []
  const db = await openDb()
  if (!db)
    return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    }
    catch {
      resolve()
    }
  })
}

function pad2(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** 本地时区可读时间：2026-08-13 11:14:32.249 */
function formatLogTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad2(d.getMilliseconds(), 3)}`
}

/** 将日志格式化为纯文本行（导出文件 / 复制排查用） */
export function formatPersistedLogs(entries: PersistedLogEntry[]): string {
  return entries
    .map((e) => {
      const time = formatLogTime(e.ts)
      const ns = e.ns ? `:${e.ns}` : ''
      const data = e.data ? ` ${e.data}` : ''
      return `[${time}] [${e.level.toUpperCase()}] [${e.source}${ns}] ${e.message}${data}`
    })
    .join('\n')
}

/** 导出全部持久化日志为 .log 文件并触发浏览器下载，返回导出条数 */
export async function exportPersistedLogs(): Promise<number> {
  const entries = await getPersistedLogs()
  if (typeof document === 'undefined')
    return entries.length
  const text = formatPersistedLogs(entries)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  a.href = url
  a.download = `easemob-uikit-im-logs-${stamp}.log`
  a.click()
  URL.revokeObjectURL(url)
  return entries.length
}
