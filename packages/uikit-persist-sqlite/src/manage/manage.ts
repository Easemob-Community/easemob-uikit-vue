/**
 * 管理 API + 用户属性 / 群成员读写 API（规格书决策 6 管理 API 签名）。
 *
 * - `clearMessages` / `clearAll`：物理删 + 撤 FTS 行 + 写 clearedBefore 水位线
 *   （「用户清了就永远不再回来」，同步 / 漫游路径一律跳过水位线以下）；
 * - `insertLocalMessage`：本地插入消息（系统提示等），强制 `local_` 前缀
 *   msgLocalId、isLocal=1（不参与同步 / 漫游去重）；
 * - `setMessagePinned`：纯本地置顶操作；远端 pin 事件经 hooks.updateMessagePinned 校准；
 * - user_info / group_member 只提供读写能力；「登录拉自己、收消息顺带 upsert」
 *   等更新时机是 UIKit 侧的事，本包不管。
 */

import type { ConversationTypeValue, MessageRecord, MessageTypeValue } from '@easemob/uikit-sdk-contract'
import { MESSAGE_STATUS } from '@easemob/uikit-sdk-contract'
import type { PersistenceContext } from '../context'
import { extractFtsContent } from '../fts/fts'
import { recordToRow, rowToFtsSource } from '../records/records'

/** 本地插入消息入参（其余字段由实现方生成 / 固定） */
export interface LocalMessageInput {
  conversationId: string
  conversationType: ConversationTypeValue
  from: string
  to: string
  type: MessageTypeValue
  body: MessageRecord['body']
  ext?: Record<string, unknown>
  timestamp?: number
  /** 调用方给的 msgLocalId；缺省自动生成。一律强制 `local_` 前缀 */
  msgLocalId?: string
}

/** 用户属性行（uikit_user_info；无 TTL 过期） */
export interface StoredUserInfo {
  userId: string
  nickname?: string
  avatar?: string
  ext?: string
  updatedAt?: number
}

/** 群名片 / 群昵称行（uikit_group_member，(groupId, userId) 二维） */
export interface StoredGroupMember {
  groupId: string
  userId: string
  nickname?: string
  avatar?: string
  role?: string
  updatedAt?: number
}

/** 存储统计（getStorageStats 返回形状，规格书决策 6 定稿） */
export interface StorageStats {
  dbBytes: number
  messageCount: number
  oldestMessageTime?: number
  byConversation: Array<{ conversationId: string, count: number }>
  byType: Array<{ type: string, count: number }>
}

/** clearMessages 过滤器 */
export interface ClearMessagesFilter {
  before?: number
  type?: string
  conversationId?: string
}

export interface PersistenceManagementApi {
  getStorageStats: () => Promise<StorageStats>
  clearMessages: (filter: ClearMessagesFilter) => Promise<number>
  clearAll: () => Promise<void>
  /** INCREMENTAL 回收磁盘空间（清大量历史后调用） */
  vacuum: () => Promise<void>
  /**
   * 备份库文件到目标路径（`VACUUM INTO`，产物为压缩整理后的完整库）。
   * `:memory:` 模式同样可用；目标文件必须不存在（SQLite 语义，防覆盖）。
   * 备份前会先落盘 FTS 异步队列尾部，保证产物索引一致。
   * 注入自定义驱动模式：VACUUM INTO 是标准 SQL，驱动不支持时抛错（warn 后原样上抛，
   * 调用方需要明确感知备份失败，不适用「只 warn」纪律）。
   * Backup the database to `targetPath` via `VACUUM INTO` (works for `:memory:`
   * too). The target must not exist. The FTS queue is flushed first so the
   * backup is index-consistent. Errors are warned and rethrown.
   */
  backup: (targetPath: string) => Promise<void>
  insertLocalMessage: (input: LocalMessageInput) => Promise<MessageRecord>
  setMessagePinned: (msgId: string, pinned: boolean) => Promise<void>
  upsertUserInfos: (infos: StoredUserInfo[]) => Promise<void>
  getUserInfos: (userIds: string[]) => Promise<StoredUserInfo[]>
  upsertGroupMembers: (members: StoredGroupMember[]) => Promise<void>
  getGroupMembers: (groupId: string, userIds?: string[]) => Promise<StoredGroupMember[]>
}

let localIdSeq = 0

export function createManagementApi(ctx: PersistenceContext): PersistenceManagementApi {
  const { db, fts, logger } = ctx

  function getMeta(key: string): string | undefined {
    return db.prepare('SELECT value FROM uikit_meta WHERE key = ?').get(key)?.value as string | undefined
  }

  function setMeta(key: string, value: string): void {
    db.prepare(
      'INSERT INTO uikit_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).run(key, value)
  }

  return {
    async getStorageStats() {
      const pageCount = Number(db.prepare('PRAGMA page_count').get()?.page_count ?? 0)
      const pageSize = Number(db.prepare('PRAGMA page_size').get()?.page_size ?? 0)
      const messageCount = Number(
        db.prepare('SELECT COUNT(*) AS c FROM uikit_messages').get()?.c ?? 0,
      )
      const oldest = db.prepare('SELECT MIN(timestamp) AS t FROM uikit_messages').get()?.t
      const byConversation = db.prepare(
        'SELECT conversationId, COUNT(*) AS count FROM uikit_messages GROUP BY conversationId',
      ).all().map(r => ({ conversationId: r.conversationId as string, count: Number(r.count) }))
      const byType = db.prepare(
        'SELECT type, COUNT(*) AS count FROM uikit_messages GROUP BY type',
      ).all().map(r => ({ type: r.type as string, count: Number(r.count) }))
      return {
        dbBytes: pageCount * pageSize,
        messageCount,
        oldestMessageTime: oldest === null || oldest === undefined ? undefined : Number(oldest),
        byConversation,
        byType,
      }
    },

    async clearMessages(filter) {
      const clauses: string[] = []
      const params: unknown[] = []
      if (filter.conversationId !== undefined) {
        clauses.push('conversationId = ?')
        params.push(filter.conversationId)
      }
      if (filter.type !== undefined) {
        clauses.push('type = ?')
        params.push(filter.type)
      }
      if (filter.before !== undefined) {
        clauses.push('timestamp < ?')
        params.push(filter.before)
      }
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
      try {
        const rows = db.prepare(
          `SELECT rowid, type, body, recalled, deleted, conversationId, timestamp FROM uikit_messages ${where}`,
        ).all(...params)
        if (rows.length === 0)
          return 0
        const maxTs = Math.max(...rows.map(r => Number(r.timestamp)))
        db.transaction(() => {
          for (const row of rows) {
            // 撤 FTS 行（external content 表须自带旧内容）
            const source = rowToFtsSource(row)
            const oldContent = source && !Number(row.recalled) && !Number(row.deleted)
              ? extractFtsContent(source)
              : null
            if (oldContent !== null)
              fts.enqueue(Number(row.rowid), oldContent, null)
          }
          db.prepare(`DELETE FROM uikit_messages ${where}`).run(...params)
          // 写 clearedBefore 水位线（决策 6：含显式全量漫游也不再回来）
          const waterline = filter.before ?? maxTs
          if (filter.conversationId !== undefined) {
            db.prepare(
              `INSERT INTO uikit_sync_state (conversationId, clearedBefore) VALUES (?, ?)
              ON CONFLICT(conversationId) DO UPDATE SET clearedBefore = MAX(COALESCE(clearedBefore, 0), excluded.clearedBefore)`,
            ).run(filter.conversationId, waterline)
          }
          else {
            const prev = Number(getMeta('global_cleared_before') ?? 0)
            setMeta('global_cleared_before', String(Math.max(prev, waterline)))
          }
        })
        // 管理操作同步落 FTS（不走异步队列时序，保证返回后搜索立即一致）
        fts.flush()
        return rows.length
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] clearMessages 失败', error)
        return 0
      }
    },

    async clearAll() {
      try {
        fts.flush()
        db.transaction(() => {
          db.exec('INSERT INTO uikit_messages_fts(uikit_messages_fts) VALUES(\'delete-all\')')
          db.exec('DELETE FROM uikit_messages;')
          db.exec('DELETE FROM uikit_conversations;')
          db.exec('DELETE FROM uikit_user_info;')
          db.exec('DELETE FROM uikit_group_member;')
          db.exec('DELETE FROM uikit_sync_state;')
          setMeta('global_cleared_before', String(Date.now()))
        })
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] clearAll 失败', error)
      }
    },

    async vacuum() {
      try {
        db.exec('PRAGMA incremental_vacuum;')
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] vacuum 失败', error)
      }
    },

    async backup(targetPath) {
      if (!targetPath)
        throw new Error('[uikit-persist-sqlite] backup 需要非空 targetPath')
      // 先落盘 FTS 异步队列尾部，保证备份产物索引一致
      fts.flush()
      try {
        // VACUUM INTO 支持参数绑定（SQLite ≥3.27），保持全参数化纪律；
        // 目标文件已存在时 SQLite 报错（防覆盖语义），warn 后原样上抛给调用方
        db.prepare('VACUUM INTO ?').run(targetPath)
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] backup 失败', error)
        throw error
      }
    },

    async insertLocalMessage(input) {
      const localId = input.msgLocalId ?? `local_${Date.now()}_${localIdSeq++}`
      const record: MessageRecord = {
        msgServerId: '',
        msgLocalId: localId.startsWith('local_') ? localId : `local_${localId}`,
        from: input.from,
        to: input.to,
        sender: { userId: input.from },
        conversationId: input.conversationId,
        conversationType: input.conversationType,
        type: input.type as MessageRecord['type'],
        sendStatus: MESSAGE_STATUS.SENT,
        ext: input.ext ?? {},
        timestamp: input.timestamp ?? Date.now(),
        body: input.body,
      }
      try {
        const row = recordToRow(record, { isLocal: true })
        const result = db.prepare(
          `INSERT INTO uikit_messages (
            msgServerId, msgLocalId, conversationId, conversationType, fromUid, toUid,
            type, sendStatus, timestamp, isPeerRead, isPeerDelivered,
            recalled, deleted, tombstoneTime, recallOperator, pinnedTime,
            isLocal, body, ext, sender, modifiedInfo, extra, localPath
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
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
        fts.enqueue(
          Number(result.lastInsertRowid),
          null,
          extractFtsContent({ type: record.type, body: record.body }),
        )
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] insertLocalMessage 失败', error)
      }
      return record
    },

    async setMessagePinned(msgId, pinned) {
      try {
        db.prepare(
          'UPDATE uikit_messages SET pinnedTime = ? WHERE msgServerId = ? OR msgLocalId = ?',
        ).run(pinned ? Date.now() : null, msgId, msgId)
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] setMessagePinned 失败', error)
      }
    },

    async upsertUserInfos(infos) {
      try {
        const stmt = db.prepare(
          `INSERT INTO uikit_user_info (userId, nickname, avatar, ext, updatedAt) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            nickname = COALESCE(excluded.nickname, nickname),
            avatar = COALESCE(excluded.avatar, avatar),
            ext = COALESCE(excluded.ext, ext),
            updatedAt = excluded.updatedAt`,
        )
        db.transaction(() => {
          for (const info of infos) {
            stmt.run(
              info.userId,
              info.nickname ?? null,
              info.avatar ?? null,
              info.ext ?? null,
              info.updatedAt ?? Date.now(),
            )
          }
        })
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] upsertUserInfos 失败', error)
      }
    },

    async getUserInfos(userIds) {
      if (userIds.length === 0)
        return []
      const rows = db.prepare(
        `SELECT * FROM uikit_user_info WHERE userId IN (${userIds.map(() => '?').join(', ')})`,
      ).all(...userIds)
      return rows.map(row => ({
        userId: row.userId as string,
        nickname: (row.nickname as string | null) ?? undefined,
        avatar: (row.avatar as string | null) ?? undefined,
        ext: (row.ext as string | null) ?? undefined,
        updatedAt: Number(row.updatedAt),
      }))
    },

    async upsertGroupMembers(members) {
      try {
        const stmt = db.prepare(
          `INSERT INTO uikit_group_member (groupId, userId, nickname, avatar, role, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(groupId, userId) DO UPDATE SET
            nickname = COALESCE(excluded.nickname, nickname),
            avatar = COALESCE(excluded.avatar, avatar),
            role = COALESCE(excluded.role, role),
            updatedAt = excluded.updatedAt`,
        )
        db.transaction(() => {
          for (const member of members) {
            stmt.run(
              member.groupId,
              member.userId,
              member.nickname ?? null,
              member.avatar ?? null,
              member.role ?? null,
              member.updatedAt ?? Date.now(),
            )
          }
        })
      }
      catch (error) {
        logger.warn('[uikit-persist-sqlite] upsertGroupMembers 失败', error)
      }
    },

    async getGroupMembers(groupId, userIds) {
      const rows = userIds && userIds.length > 0
        ? db.prepare(
          `SELECT * FROM uikit_group_member WHERE groupId = ? AND userId IN (${userIds.map(() => '?').join(', ')})`,
        ).all(groupId, ...userIds)
        : db.prepare('SELECT * FROM uikit_group_member WHERE groupId = ?').all(groupId)
      return rows.map(row => ({
        groupId: row.groupId as string,
        userId: row.userId as string,
        nickname: (row.nickname as string | null) ?? undefined,
        avatar: (row.avatar as string | null) ?? undefined,
        role: (row.role as string | null) ?? undefined,
        updatedAt: Number(row.updatedAt),
      }))
    },
  }
}
