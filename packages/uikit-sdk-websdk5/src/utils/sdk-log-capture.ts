/* eslint-disable no-console */

/**
 * SDK 日志捕获模块（环信 easemob-websdk 适配器）。
 *
 * 按能力自适应三种机制（探测链优先级 onLog > setLogger > console 拦截）：
 *
 * - 方案 C（最高优先，`onlog`，SDK 5.1+）：经 `ChatClient.instance.addEventHandler`
 *   注册 `onLog` 事件回调，拿到 SDK 已脱敏的结构化 `LogEntry`
 *   （timestamp/level/message/args），不污染全局 console，也不受
 *   `setConsoleLogEnabled(false)` 影响（SDK 保证关闭控制台输出不影响日志回调）。
 *   能力探测以根导出 `LogEventName` 存在 + client 单例已初始化为条件，
 *   client 尚未 init 时回退到后续方案。
 *
 * - 方案 B（`inject`）：SDK 根导出 `setLogger` 时注入自定义 logger。
 *   SDK 内部所有模块经代理单例调用 logger，注入后全量覆盖；
 *   拿到的是结构化 message + 已脱敏 args，且不污染全局 console。
 *   注意：注入后 SDK 的 `setLogLevel` 失效（仅对内置 DefaultLogger 生效），
 *   因此注入对象自行透传 console 保持开发体验。
 *
 * - 方案 A（降级，`console`）：monkey-patch `console.log`，按 SDK 固定输出格式
 *   `'%c[Chat][LEVEL][HH:mm:ss.SSS]'` 过滤出 SDK 日志。格式变化会失效，
 *   但对非匹配日志零影响（原样透传）。UIKit 自家日志前缀为 `[UIKit:xxx]`，
 *   不会被误收。
 *
 * 归一化入口 `collect()`、数据模型与 Provider 配置三种机制共用。
 *
 * 开启捕获时会把 SDK 日志级别提升到 DEBUG 以全量收集；关闭时若级别是
 * 本模块提升的、且 client 未开 debug（由 setSdkDebugGuard 注入的守卫判定），
 * 则恢复 WARN。
 */

type SdkLogLevelName = 'DEBUG' | 'WARN' | 'ERROR'

/** 日志落库回调（由 UIKit core 注入，避免 adapter 反向依赖 core） */
export interface LogEntry {
  level: 'debug' | 'warn' | 'error'
  source: 'sdk'
  message: string
  args: unknown[]
}

let _appendLog: ((entry: LogEntry) => void) | null = null

/** 注入 SDK 日志落库实现（core 在启用日志持久化时调用） */
export function setSdkLogAppender(appender: (entry: LogEntry) => void): void {
  _appendLog = appender
}

function appendLog(entry: LogEntry): void {
  _appendLog?.(entry)
}

/** SDK 模块的鸭子类型（setLogger/getLogger 为前瞻能力；LogEventName/ChatClient 为 5.1+ 的 onLog 能力） */
interface SdkLoggerModule {
  setLogLevel?: (level: SdkLogLevelName) => void
  setLogger?: (logger: {
    debug: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
  }) => void
  getLogger?: () => {
    debug: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
  }
  /** 5.1+ 日志事件名常量（存在即代表支持 onLog 事件回调） */
  LogEventName?: { LOG?: string }
  ChatClient?: {
    /** SDK 单例（未 init 时为 null） */
    readonly instance: SdkEventHandlerHost | null
  }
}

/** 支持 onLog 事件注册的 client 单例鸭子类型 */
interface SdkEventHandlerHost {
  addEventHandler?: (id: string, handlers: Record<string, (payload: unknown) => void>) => void
  removeEventHandler?: (id: string) => void
}

/** SDK 5.1+ onLog 回调载荷（已脱敏的结构化日志条目） */
interface SdkOnLogPayload {
  level: SdkLogLevelName
  message: string
  args: ReadonlyArray<unknown>
}

/** onLog 事件处理器注册 ID */
const ON_LOG_HANDLER_ID = 'uikit-sdk-log-capture'

/** 方案 A：匹配 SDK console 输出首参 `%c[Chat][DEBUG][12:00:00.000]` */
const SDK_CONSOLE_PREFIX_RE = /^%c\[Chat\]\[(DEBUG|WARN|ERROR)\]\[[^\]]*\]/

const LEVEL_MAP: Record<SdkLogLevelName, 'debug' | 'warn' | 'error'> = {
  DEBUG: 'debug',
  WARN: 'warn',
  ERROR: 'error',
}

let _enabled = false
let _mode: 'onlog' | 'inject' | 'console' | null = null
let _originalConsoleLog: typeof console.log | null = null
let _previousSdkLogger: ReturnType<NonNullable<SdkLoggerModule['getLogger']>> | null = null
let _raisedSdkLevel = false
/** onlog 模式下注册事件的 client 单例（disable 时注销用） */
let _onLogHost: SdkEventHandlerHost | null = null

/**
 * client debug 状态守卫：返回 true 表示 client 自身已开 debug，
 * 关闭捕获时不应把 SDK 日志级别降回 WARN。
 * 由 sdk/client.ts 注入，避免本模块反向依赖 client（保持内核可抽离）。
 */
let _sdkDebugGuard: (() => boolean) | null = null

/** 注册 client debug 状态守卫（UIKit 集成层调用） */
export function setSdkDebugGuard(guard: () => boolean): void {
  _sdkDebugGuard = guard
}

function collect(level: SdkLogLevelName, message: unknown, args: unknown[]): void {
  if (!_enabled)
    return
  appendLog({
    level: LEVEL_MAP[level],
    source: 'sdk',
    message: typeof message === 'string' ? message : String(message),
    args,
  })
}

/** 注入模式下的 console 透传：复刻 SDK DefaultLogger 的输出格式，保持开发体验 */
function passthrough(level: SdkLogLevelName, message: unknown, args: unknown[]): void {
  const raw = _originalConsoleLog ?? console.log
  const time = new Date().toISOString().slice(11, 23)
  raw.call(
    console,
    `%c[Chat][${level}][${time}]`,
    'color: rgb(0, 157, 255); font-weight: bold;',
    message,
    ...args,
  )
}

/** 方案 A：patch console.log，过滤 `[Chat]` 前缀的 SDK 日志，其余原样透传 */
function patchConsole(): void {
  if (_originalConsoleLog)
    return
  _originalConsoleLog = console.log
  console.log = (...args: unknown[]) => {
    try {
      const first = args[0]
      if (typeof first === 'string') {
        const match = first.match(SDK_CONSOLE_PREFIX_RE)
        if (match) {
          collect(match[1] as SdkLogLevelName, args[2], args.slice(3))
        }
      }
    }
    catch {
      // 解析失败不影响透传
    }
    _originalConsoleLog!.apply(console, args)
  }
}

function unpatchConsole(): void {
  if (!_originalConsoleLog)
    return
  console.log = _originalConsoleLog
  _originalConsoleLog = null
}

/** 开启 SDK 日志捕获（幂等） */
export async function enableSdkLogCapture(): Promise<void> {
  if (_enabled)
    return
  _enabled = true
  try {
    const mod = (await import('easemob-websdk')) as unknown as SdkLoggerModule
    // 提升 SDK 日志级别以全量收集（注入模式下该调用失效，但无害）
    if (typeof mod.setLogLevel === 'function') {
      mod.setLogLevel('DEBUG')
      _raisedSdkLevel = true
    }
    // 方案 C（5.1+）：onLog 结构化日志回调，SDK 侧已完成脱敏
    const client = mod.LogEventName ? mod.ChatClient?.instance : null
    if (client && typeof client.addEventHandler === 'function') {
      client.addEventHandler(ON_LOG_HANDLER_ID, {
        onLog: (payload: unknown) => {
          const entry = payload as SdkOnLogPayload
          if (entry && typeof entry.level === 'string' && entry.level in LEVEL_MAP)
            collect(entry.level, entry.message, [...(entry.args ?? [])])
        },
      })
      _onLogHost = client
      _mode = 'onlog'
    }
    else if (typeof mod.setLogger === 'function') {
      // 方案 B：注入自定义 logger，全量接管 SDK 日志
      _previousSdkLogger = typeof mod.getLogger === 'function' ? mod.getLogger() : null
      mod.setLogger({
        debug: (message, ...args) => {
          collect('DEBUG', message, args)
          passthrough('DEBUG', message, args)
        },
        warn: (message, ...args) => {
          collect('WARN', message, args)
          passthrough('WARN', message, args)
        },
        error: (message, ...args) => {
          collect('ERROR', message, args)
          passthrough('ERROR', message, args)
        },
      })
      _mode = 'inject'
    }
    else {
      // 方案 A：console 拦截降级
      patchConsole()
      _mode = 'console'
    }
  }
  catch (e) {
    _enabled = false
    console.warn('[UIKit:SdkLogCapture] failed to enable SDK log capture', e)
  }
}

/** 关闭 SDK 日志捕获（幂等） */
export async function disableSdkLogCapture(): Promise<void> {
  if (!_enabled)
    return
  _enabled = false
  try {
    if (_mode === 'console')
      unpatchConsole()
    if (_mode === 'onlog')
      _onLogHost?.removeEventHandler?.(ON_LOG_HANDLER_ID)
    const mod = (await import('easemob-websdk')) as unknown as SdkLoggerModule
    if (_mode === 'inject' && typeof mod.setLogger === 'function' && _previousSdkLogger)
      mod.setLogger(_previousSdkLogger)
    // 恢复日志级别：仅当级别是本模块提升的、且 client 未开 debug 时才降回 WARN
    if (_raisedSdkLevel && !_sdkDebugGuard?.() && typeof mod.setLogLevel === 'function')
      mod.setLogLevel('WARN')
  }
  catch {
    // 恢复失败不影响主流程
  }
  finally {
    _mode = null
    _onLogHost = null
    _previousSdkLogger = null
    _raisedSdkLevel = false
  }
}
