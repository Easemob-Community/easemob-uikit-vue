/* eslint-disable no-console */

/**
 * UIKit 统一日志工具。
 *
 * 设计目标：
 * - 屏蔽 eslint `no-console` 规则，避免业务代码直接使用原生 console。
 * - 提供级别控制（debug/info/warn/error）与命名空间，方便按模块过滤。
 * - 保留底层 `log` 用于需要自定义样式的场景（如版本号横幅）。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #6b7280',
  info: 'color: #3b82f6',
  warn: 'color: #f59e0b',
  error: 'color: #ef4444',
}

let _globalLevel: LogLevel = 'info'

/** 设置全局最低日志级别，低于该级别的日志不会输出。 */
export function setLogLevel(level: LogLevel): void {
  _globalLevel = level
}

/** 获取当前全局日志级别。 */
export function getLogLevel(): LogLevel {
  return _globalLevel
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/** 创建一个带命名空间的日志器。 */
export function createLogger(namespace: string): Logger {
  function logWithLevel(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[_globalLevel])
      return
    console.log(`%c[${namespace}] ${level.toUpperCase()}: ${message}`, LEVEL_STYLES[level], ...args)
  }

  return {
    debug: (message, ...args) => logWithLevel('debug', message, ...args),
    info: (message, ...args) => logWithLevel('info', message, ...args),
    warn: (message, ...args) => logWithLevel('warn', message, ...args),
    error: (message, ...args) => logWithLevel('error', message, ...args),
  }
}

/** 默认 UIKit 日志器。 */
export const logger = createLogger('UIKit')

/** 底层原始输出，用于需要自定义样式或特殊格式的场景。 */
export function log(message?: unknown, ...optionalParams: unknown[]): void {
  console.log(message, ...optionalParams)
}
