/**
 * repository 读实现（规格书决策 7 分页设计）。
 *
 * - `loadMessages`：`(timestamp, msgServerId)` keyset 分页（同毫秒并列靠
 *   msgServerId 决胜保证排序稳定），走 `idx_msg_cv_ts`，不用 OFFSET；
 *   只过滤 deleted（recalled 墓碑行照常返回供 UI 渲染占位），尊重
 *   clearedBefore 水位线（含 clearAll 的全局水位线）；
 * - `fetchConversations`：置顶段 + 非置顶 keyset（首页固定含全部置顶，
 *   置顶集合小；续页只翻非置顶段），排序键
 *   `COALESCE(lastMessageTime, draftTime, createdAt) DESC, id`；
 * - `searchMessages`：FTS5 trigram + LIMIT/游标、会话作用域缩圈、无实时 COUNT。
 *   trigram 索引只含 3 字符以上片段，短关键词（< 3 字符，如中文二字词）
 *   自动回落 body LIKE 扫描（决策 3.6 的中文搜索验收语义优先）。
 * - `searchConversations`：会话名 / 用户昵称小表 LIKE（量级小，无需 FTS）。
 */

import type {
  ConversationPage,
  ConversationSearchParams,
  MessagePage,
  MessageSearchParams,
  UiConversation,
} from '@easemob/uikit-sdk-contract'
import type { PersistenceContext } from '../context'
import { rowToRecord } from '../records/records'

const DEFAULT_PAGE_SIZE = 30

/**
 * 游标编码：JSON 字符串（对调用方 opaque；`c:` 前缀防止外部误传裸 JSON 串
 * 被静默解析成错误形状，解析失败一律按「第一页」处理——服务端权威兜底）。
 */
function encodeCursor(payload: unknown): string {
  return `c:${JSON.stringify(payload)}`
}

function decodeCursor<T>(cursor: string | undefined): T | undefined {
  if (!cursor || !cursor.startsWith('c:'))
    return undefined
  try {
    return JSON.parse(cursor.slice(2)) as T
  }
  catch {
    return undefined
  }
}

/** LIKE 通配符转义（\ % _） */
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, ch => `\\${ch}`)
}

/** FTS MATCH 查询串：整体引号包裹为短语，内部双引号翻倍转义 */
function toFtsQuery(keyword: string): string {
  return `"${keyword.replace(/"/g, '""')}"`
}

/** 消息排序键：pending 期 msgServerId 为 NULL，游标比较统一按空串 */
function sortKeyOf(row: Record<string, unknown>): { ts: number, sid: string } {
  return { ts: Number(row.timestamp), sid: (row.msgServerId as string | null) ?? '' }
}

export interface PersistenceRepository {
  loadMessages: (
    conversationId: string,
    conversationType: string,
    cursor?: string,
    pageSize?: number,
  ) => Promise<MessagePage>
  fetchConversations: (cursor?: string, pageSize?: number) => Promise<ConversationPage>
  searchMessages: (params: MessageSearchParams) => Promise<MessagePage>
  searchConversations: (params: ConversationSearchParams) => Promise<ConversationPage>
}

export function createPersistenceRepository(ctx: PersistenceContext): PersistenceRepository {
  const { db } = ctx

  /** 会话清除水位线（会话级 + clearAll 全局级取大者；无则 0） */
  function waterlineOf(conversationId: string): number {
    const conv = db.prepare(
      'SELECT clearedBefore FROM uikit_sync_state WHERE conversationId = ?',
    ).get(conversationId)?.clearedBefore
    const global = db.prepare(
      'SELECT value FROM uikit_meta WHERE key = ?',
    ).get('global_cleared_before')?.value
    return Math.max(Number(conv ?? 0), Number(global ?? 0))
  }

  async function loadMessages(
    conversationId: string,
    _conversationType: string,
    cursor?: string,
    pageSize: number = DEFAULT_PAGE_SIZE,
  ): Promise<MessagePage> {
    const keyset = decodeCursor<[number, string]>(cursor)
    const waterline = waterlineOf(conversationId)
    const params: unknown[] = [conversationId, waterline]
    let keysetClause = ''
    if (keyset) {
      // (timestamp, msgServerId) keyset：向更老方向翻页
      keysetClause = 'AND (timestamp < ? OR (timestamp = ? AND COALESCE(msgServerId, \'\') < ?))'
      params.push(keyset[0], keyset[0], keyset[1])
    }
    const rows = db.prepare(
      `SELECT rowid, * FROM uikit_messages
      WHERE conversationId = ?
        AND deleted = 0
        AND timestamp >= ?
        ${keysetClause}
      ORDER BY timestamp DESC, COALESCE(msgServerId, '') DESC
      LIMIT ?`,
    ).all(...params, pageSize + 1)

    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const oldest = kept[kept.length - 1]
    const nextCursor = hasMore && oldest ? encodeCursor([Number(oldest.timestamp), sortKeyOf(oldest).sid]) : undefined
    // 与 SDK 漫游 / prependMessages 消费约定一致：页内升序（旧 → 新）
    const list = kept.reverse().map(rowToRecord)
    return { list, cursor: nextCursor, hasMore }
  }

  function rowToConversation(row: Record<string, unknown>): UiConversation {
    let marks: number[] = []
    try {
      marks = row.marks ? JSON.parse(row.marks as string) as number[] : []
    }
    catch { /* marks 损坏按空列表（服务端权威兜底） */ }
    const conversation: UiConversation = {
      id: row.id as string,
      type: row.type as UiConversation['type'],
      name: row.name as string,
      unreadCount: Number(row.unreadCount ?? 0),
      lastMessageText: (row.lastMessageText as string | null) ?? '',
      isPinned: Boolean(row.isPinned),
      isMuted: Boolean(row.isMuted),
      marks,
    }
    if (row.avatar)
      conversation.avatar = row.avatar as string
    if (row.lastMessageFrom)
      conversation.lastMessageFrom = row.lastMessageFrom as string
    if (row.lastMessageTime !== null && row.lastMessageTime !== undefined)
      conversation.lastMessageTime = Number(row.lastMessageTime)
    if (row.pinnedTime !== null && row.pinnedTime !== undefined)
      conversation.pinnedTime = Number(row.pinnedTime)
    if (row.draft)
      conversation.draft = row.draft as string
    if (row.draftTime !== null && row.draftTime !== undefined)
      conversation.draftTime = Number(row.draftTime)
    if (row.remindType)
      conversation.remindType = row.remindType as string
    return conversation
  }

  const SORT_TS_EXPR = 'COALESCE(lastMessageTime, draftTime, createdAt)'

  async function fetchConversations(cursor?: string, pageSize: number = DEFAULT_PAGE_SIZE): Promise<ConversationPage> {
    const keyset = decodeCursor<[number | null, string | null]>(cursor)
    if (!keyset) {
      // 首页：固定含全部置顶（置顶集合小，按置顶时间倒序）+ 非置顶 keyset 填满剩余
      const pinnedRows = db.prepare(
        'SELECT * FROM uikit_conversations WHERE isPinned = 1 ORDER BY pinnedTime DESC, id',
      ).all()
      const remaining = pageSize - pinnedRows.length
      const normalRows = remaining > 0
        ? db.prepare(
          `SELECT * FROM uikit_conversations WHERE isPinned = 0
            ORDER BY ${SORT_TS_EXPR} DESC, id LIMIT ?`,
        ).all(remaining + 1)
        : db.prepare('SELECT * FROM uikit_conversations WHERE isPinned = 0 LIMIT 1').all()
      const hasMore = remaining > 0 ? normalRows.length > remaining : normalRows.length > 0
      const keptNormal = remaining > 0 ? normalRows.slice(0, remaining) : []
      const list = [...pinnedRows, ...keptNormal].map(rowToConversation)
      const lastNormal = keptNormal[keptNormal.length - 1]
      const nextCursor = hasMore
        ? encodeCursor(lastNormal
          ? [Number(lastNormal.lastMessageTime ?? lastNormal.draftTime ?? lastNormal.createdAt), lastNormal.id as string]
          : [null, null])
        : undefined
      return { list, cursor: nextCursor, hasMore }
    }

    // 续页：只翻非置顶段 keyset（置顶已固定在首页）
    const params: unknown[] = []
    let keysetClause = ''
    if (keyset[0] !== null && keyset[0] !== undefined) {
      keysetClause = `AND (${SORT_TS_EXPR} < ? OR (${SORT_TS_EXPR} = ? AND id > ?))`
      params.push(keyset[0], keyset[0], keyset[1])
    }
    const rows = db.prepare(
      `SELECT * FROM uikit_conversations WHERE isPinned = 0 ${keysetClause}
      ORDER BY ${SORT_TS_EXPR} DESC, id LIMIT ?`,
    ).all(...params, pageSize + 1)
    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const last = kept[kept.length - 1]
    const nextCursor = hasMore && last
      ? encodeCursor([Number(last.lastMessageTime ?? last.draftTime ?? last.createdAt), last.id as string])
      : undefined
    return { list: kept.map(rowToConversation), cursor: nextCursor, hasMore }
  }

  /** 可索引类型（与 fts.ts 内容拼装规则对齐；tip / custom / cmd 不入搜索结果） */
  const FTS_INDEXABLE_TYPES = ['text', 'image', 'file', 'voice', 'video', 'location', 'combine']

  async function searchMessages(params: MessageSearchParams): Promise<MessagePage> {
    const keyword = params.keyword.trim()
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
    if (keyword === '')
      return { list: [], hasMore: false }

    const rowidCursor = decodeCursor<number>(params.cursor)
    const scopeClause = params.conversationId ? 'AND m.conversationId = ?' : ''
    const cursorClause = rowidCursor !== undefined ? 'AND m.rowid < ?' : ''

    // trigram 索引片段 ≥ 3 字符：短关键词（如中文二字词）走 body LIKE 回落
    if ([...keyword].length >= 3) {
      const sqlParams: unknown[] = [toFtsQuery(keyword)]
      if (params.conversationId)
        sqlParams.push(params.conversationId)
      if (rowidCursor !== undefined)
        sqlParams.push(rowidCursor)
      const rows = db.prepare(
        `SELECT m.rowid, m.* FROM uikit_messages_fts f
        JOIN uikit_messages m ON m.rowid = f.rowid
        WHERE uikit_messages_fts MATCH ?
          AND m.deleted = 0 AND m.recalled = 0
          ${scopeClause} ${cursorClause}
        ORDER BY m.rowid DESC
        LIMIT ?`,
      ).all(...sqlParams, pageSize + 1)
      const hasMore = rows.length > pageSize
      const kept = hasMore ? rows.slice(0, pageSize) : rows
      const last = kept[kept.length - 1]
      return {
        list: kept.map(rowToRecord),
        cursor: hasMore && last ? encodeCursor(Number(last.rowid)) : undefined,
        hasMore,
      }
    }

    const likeParams: unknown[] = [`%${escapeLike(keyword)}%`]
    if (params.conversationId)
      likeParams.push(params.conversationId)
    if (rowidCursor !== undefined)
      likeParams.push(rowidCursor)
    const rows = db.prepare(
      `SELECT rowid, * FROM uikit_messages
      WHERE deleted = 0 AND recalled = 0
        AND type IN (${FTS_INDEXABLE_TYPES.map(() => '?').join(', ')})
        AND body LIKE ? ESCAPE '\\'
        ${scopeClause} ${cursorClause}
      ORDER BY rowid DESC
      LIMIT ?`,
    ).all(...FTS_INDEXABLE_TYPES, ...likeParams, pageSize + 1)
    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const last = kept[kept.length - 1]
    return {
      list: kept.map(rowToRecord),
      cursor: hasMore && last ? encodeCursor(Number(last.rowid)) : undefined,
      hasMore,
    }
  }

  async function searchConversations(params: ConversationSearchParams): Promise<ConversationPage> {
    const keyword = params.keyword.trim()
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
    if (keyword === '')
      return { list: [], hasMore: false }

    const idCursor = decodeCursor<string>(params.cursor)
    const sqlParams: unknown[] = [`%${escapeLike(keyword)}%`, `%${escapeLike(keyword)}%`]
    let typeClause = ''
    if (params.conversationType) {
      typeClause = 'AND c.type = ?'
      sqlParams.push(params.conversationType)
    }
    let cursorClause = ''
    if (idCursor !== undefined) {
      cursorClause = 'AND c.id > ?'
      sqlParams.push(idCursor)
    }
    const rows = db.prepare(
      `SELECT DISTINCT c.* FROM uikit_conversations c
      LEFT JOIN uikit_user_info u ON u.userId = c.id
      WHERE (c.name LIKE ? ESCAPE '\\' OR u.nickname LIKE ? ESCAPE '\\')
        ${typeClause} ${cursorClause}
      ORDER BY c.id
      LIMIT ?`,
    ).all(...sqlParams, pageSize + 1)
    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const last = kept[kept.length - 1]
    return {
      list: kept.map(rowToConversation),
      cursor: hasMore && last ? encodeCursor(last.id as string) : undefined,
      hasMore,
    }
  }

  return { loadMessages, fetchConversations, searchMessages, searchConversations }
}
