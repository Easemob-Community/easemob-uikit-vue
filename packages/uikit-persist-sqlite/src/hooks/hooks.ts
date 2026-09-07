/**
 * 旁路持久化 hooks 实现（契约 `SdkPersistenceHooks` 的 SQLite 落地）。
 *
 * 纪律（规格书决策 3 / 6 / 8，含 2026-09-07 决策 8.13 补强）：
 * - 写库失败只 warn 不阻塞：所有钩子 try/catch，错误进 logger，永不向调用方冒；
 * - 入库边界只过纯 DTO（`MessageRecord` / `ConversationRecord`，UIKit 侧已清洗）；
 * - chatRoom 消息整行不落库（可配开关 `persistChatRoom`，默认关）；
 * - cmd 透传消息整行不入库；tip（notice）入库但不进 FTS 队列；
 * - 按 msgServerId upsert：pending 期 msgServerId 为 NULL（不触发 UNIQUE 冲突），
 *   服务端回填后按 msgLocalId 定位升格合并；墓碑字段单调置位（漫游重放不回退）；
 * - **水位线写侧拦截**：新插入（非更新既有行）且 isLocal=0 且早于水位线的回流
 *   消息直接跳过（「清了就永远不再回来」）；更新既有行放行（墓碑/状态事件要能落）；
 * - **升格撞 UNIQUE 合并**：漫游先行导致 serverId 行与 pending 行分居两行时，
 *   以 serverId 行为准合并内容、物理删 pending 行；
 * - **sendStatus 单调**：read > delivered > sent > sending/failed，只前进不回退
 *   （updateMessageStatus 与 upsert 的 UPDATE 分支同守）；
 * - **FTS 队列与事务联动**：事务内只收集 ops，提交成功后才入队
 *   （回滚不留幽灵索引）；墓碑置位 / 内容变更在 UPDATE 成功后撤/写 FTS 行（决策 8.3）。
 */

import type {
  ConversationRecord,
  MessageBody,
  MessageModifiedInfo,
  MessageRecord,
  MessageStatusValue,
  SdkPersistenceHooks,
} from '@easemob/uikit-sdk-contract'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { CHATROOM_TYPE } from '../context'
import type { PersistenceContext } from '../context'
import { extractFtsContent, ftsOldContentOf } from '../fts/fts'
import { recordToRow } from '../records/records'
import { waterlineOf } from '../waterline'

/** 该消息是否进入持久化（cmd 透传 / chatRoom 弹幕整行跳过） */
function shouldPersist(record: MessageRecord, persistChatRoom: boolean): boolean {
  if (record.type === MESSAGE_TYPE.CMD)
    return false
  if (!persistChatRoom && record.conversationType === CHATROOM_TYPE)
    return false
  return true
}

/** 消息的 FTS 新内容（墓碑 / 已删除行不入索引） */
function ftsContentOf(record: MessageRecord): string | null {
  if (record.recalled || record.deleted)
    return null
  return extractFtsContent({ type: record.type, body: record.body })
}

/** 发送状态优先级：read > delivered > sent > sending / failed（单调只前进） */
const STATUS_RANK: Record<string, number> = {
  [MESSAGE_STATUS.SENDING]: 0,
  [MESSAGE_STATUS.FAILED]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.DELIVERED]: 2,
  [MESSAGE_STATUS.READ]: 3,
}

function statusRank(status: unknown): number {
  return STATUS_RANK[status as string] ?? 0
}

/** FTS 队列操作（事务内只收集，提交成功后统一入队） */
interface PendingFtsOp {
  rowid: number
  oldContent: string | null
  newContent: string | null
}

const MESSAGE_COLUMNS = [
  'msgServerId',
  'msgLocalId',
  'conversationId',
  'conversationType',
  'fromUid',
  'toUid',
  'type',
  'sendStatus',
  'timestamp',
  'isPeerRead',
  'isPeerDelivered',
  'recalled',
  'deleted',
  'tombstoneTime',
  'recallOperator',
  'pinnedTime',
  'isLocal',
  'body',
  'ext',
  'sender',
  'modifiedInfo',
  'extra',
  'localPath',
] as const

const INSERT_MESSAGE_SQL = `INSERT INTO uikit_messages (${MESSAGE_COLUMNS.join(', ')})
VALUES (${MESSAGE_COLUMNS.map(() => '?').join(', ')})`

/**
 * upsert 更新：msgServerId 用 COALESCE 保护（pending 重放不回退已升格行）；
 * 墓碑字段单调置位（MAX / COALESCE，漫游重放旧状态不回退墓碑）；
 * sendStatus 由调用方先做单调比较再传入（SQL 内不再覆盖回退）；
 * pinnedTime / recallOperator / isLocal / localPath 由专属通道维护，save 不触碰。
 */
const UPDATE_MESSAGE_SQL = `UPDATE uikit_messages SET
  msgServerId = COALESCE(?, msgServerId),
  msgLocalId = ?, conversationId = ?, conversationType = ?, fromUid = ?, toUid = ?,
  type = ?, sendStatus = ?, timestamp = ?,
  isPeerRead = COALESCE(?, isPeerRead), isPeerDelivered = COALESCE(?, isPeerDelivered),
  recalled = MAX(recalled, ?), deleted = MAX(deleted, ?),
  tombstoneTime = COALESCE(?, tombstoneTime),
  body = ?, ext = ?, sender = ?,
  modifiedInfo = COALESCE(?, modifiedInfo), extra = COALESCE(?, extra)
WHERE rowid = ?`

export function createPersistenceHooks(ctx: PersistenceContext): SdkPersistenceHooks {
  const { db, fts, logger } = ctx

  /* ===== 预编译语句（高频路径复用，避免每次调用重复 prepare） ===== */
  const findByServerId = db.prepare('SELECT rowid, * FROM uikit_messages WHERE msgServerId = ?')
  const findByLocalId = db.prepare('SELECT rowid, * FROM uikit_messages WHERE msgLocalId = ?')
  const findByAnyId = db.prepare(
    'SELECT rowid, * FROM uikit_messages WHERE msgServerId = ? OR msgLocalId = ?',
  )
  const insertMessage = db.prepare(INSERT_MESSAGE_SQL)
  const updateMessage = db.prepare(UPDATE_MESSAGE_SQL)
  const deleteMessageByRowid = db.prepare('DELETE FROM uikit_messages WHERE rowid = ?')
  const updateStatusStmt = db.prepare(
    `UPDATE uikit_messages SET
      sendStatus = ?,
      isPeerRead = COALESCE(?, isPeerRead),
      isPeerDelivered = COALESCE(?, isPeerDelivered)
    WHERE rowid = ?`,
  )
  const markRecalledStmt = db.prepare(
    'UPDATE uikit_messages SET recalled = 1, tombstoneTime = COALESCE(tombstoneTime, ?), recallOperator = COALESCE(?, recallOperator) WHERE rowid = ?',
  )
  const updateContentStmt = db.prepare(
    'UPDATE uikit_messages SET body = ?, ext = ?, modifiedInfo = COALESCE(?, modifiedInfo) WHERE rowid = ?',
  )
  const markDeletedStmt = db.prepare(
    'UPDATE uikit_messages SET deleted = 1, tombstoneTime = COALESCE(tombstoneTime, ?) WHERE rowid = ?',
  )
  const updatePinnedStmt = db.prepare(
    'UPDATE uikit_messages SET pinnedTime = ? WHERE msgServerId = ? OR msgLocalId = ?',
  )
  const listMessagesByConversation = db.prepare(
    'SELECT rowid, type, body, recalled, deleted FROM uikit_messages WHERE conversationId = ?',
  )
  const deleteMessagesByConversation = db.prepare('DELETE FROM uikit_messages WHERE conversationId = ?')
  const deleteSyncState = db.prepare('DELETE FROM uikit_sync_state WHERE conversationId = ?')
  const deleteConversationById = db.prepare('DELETE FROM uikit_conversations WHERE id = ?')

  /** 事务提交后统一落 FTS 队列（回滚时 ops 随异常路径丢弃，不留幽灵索引） */
  function flushFtsOps(ops: PendingFtsOp[]): void {
    for (const op of ops)
      fts.enqueue(op.rowid, op.oldContent, op.newContent)
  }

  /** 物理删行（升格冲突合并专用）：先记撤索引 op 再删行 */
  function deleteRow(row: Record<string, unknown>, ops: PendingFtsOp[]): void {
    const oldContent = ftsOldContentOf(row)
    if (oldContent !== null)
      ops.push({ rowid: Number(row.rowid), oldContent, newContent: null })
    deleteMessageByRowid.run(Number(row.rowid))
  }

  /** 合并内容到既有行（升格 / 重放 / 状态回流共用）：sendStatus 单调、墓碑单调、FTS 重建记 op */
  function applyUpdate(existing: Record<string, unknown>, row: ReturnType<typeof recordToRow>, record: MessageRecord, ops: PendingFtsOp[]): void {
    // sendStatus 单调：回退级别不覆盖（如已 read 后迟到的 sent/delivered 回流）
    const effectiveStatus = statusRank(row.sendStatus) >= statusRank(existing.sendStatus)
      ? row.sendStatus
      : existing.sendStatus as string
    updateMessage.run(
      row.msgServerId,
      row.msgLocalId,
      row.conversationId,
      row.conversationType,
      row.fromUid,
      row.toUid,
      row.type,
      effectiveStatus,
      row.timestamp,
      row.isPeerRead,
      row.isPeerDelivered,
      row.recalled,
      row.deleted,
      row.tombstoneTime,
      row.body,
      row.ext,
      row.sender,
      row.modifiedInfo,
      row.extra,
      Number(existing.rowid),
    )
    // 墓碑单调：既有行已墓碑而本次记录未带墓碑时，以合并后的终态决定是否回写索引
    const tombstoned = Boolean(Number(existing.recalled) || row.recalled)
      || Boolean(Number(existing.deleted) || row.deleted)
    ops.push({
      rowid: Number(existing.rowid),
      oldContent: ftsOldContentOf(existing),
      newContent: tombstoned ? null : ftsContentOf(record),
    })
  }

  /** 单条 upsert（saveMessage / saveMessages 共用；须在事务内由调用方保证） */
  function upsertMessage(record: MessageRecord, ops: PendingFtsOp[]): void {
    const row = recordToRow(record)
    const byServer = row.msgServerId ? findByServerId.get(row.msgServerId) : undefined
    const byLocal = findByLocalId.get(row.msgLocalId)

    if (!byServer && !byLocal) {
      // 水位线写侧拦截：仅新插入（两个键都未命中既有行）且非本地插入消息、
      // 早于水位线的漫游回流直接跳过；更新既有行（墓碑 / 状态事件）放行
      if (!row.isLocal && row.timestamp < waterlineOf(db, row.conversationId))
        return
      const result = insertMessage.run(
        row.msgServerId,
        row.msgLocalId,
        row.conversationId,
        row.conversationType,
        row.fromUid,
        row.toUid,
        row.type,
        row.sendStatus,
        row.timestamp,
        row.isPeerRead,
        row.isPeerDelivered,
        row.recalled,
        row.deleted,
        row.tombstoneTime,
        row.recallOperator,
        row.pinnedTime,
        row.isLocal,
        row.body,
        row.ext,
        row.sender,
        row.modifiedInfo,
        row.extra,
        row.localPath,
      )
      ops.push({ rowid: Number(result.lastInsertRowid), oldContent: null, newContent: ftsContentOf(record) })
      return
    }

    if (byServer && byLocal && byServer.rowid !== byLocal.rowid) {
      // 升格撞 UNIQUE（漫游先行 / ACK 后到乱序）：serverId 行与 pending 行分居两行
      // → 以 serverId 行为准合并内容（msgLocalId 保留 serverId 行原值），物理删 pending 行
      applyUpdate(byServer, { ...row, msgLocalId: byServer.msgLocalId as string }, record, ops)
      deleteRow(byLocal, ops)
      return
    }

    // 常规升格 / 合并（byLocal 命中即同一行；incoming msgLocalId 与他行撞占用
    // 的情形已被上一分支拦截，这里保留既有行 msgLocalId 不会撞 UNIQUE）
    applyUpdate((byServer ?? byLocal) as Record<string, unknown>, row, record, ops)
  }

  const upsertConversation = db.prepare(
    `INSERT INTO uikit_conversations (
      id, type, name, avatar, unreadCount,
      lastMessageText, lastMessageFrom, lastMessageTime,
      isPinned, pinnedTime, isMuted, marks, draft, draftTime, remindType, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type, name = excluded.name, avatar = excluded.avatar,
      unreadCount = excluded.unreadCount,
      lastMessageText = excluded.lastMessageText,
      lastMessageFrom = excluded.lastMessageFrom,
      lastMessageTime = excluded.lastMessageTime,
      isPinned = excluded.isPinned, pinnedTime = excluded.pinnedTime,
      isMuted = excluded.isMuted, marks = excluded.marks,
      draft = excluded.draft, draftTime = excluded.draftTime,
      remindType = excluded.remindType`,
  )

  function saveConversation(record: ConversationRecord): void {
    upsertConversation.run(
      record.id,
      record.type,
      record.name,
      record.avatar ?? null,
      record.unreadCount ?? 0,
      record.lastMessageText ?? null,
      record.lastMessageFrom ?? null,
      record.lastMessageTime ?? null,
      record.isPinned ? 1 : 0,
      record.pinnedTime ?? null,
      record.isMuted ? 1 : 0,
      JSON.stringify(record.marks ?? []),
      record.draft ?? null,
      record.draftTime ?? null,
      record.remindType ?? null,
      Date.now(),
    )
  }

  const hooks: SdkPersistenceHooks = {
    message: {
      saveMessage: (record) => {
        try {
          if (!shouldPersist(record, ctx.persistChatRoom))
            return
          const ops: PendingFtsOp[] = []
          db.transaction(() => upsertMessage(record, ops))
          flushFtsOps(ops)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] saveMessage 失败', error)
        }
      },

      saveMessages: (records) => {
        try {
          const persistable = records.filter(r => shouldPersist(r, ctx.persistChatRoom))
          if (persistable.length === 0)
            return
          // 批量事务：漫游历史大批量回流场景减少逐条事务开销；
          // FTS ops 事务内收集、提交成功后入队（回滚不留幽灵索引）
          const ops: PendingFtsOp[] = []
          db.transaction(() => {
            for (const record of persistable)
              upsertMessage(record, ops)
          })
          flushFtsOps(ops)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] saveMessages 失败', error)
        }
      },

      updateMessageStatus: (msgId, status: MessageStatusValue) => {
        try {
          const row = findByAnyId.get(msgId, msgId)
          if (!row)
            return
          // sendStatus 单调：回退级别直接拒绝（如已 read 后迟到的 delivered）
          if (statusRank(status) < statusRank(row.sendStatus))
            return
          updateStatusStmt.run(
            status,
            status === MESSAGE_STATUS.READ ? 1 : null,
            status === MESSAGE_STATUS.READ || status === MESSAGE_STATUS.DELIVERED ? 1 : null,
            Number(row.rowid),
          )
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] updateMessageStatus 失败', error)
        }
      },

      markMessageRecalled: (msgId, operatorId) => {
        try {
          const row = findByAnyId.get(msgId, msgId)
          if (!row)
            return
          markRecalledStmt.run(Date.now(), operatorId ?? null, Number(row.rowid))
          // UPDATE 成功后才撤 FTS 行（先撤后写会在写失败时留下「无墓碑但无索引」中间态）
          const oldContent = ftsOldContentOf(row)
          if (oldContent !== null)
            fts.enqueue(Number(row.rowid), oldContent, null)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] markMessageRecalled 失败', error)
        }
      },

      updateMessageContent: (msgId, body: MessageBody, ext, modifiedInfo?: MessageModifiedInfo) => {
        try {
          const row = findByAnyId.get(msgId, msgId)
          if (!row)
            return
          updateContentStmt.run(
            JSON.stringify(body ?? {}),
            JSON.stringify(ext ?? {}),
            modifiedInfo ? JSON.stringify(modifiedInfo) : null,
            Number(row.rowid),
          )
          // UPDATE 成功后重建索引：撤旧内容 + 写新内容（墓碑行不回写）
          const oldContent = ftsOldContentOf(row)
          const tombstoned = Boolean(Number(row.recalled) || Number(row.deleted))
          const newContent = tombstoned ? null : extractFtsContent({ type: row.type as string, body })
          if (oldContent !== null || newContent !== null)
            fts.enqueue(Number(row.rowid), oldContent, newContent)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] updateMessageContent 失败', error)
        }
      },

      deleteMessages: (msgIds) => {
        try {
          const now = Date.now()
          // 事务内逐条置墓碑并收集撤索引 ops，提交成功后统一入队
          const ops: PendingFtsOp[] = []
          db.transaction(() => {
            for (const msgId of msgIds) {
              const row = findByAnyId.get(msgId, msgId)
              if (!row)
                continue
              markDeletedStmt.run(now, Number(row.rowid))
              const oldContent = ftsOldContentOf(row)
              if (oldContent !== null)
                ops.push({ rowid: Number(row.rowid), oldContent, newContent: null })
            }
          })
          flushFtsOps(ops)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] deleteMessages 失败', error)
        }
      },

      updateMessagePinned: (msgId, pinnedTime) => {
        try {
          updatePinnedStmt.run(pinnedTime, msgId, msgId)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] updateMessagePinned 失败', error)
        }
      },
    },

    conversation: {
      saveConversations: (records) => {
        try {
          db.transaction(() => {
            for (const record of records)
              saveConversation(record)
          })
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] saveConversations 失败', error)
        }
      },

      removeConversations: (ids, opts) => {
        try {
          // 事务内收集撤索引 ops，提交成功后统一入队
          const ops: PendingFtsOp[] = []
          db.transaction(() => {
            for (const id of ids) {
              if (opts?.deleteMessages) {
                // 级联物理删（决策 8.2 微信语义）：消息 + FTS 行 + sync_state 行
                for (const row of listMessagesByConversation.all(id)) {
                  const oldContent = ftsOldContentOf(row)
                  if (oldContent !== null)
                    ops.push({ rowid: Number(row.rowid), oldContent, newContent: null })
                }
                deleteMessagesByConversation.run(id)
                deleteSyncState.run(id)
              }
              // 缺省只删会话行：消息保留，会话再次浮现时历史仍在
              deleteConversationById.run(id)
            }
          })
          flushFtsOps(ops)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] removeConversations 失败', error)
        }
      },
    },
  }

  return hooks
}
