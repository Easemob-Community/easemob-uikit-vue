/**
 * 旁路持久化 hooks 实现（契约 `SdkPersistenceHooks` 的 SQLite 落地）。
 *
 * 纪律（规格书决策 3 / 6 / 8）：
 * - 写库失败只 warn 不阻塞：所有钩子 try/catch，错误进 logger，永不向调用方冒；
 * - 入库边界只过纯 DTO（`MessageRecord` / `ConversationRecord`，UIKit 侧已清洗）；
 * - chatRoom 消息整行不落库（可配开关 `persistChatRoom`，默认关）；
 * - cmd 透传消息整行不入库；tip（notice）入库但不进 FTS 队列；
 * - 按 msgServerId upsert：pending 期 msgServerId 为 NULL（不触发 UNIQUE 冲突），
 *   服务端回填后按 msgLocalId 定位升格合并；墓碑字段单调置位（漫游重放不回退）；
 * - 墓碑置位 / 内容变更同步维护 FTS 队列（决策 8.3）。
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
import { extractFtsContent } from '../fts/fts'
import { recordToRow, rowToFtsSource } from '../records/records'

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
  const findByServerId = db.prepare('SELECT rowid, * FROM uikit_messages WHERE msgServerId = ?')
  const findByLocalId = db.prepare('SELECT rowid, * FROM uikit_messages WHERE msgLocalId = ?')
  const findByAnyId = db.prepare(
    'SELECT rowid, * FROM uikit_messages WHERE msgServerId = ? OR msgLocalId = ?',
  )
  const insertMessage = db.prepare(INSERT_MESSAGE_SQL)
  const updateMessage = db.prepare(UPDATE_MESSAGE_SQL)

  /** 单条 upsert（saveMessage / saveMessages 共用；须在事务内由调用方保证） */
  function upsertMessage(record: MessageRecord): void {
    const row = recordToRow(record)
    let existing: Record<string, unknown> | undefined
    if (row.msgServerId)
      existing = findByServerId.get(row.msgServerId)
    if (!existing)
      existing = findByLocalId.get(row.msgLocalId)

    if (existing) {
      const rowid = Number(existing.rowid)
      const oldSource = rowToFtsSource(existing)
      const oldContent = oldSource && !Number(existing.recalled) && !Number(existing.deleted)
        ? extractFtsContent(oldSource)
        : null
      updateMessage.run(
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
        row.body,
        row.ext,
        row.sender,
        row.modifiedInfo,
        row.extra,
        rowid,
      )
      // 墓碑单调：既有行已墓碑而本次记录未带墓碑时，以合并后的终态决定是否回写索引
      const tombstoned = Boolean(Number(existing.recalled) || row.recalled)
        || Boolean(Number(existing.deleted) || row.deleted)
      const newContent = tombstoned ? null : ftsContentOf(record)
      fts.enqueue(rowid, oldContent, newContent)
      return
    }

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
    fts.enqueue(Number(result.lastInsertRowid), null, ftsContentOf(record))
  }

  /** 撤 FTS 行（墓碑置位 / 物理删除前置；按既有行重算旧内容） */
  function deindexRow(row: Record<string, unknown>): void {
    const source = rowToFtsSource(row)
    const oldContent = source && !Number(row.recalled) && !Number(row.deleted)
      ? extractFtsContent(source)
      : null
    if (oldContent !== null)
      fts.enqueue(Number(row.rowid), oldContent, null)
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
          db.transaction(() => upsertMessage(record))
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
          // 批量事务：漫游历史大批量回流场景减少逐条事务开销
          db.transaction(() => {
            for (const record of persistable)
              upsertMessage(record)
          })
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] saveMessages 失败', error)
        }
      },

      updateMessageStatus: (msgId, status: MessageStatusValue) => {
        try {
          db.prepare(
            `UPDATE uikit_messages SET
              sendStatus = ?,
              isPeerRead = COALESCE(?, isPeerRead),
              isPeerDelivered = COALESCE(?, isPeerDelivered)
            WHERE msgServerId = ? OR msgLocalId = ?`,
          ).run(
            status,
            status === MESSAGE_STATUS.READ ? 1 : null,
            status === MESSAGE_STATUS.READ || status === MESSAGE_STATUS.DELIVERED ? 1 : null,
            msgId,
            msgId,
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
          deindexRow(row)
          db.prepare(
            'UPDATE uikit_messages SET recalled = 1, tombstoneTime = COALESCE(tombstoneTime, ?), recallOperator = COALESCE(?, recallOperator) WHERE rowid = ?',
          ).run(Date.now(), operatorId ?? null, Number(row.rowid))
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
          deindexRow(row)
          db.prepare(
            'UPDATE uikit_messages SET body = ?, ext = ?, modifiedInfo = COALESCE(?, modifiedInfo) WHERE rowid = ?',
          ).run(
            JSON.stringify(body ?? {}),
            JSON.stringify(ext ?? {}),
            modifiedInfo ? JSON.stringify(modifiedInfo) : null,
            Number(row.rowid),
          )
          const tombstoned = Boolean(Number(row.recalled) || Number(row.deleted))
          const newContent = tombstoned ? null : extractFtsContent({ type: row.type as string, body })
          fts.enqueue(Number(row.rowid), null, newContent)
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] updateMessageContent 失败', error)
        }
      },

      deleteMessages: (msgIds) => {
        try {
          const now = Date.now()
          db.transaction(() => {
            for (const msgId of msgIds) {
              const row = findByAnyId.get(msgId, msgId)
              if (!row)
                continue
              deindexRow(row)
              db.prepare(
                'UPDATE uikit_messages SET deleted = 1, tombstoneTime = COALESCE(tombstoneTime, ?) WHERE rowid = ?',
              ).run(now, Number(row.rowid))
            }
          })
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] deleteMessages 失败', error)
        }
      },

      updateMessagePinned: (msgId, pinnedTime) => {
        try {
          db.prepare(
            'UPDATE uikit_messages SET pinnedTime = ? WHERE msgServerId = ? OR msgLocalId = ?',
          ).run(pinnedTime, msgId, msgId)
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
          const listMessages = db.prepare(
            'SELECT rowid, type, body, recalled, deleted FROM uikit_messages WHERE conversationId = ?',
          )
          db.transaction(() => {
            for (const id of ids) {
              if (opts?.deleteMessages) {
                // 级联物理删（决策 8.2 微信语义）：消息 + FTS 行 + sync_state 行
                for (const row of listMessages.all(id))
                  deindexRow(row)
                db.prepare('DELETE FROM uikit_messages WHERE conversationId = ?').run(id)
                db.prepare('DELETE FROM uikit_sync_state WHERE conversationId = ?').run(id)
              }
              // 缺省只删会话行：消息保留，会话再次浮现时历史仍在
              db.prepare('DELETE FROM uikit_conversations WHERE id = ?').run(id)
            }
          })
        }
        catch (error) {
          logger.warn('[uikit-persist-sqlite] removeConversations 失败', error)
        }
      },
    },
  }

  return hooks
}
