/**
 * clearedBefore 水位线读取（hooks 写侧拦截与 repository 读侧过滤共用）。
 *
 * 语义（规格书决策 6 / 8）：「用户清了就永远不再回来」——一切同步 / 漫游 /
 * 读取路径跳过 timestamp 早于水位线的消息。会话级水位线存
 * `uikit_sync_state.clearedBefore`，clearAll 的全局水位线存 `uikit_meta`
 * （key `global_cleared_before`）；生效水位线 = 两者取大。
 */

import type { SqliteDriver } from './driver/driver'

/** 全局水位线的 meta 键（clearAll / 无 conversationId 的 clearMessages 写入） */
export const GLOBAL_WATERLINE_META_KEY = 'global_cleared_before'

/** 读取会话生效水位线（会话级与全局级取大者；无则 0） */
export function waterlineOf(db: SqliteDriver, conversationId: string): number {
  const conv = db.prepare(
    'SELECT clearedBefore FROM uikit_sync_state WHERE conversationId = ?',
  ).get(conversationId)?.clearedBefore
  const global = db.prepare(
    'SELECT value FROM uikit_meta WHERE key = ?',
  ).get(GLOBAL_WATERLINE_META_KEY)?.value
  return Math.max(Number(conv ?? 0), Number(global ?? 0))
}

/** 只读全局水位线（全局搜索等无会话作用域场景用） */
export function globalWaterlineOf(db: SqliteDriver): number {
  const value = db.prepare(
    'SELECT value FROM uikit_meta WHERE key = ?',
  ).get(GLOBAL_WATERLINE_META_KEY)?.value
  return Number(value ?? 0)
}
