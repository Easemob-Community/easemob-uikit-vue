/**
 * 旁路持久化钩子统一调用入口（fire-and-forget）。
 *
 * 契约约定（见 `@easemob-community/uikit-sdk-contract` persistence.ts）：
 * - 调用方不 await；实现方内部排队 / 批量 / 事务 / IPC 自行负责；
 * - 钩子同步抛错 / reject 只告警（logger），不阻塞消息链路；
 * - 未注入（undefined）直接跳过，零调用零报错。
 */

/** 钩子调用日志通道的最小形状（createLogger 返回值结构兼容） */
export interface PersistenceLogger {
  warn: (message: string, ...args: unknown[]) => void
}

/**
 * 触发一个旁路持久化钩子：
 * - `hook` 未注入时直接返回；
 * - 经 `Promise.resolve().then()` 调度，同步抛错与 reject 统一收敛为 warn。
 */
export function firePersistenceHook<T extends unknown[]>(
  log: PersistenceLogger,
  label: string,
  hook: ((...args: T) => void | Promise<void>) | undefined,
  ...args: T
): void {
  if (!hook)
    return
  void Promise.resolve()
    .then(() => hook(...args))
    .catch(err => log.warn(`[persistence] ${label} 失败:`, err))
}
