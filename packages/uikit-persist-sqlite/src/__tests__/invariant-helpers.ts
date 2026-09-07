/**
 * 属性测试共享不变量检查器：从 DB 直读全量计算「期望可见集」，
 * 与 repository 读路径（loadMessages 翻页 / searchMessages 搜索）对照。
 *
 * 可见集语义（规格书决策 6/8 + 决策 8.13）：
 * - deleted=1 不可见（recalled 墓碑行可见——UI 渲染占位）；
 * - timestamp < 生效水位线（会话级与全局取大）不可见；
 * - 搜索额外排除 recalled（SQL 层 recalled=0）。
 */

import type { MessageRecord } from '@easemob/uikit-sdk-contract'
import type { SqliteDriver } from '../driver/driver'
import type { PersistenceRepository } from '../repository/repository'

/** DB 直读某会话全部消息行（测试观测口，绕过 repository） */
export function readAllRows(driver: SqliteDriver, conversationId: string): Array<Record<string, unknown>> {
  return driver.prepare(
    'SELECT rowid, * FROM uikit_messages WHERE conversationId = ?',
  ).all(conversationId)
}

/** 生效水位线（会话级 + 全局取大） */
export function effectiveWaterline(driver: SqliteDriver, conversationId: string): number {
  const conv = driver.prepare(
    'SELECT clearedBefore FROM uikit_sync_state WHERE conversationId = ?',
  ).get(conversationId)?.clearedBefore
  const global = driver.prepare(
    'SELECT value FROM uikit_meta WHERE key = ?',
  ).get('global_cleared_before')?.value
  return Math.max(Number(conv ?? 0), Number(global ?? 0))
}

/** 期望可见集（msgLocalId 集合）：deleted=0 且 ts >= 水位线 */
export function expectedVisibleIds(driver: SqliteDriver, conversationId: string): Set<string> {
  const waterline = effectiveWaterline(driver, conversationId)
  const ids = new Set<string>()
  for (const row of readAllRows(driver, conversationId)) {
    if (Number(row.deleted))
      continue
    if (Number(row.timestamp) < waterline)
      continue
    ids.add(row.msgLocalId as string)
  }
  return ids
}

/** 期望可搜索集（msgLocalId 集合）：可见 + 非 recalled + 内容含关键词（按 body JSON 子串判定，与 FTS/LIKE 两实现的命中域对齐） */
export function expectedSearchableIds(driver: SqliteDriver, keyword: string, conversationId?: string): Set<string> {
  const ids = new Set<string>()
  const convIds = conversationId
    ? [conversationId]
    : (driver.prepare('SELECT DISTINCT conversationId FROM uikit_messages').all().map(r => r.conversationId as string))
  for (const cvsId of convIds) {
    const waterline = effectiveWaterline(driver, cvsId)
    for (const row of readAllRows(driver, cvsId)) {
      if (Number(row.deleted) || Number(row.recalled))
        continue
      if (Number(row.timestamp) < waterline)
        continue
      const body = typeof row.body === 'string' ? row.body : ''
      if (body.includes(keyword))
        ids.add(row.msgLocalId as string)
    }
  }
  return ids
}

/** repository 读路径全量翻页收集（循环到 hasMore=false） */
export async function collectAllViaPaging(
  repository: PersistenceRepository,
  conversationId: string,
  conversationType: string,
): Promise<MessageRecord[]> {
  const all: MessageRecord[] = []
  let cursor: string | undefined
  for (let round = 0; round < 1000; round++) {
    const page = await repository.loadMessages(conversationId, conversationType, cursor, 30)
    all.push(...page.list)
    if (!page.hasMore)
      return all
    cursor = page.cursor
  }
  throw new Error('翻页超过 1000 轮未到底（疑似游标不推进）')
}

/** repository 搜索路径全量翻页收集 */
export async function collectSearchViaPaging(
  repository: PersistenceRepository,
  keyword: string,
  conversationId?: string,
): Promise<MessageRecord[]> {
  const all: MessageRecord[] = []
  let cursor: string | undefined
  for (let round = 0; round < 1000; round++) {
    const page = await repository.searchMessages({ keyword, conversationId, cursor, pageSize: 30 })
    all.push(...page.list)
    if (!page.hasMore)
      return all
    cursor = page.cursor
  }
  throw new Error('搜索翻页超过 1000 轮未到底（疑似游标不推进）')
}

/** 单行性检查：同一 msgServerId（非 NULL）在库中至多一行；返回冲突的 serverId 列表 */
export function findDuplicateServerIds(driver: SqliteDriver): string[] {
  return driver.prepare(
    `SELECT msgServerId FROM uikit_messages
     WHERE msgServerId IS NOT NULL
     GROUP BY msgServerId HAVING COUNT(*) > 1`,
  ).all().map(r => r.msgServerId as string)
}
