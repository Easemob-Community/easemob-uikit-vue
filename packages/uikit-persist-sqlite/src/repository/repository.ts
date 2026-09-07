/**
 * repository 读实现（规格书决策 7 分页设计，含 2026-09-07 决策 8.13 补强）。
 *
 * - `loadMessages`：`(timestamp, msgServerId, rowid)` 三键 keyset 分页
 *   （同毫秒并列先靠 msgServerId 决胜；pending 期 msgServerId 为 NULL 的多条
 *   再由 rowid 决胜，游标编码向后兼容旧两键游标），走 `idx_msg_cv_ts`，
 *   不用 OFFSET；只过滤 deleted（recalled 墓碑行照常返回供 UI 渲染占位），
 *   尊重 clearedBefore 水位线（含 clearAll 的全局水位线）；
 * - `fetchConversations`：置顶段 + 非置顶 keyset（首页固定含全部置顶，
 *   置顶集合小；续页只翻非置顶段），排序键
 *   `COALESCE(lastMessageTime, draftTime, createdAt) DESC, id`；
 * - `searchMessages`：FTS5 trigram + LIMIT/游标、会话作用域缩圈、无实时 COUNT。
 *   trigram 索引只含 3 字符以上片段，短关键词（< 3 字符，如中文二字词）
 *   自动回落 body LIKE 扫描（决策 3.6 的中文搜索验收语义优先）。
 *   两分支都加水位线过滤（会话作用域取 max(会话水位, 全局水位)；全局搜索按
 *   会话子查询水位线与全局水位线取大）。
 * - `searchConversations`：会话名 / 用户昵称 / 最后一条消息摘要两段匹配——LIKE
 *   子串优先（排前），不足一页时子序列兜底（关键词各字符按序出现即命中，
 *   「需求评审19」可命中「需求评审群 195」），合并去重。匹配列与 uikit-im 内存
 *   过滤口径（getConversationSearchFields）对齐。消息搜索 searchMessages 刻意
 *   不跟进容错匹配：消息内容长、误命中代价高，保持严格子串 / FTS 语义。
 */

import type {
  ConversationListFilter,
  ConversationPage,
  ConversationSearchParams,
  MessagePage,
  MessageSearchParams,
  UiConversation,
} from '@easemob/uikit-sdk-contract'
import type { PersistenceContext } from '../context'
import { rowToRecord } from '../records/records'
import { globalWaterlineOf, waterlineOf } from '../waterline'

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

/** 消息排序键：pending 期 msgServerId 为 NULL，游标比较统一按空串；rowid 第三决胜键 */
function sortKeyOf(row: Record<string, unknown>): { ts: number, sid: string, rowid: number } {
  return {
    ts: Number(row.timestamp),
    sid: (row.msgServerId as string | null) ?? '',
    rowid: Number(row.rowid),
  }
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

/**
 * 子序列匹配：关键词各字符按顺序出现在目标串中即命中
 * （「需求评审19」命中「需求评审群 195」；乱序「95需求」不中）。
 * 大小写不敏感（对齐 LIKE 的 ASCII 语义）。
 * 实现位置说明：子序列在 SQL 侧不好表达，会话 / 用户昵称是千级小表，
 * 读候选列到内存做判定即可（量级前提；若会话量级上到十万再议 SQL 化）。
 */
function isSubsequenceMatch(keyword: string, target: string): boolean {
  const kw = keyword.toLowerCase()
  const tg = target.toLowerCase()
  let i = 0
  for (const ch of tg) {
    if (ch === kw[i])
      i++
    if (i >= kw.length)
      return true
  }
  return false
}

export function createPersistenceRepository(ctx: PersistenceContext): PersistenceRepository {
  const { db, logger } = ctx

  async function loadMessages(
    conversationId: string,
    _conversationType: string,
    cursor?: string,
    pageSize: number = DEFAULT_PAGE_SIZE,
  ): Promise<MessagePage> {
    // 游标三键 [ts, sid, rowid]；旧两键游标可解码（rowid 缺省按 +∞ 处理——
    // 同 ts+sid 的剩余行会随续页全部带出，边界行可能重复一次，仅升级期瞬时态）
    const keyset = decodeCursor<[number, string, number?]>(cursor)
    const waterline = waterlineOf(db, conversationId)
    const params: unknown[] = [conversationId, waterline]
    let keysetClause = ''
    if (keyset) {
      // (timestamp, msgServerId, rowid) keyset：向更老方向翻页
      keysetClause = `AND (
        timestamp < ? OR (timestamp = ? AND (
          COALESCE(msgServerId, '') < ? OR (COALESCE(msgServerId, '') = ? AND rowid < ?)
        ))
      )`
      params.push(keyset[0], keyset[0], keyset[1], keyset[1], keyset[2] ?? Number.MAX_SAFE_INTEGER)
    }
    const rows = db.prepare(
      `SELECT rowid, * FROM uikit_messages
      WHERE conversationId = ?
        AND deleted = 0
        AND timestamp >= ?
        ${keysetClause}
      ORDER BY timestamp DESC, COALESCE(msgServerId, '') DESC, rowid DESC
      LIMIT ?`,
    ).all(...params, pageSize + 1)

    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const oldest = kept[kept.length - 1]
    const nextCursor = hasMore && oldest
      ? encodeCursor([oldest.timestamp, sortKeyOf(oldest).sid, Number(oldest.rowid)])
      : undefined
    // 与 SDK 漫游 / prependMessages 消费约定一致：页内升序（旧 → 新）
    const list = kept.reverse().map(row => rowToRecord(row, logger))
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

  /**
   * em_at_list 匹配表达式：建库声明了 em_at_list 索引键时走 generated column
   * （与索引语义对齐），否则回落 json_extract 原文（宿主自定义 indexedExtKeys
   * 未含 em_at_list 时保证可用；LIKE 前缀通配本就走不上索引，两者性能同阶）。
   */
  const atListExpr = ctx.indexedExtKeys.includes('em_at_list')
    ? 'm.ext_em_at_list'
    : 'json_extract(m.ext, \'$.em_at_list\')'

  /**
   * 过滤条件下推（决策 8.19）：type / unreadOnly 直查列；atMe = 存在 @当前用户
   * 消息（墓碑行不算）。口径差异说明：这里是「存在过 @我消息」的持久语义，
   * 与 UI atMeMap「进入会话即清除高亮」的运行时态不同——过滤 tab 展示的是
   * 历史含 @我 的会话，进入会话清除高亮不影响本过滤结果。
   */
  function filterClauseOf(filter?: ConversationListFilter): { clause: string, params: unknown[] } {
    if (!filter)
      return { clause: '', params: [] }
    const clauses: string[] = []
    const params: unknown[] = []
    if (filter.type !== undefined) {
      clauses.push('c.type = ?')
      params.push(filter.type)
    }
    if (filter.unreadOnly)
      clauses.push('c.unreadCount > 0')
    if (filter.atMe) {
      clauses.push(
        `EXISTS (SELECT 1 FROM uikit_messages m
        WHERE m.conversationId = c.id AND m.deleted = 0 AND m.recalled = 0
          AND ${atListExpr} LIKE '%"' || ? || '"%')`,
      )
      params.push(ctx.accountUserId)
    }
    return { clause: clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '', params }
  }

  async function fetchConversations(cursor?: string, pageSize: number = DEFAULT_PAGE_SIZE, filter?: ConversationListFilter): Promise<ConversationPage> {
    const { clause: filterClause, params: filterParams } = filterClauseOf(filter)
    const keyset = decodeCursor<[number | null, string | null]>(cursor)
    if (!keyset) {
      // 首页：固定含全部置顶（置顶集合小，按置顶时间倒序）+ 非置顶 keyset 填满剩余
      const pinnedRows = db.prepare(
        `SELECT c.* FROM uikit_conversations c WHERE c.isPinned = 1 ${filterClause} ORDER BY c.pinnedTime DESC, c.id`,
      ).all(...filterParams)
      const remaining = pageSize - pinnedRows.length
      const normalRows = remaining > 0
        ? db.prepare(
          `SELECT c.* FROM uikit_conversations c WHERE c.isPinned = 0 ${filterClause}
            ORDER BY ${SORT_TS_EXPR} DESC, c.id LIMIT ?`,
        ).all(...filterParams, remaining + 1)
        : db.prepare(`SELECT c.* FROM uikit_conversations c WHERE c.isPinned = 0 ${filterClause} LIMIT 1`).all(...filterParams)
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

    // 续页：只翻非置顶段 keyset（置顶已固定在首页）；过滤条件同维度参与分页
    const params: unknown[] = [...filterParams]
    let keysetClause = ''
    if (keyset[0] !== null && keyset[0] !== undefined) {
      keysetClause = `AND (${SORT_TS_EXPR} < ? OR (${SORT_TS_EXPR} = ? AND c.id > ?))`
      params.push(keyset[0], keyset[0], keyset[1])
    }
    const rows = db.prepare(
      `SELECT c.* FROM uikit_conversations c WHERE c.isPinned = 0 ${filterClause} ${keysetClause}
      ORDER BY ${SORT_TS_EXPR} DESC, c.id LIMIT ?`,
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
    // 水位线过滤（决策 8.13）：会话作用域取 max(会话水位, 全局水位)；全局搜索按
    // 会话子查询水位线与全局水位线取大（MAX 标量函数，每行求值、可走消息表索引）
    const waterlineClause = params.conversationId
      ? 'AND m.timestamp >= ?'
      : `AND m.timestamp >= MAX(
          COALESCE((SELECT s.clearedBefore FROM uikit_sync_state s WHERE s.conversationId = m.conversationId), 0),
          ?
        )`
    const waterlineParam = params.conversationId
      ? waterlineOf(db, params.conversationId)
      : globalWaterlineOf(db)

    // trigram 索引片段 ≥ 3 字符：短关键词（如中文二字词）走 body LIKE 回落
    if ([...keyword].length >= 3) {
      const sqlParams: unknown[] = [toFtsQuery(keyword), waterlineParam]
      if (params.conversationId)
        sqlParams.push(params.conversationId)
      if (rowidCursor !== undefined)
        sqlParams.push(rowidCursor)
      const rows = db.prepare(
        `SELECT m.rowid, m.* FROM uikit_messages_fts f
        JOIN uikit_messages m ON m.rowid = f.rowid
        WHERE uikit_messages_fts MATCH ?
          AND m.deleted = 0 AND m.recalled = 0
          ${waterlineClause}
          ${scopeClause} ${cursorClause}
        ORDER BY m.rowid DESC
        LIMIT ?`,
      ).all(...sqlParams, pageSize + 1)
      const hasMore = rows.length > pageSize
      const kept = hasMore ? rows.slice(0, pageSize) : rows
      const last = kept[kept.length - 1]
      return {
        list: kept.map(row => rowToRecord(row, logger)),
        cursor: hasMore && last ? encodeCursor(Number(last.rowid)) : undefined,
        hasMore,
      }
    }

    const likeParams: unknown[] = [`%${escapeLike(keyword)}%`, waterlineParam]
    if (params.conversationId)
      likeParams.push(params.conversationId)
    if (rowidCursor !== undefined)
      likeParams.push(rowidCursor)
    const rows = db.prepare(
      `SELECT m.rowid, m.* FROM uikit_messages m
      WHERE m.deleted = 0 AND m.recalled = 0
        AND m.type IN (${FTS_INDEXABLE_TYPES.map(() => '?').join(', ')})
        AND m.body LIKE ? ESCAPE '\\'
        ${waterlineClause}
        ${scopeClause} ${cursorClause}
      ORDER BY m.rowid DESC
      LIMIT ?`,
    ).all(...FTS_INDEXABLE_TYPES, ...likeParams, pageSize + 1)
    const hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const last = kept[kept.length - 1]
    return {
      list: kept.map(row => rowToRecord(row, logger)),
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
    // LIKE 三段匹配列各一份参数（name / nickname / lastMessageText）
    const likePattern = `%${escapeLike(keyword)}%`
    const sqlParams: unknown[] = [likePattern, likePattern, likePattern]
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
    // 第一段：LIKE 严格子串（匹配列：会话名 / 用户昵称 / 最后一条消息摘要——
    // 与 uikit-im 内存过滤 getConversationSearchFields 口径对齐）
    const rows = db.prepare(
      `SELECT DISTINCT c.* FROM uikit_conversations c
      LEFT JOIN uikit_user_info u ON u.userId = c.id
      WHERE (c.name LIKE ? ESCAPE '\\' OR u.nickname LIKE ? ESCAPE '\\' OR c.lastMessageText LIKE ? ESCAPE '\\')
        ${typeClause} ${cursorClause}
      ORDER BY c.id
      LIMIT ?`,
    ).all(...sqlParams, pageSize + 1)
    let hasMore = rows.length > pageSize
    const kept = hasMore ? rows.slice(0, pageSize) : rows
    const hitIds = new Set(kept.map(r => r.id as string))

    // 第二段：子序列兜底——子串命中不足一页时读候选列到内存补足
    // （子串命中排前、按 id 合并去重；仅第一段没填满才触发，纯子串页零开销）
    const tail: Array<Record<string, unknown>> = []
    if (kept.length < pageSize) {
      const candidateParams: unknown[] = []
      let candidateTypeClause = ''
      if (params.conversationType) {
        candidateTypeClause = 'AND c.type = ?'
        candidateParams.push(params.conversationType)
      }
      let candidateCursorClause = ''
      if (idCursor !== undefined) {
        candidateCursorClause = 'AND c.id > ?'
        candidateParams.push(idCursor)
      }
      const candidates = db.prepare(
        `SELECT c.*, u.nickname AS nickname FROM uikit_conversations c
        LEFT JOIN uikit_user_info u ON u.userId = c.id
        WHERE 1 = 1 ${candidateTypeClause} ${candidateCursorClause}
        ORDER BY c.id`,
      ).all(...candidateParams) as Array<Record<string, unknown>>
      const remaining = pageSize - kept.length
      /** 子序列兜底命中判定：会话名 / 用户昵称 / 最后一条消息摘要三列 */
      const matchCandidate = (candidate: Record<string, unknown>): boolean => {
        const name = (candidate.name as string | null) ?? ''
        const nickname = (candidate.nickname as string | null) ?? ''
        const lastMessageText = (candidate.lastMessageText as string | null) ?? ''
        return isSubsequenceMatch(keyword, name)
          || (nickname !== '' && isSubsequenceMatch(keyword, nickname))
          || (lastMessageText !== '' && isSubsequenceMatch(keyword, lastMessageText))
      }
      for (const candidate of candidates) {
        const id = candidate.id as string
        if (hitIds.has(id))
          continue
        if (!matchCandidate(candidate))
          continue
        tail.push(candidate)
        hitIds.add(id)
        if (tail.length >= remaining)
          break
      }
      // 子序列段还有更多候选可命中时翻页继续（游标仍按 id 推进，两段同序）
      if (tail.length >= remaining) {
        const restHasMore = candidates.some(c => !hitIds.has(c.id as string) && matchCandidate(c))
        hasMore = hasMore || restHasMore
      }
    }

    const merged = [...kept, ...tail]
    const last = merged[merged.length - 1]
    return {
      list: merged.map(rowToConversation),
      cursor: hasMore && last ? encodeCursor(last.id as string) : undefined,
      hasMore,
    }
  }

  return { loadMessages, fetchConversations, searchMessages, searchConversations }
}
