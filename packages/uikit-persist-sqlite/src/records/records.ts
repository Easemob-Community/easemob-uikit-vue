/**
 * 消息行 ↔ MessageRecord DTO 映射。
 *
 * 消息表是「写一次整行读」的档案型结构：过滤 / 排序 / 状态更新用到的字段
 * 提成列，其余（body / ext / sender / modifiedInfo / extra）JSON 整列存取。
 * `extra` 列装低频杂项（reactions / chatThread 等），读出时合并回 DTO 顶层。
 */

import type { MessageBody, MessageRecord, Sender } from '@easemob/uikit-sdk-contract'

/** extra 列收容的低频字段（读出时合并回 DTO 顶层，写入时从顶层剥离） */
const EXTRA_KEYS = [
  'reactions',
  'chatThread',
  'chatThreadOverview',
  'isChatThread',
  'groupReadCount',
  'needReadReceipt',
  'priority',
  'isBroadcast',
  'isContentReplaced',
  'combineLevel',
  'direct',
  'isOnline',
  'receiverList',
  'deliverOnlineOnly',
  'webhookEnv',
] as const

/** 本地库消息行读回形状：MessageRecord + 本地库专属列（附件缓存路径 / 本地插入标记 / 置顶时间） */
export interface LocalStoredMessage extends MessageRecord {
  /** 附件本地缓存路径（被动缓存回填；未缓存为 undefined） */
  localPath?: string
  /** 本地插入消息标记（不参与同步/漫游去重） */
  isLocal?: boolean
  /** 消息置顶时间戳（远端事件校准 + 本地 setMessagePinned 操作；未置顶为 undefined） */
  pinnedTime?: number
}

export interface MessageRowParams {
  msgServerId: string | null
  msgLocalId: string
  conversationId: string
  conversationType: string
  fromUid: string
  toUid: string
  type: string
  sendStatus: string
  timestamp: number
  isPeerRead: number | null
  isPeerDelivered: number | null
  recalled: number
  deleted: number
  tombstoneTime: number | null
  recallOperator: string | null
  pinnedTime: number | null
  isLocal: number
  body: string
  ext: string | null
  sender: string | null
  modifiedInfo: string | null
  extra: string | null
  localPath: string | null
}

/** 解析失败观测口（可选）：坏 JSON 行不该静默吞掉——warn 一次便于排障 */
export interface JsonParseLogger {
  warn: (...args: unknown[]) => void
}

function safeJsonParse(text: unknown, logger?: JsonParseLogger, column?: string): unknown {
  if (typeof text !== 'string' || text === '')
    return undefined
  try {
    return JSON.parse(text)
  }
  catch (error) {
    // 坏行进 warn 观测（服务端权威兜底：该字段按缺失处理，不阻断读路径）
    logger?.warn(`[uikit-persist-sqlite] 消息行 JSON 解析失败（${column ?? 'unknown'} 列，按缺失处理）`, error)
    return undefined
  }
}

function toJson(value: unknown): string | null {
  if (value === undefined || value === null)
    return null
  return JSON.stringify(value)
}

/** DTO → 行参数（msgServerId 空串归一为 NULL：pending 期 NULL 不触发 UNIQUE 冲突） */
export function recordToRow(record: MessageRecord, opts: { isLocal?: boolean, localPath?: string } = {}): MessageRowParams {
  const extra: Record<string, unknown> = {}
  for (const key of EXTRA_KEYS) {
    const value = (record as unknown as Record<string, unknown>)[key]
    if (value !== undefined)
      extra[key] = value
  }
  return {
    msgServerId: record.msgServerId ? record.msgServerId : null,
    msgLocalId: record.msgLocalId,
    conversationId: record.conversationId,
    conversationType: record.conversationType,
    fromUid: record.from,
    toUid: record.to,
    type: record.type,
    sendStatus: record.sendStatus,
    timestamp: record.timestamp,
    isPeerRead: record.isPeerRead === undefined ? null : record.isPeerRead ? 1 : 0,
    isPeerDelivered: record.isPeerDelivered === undefined ? null : record.isPeerDelivered ? 1 : 0,
    recalled: record.recalled ? 1 : 0,
    deleted: record.deleted ? 1 : 0,
    tombstoneTime: record.tombstoneTime ?? null,
    recallOperator: null,
    pinnedTime: null,
    isLocal: opts.isLocal ? 1 : 0,
    body: JSON.stringify(record.body ?? {}),
    ext: toJson(record.ext),
    sender: toJson(record.sender),
    modifiedInfo: toJson(record.modifiedInfo),
    extra: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
    localPath: opts.localPath ?? null,
  }
}

/** 行 → DTO（墓碑字段 / extra 杂项 / 本地库专属列合并回顶层；logger 传入时坏 JSON 行 warn 观测） */
export function rowToRecord(row: Record<string, unknown>, logger?: JsonParseLogger): LocalStoredMessage {
  const extra = (safeJsonParse(row.extra, logger, 'extra') ?? {}) as Record<string, unknown>
  const record: Record<string, unknown> = {
    ...extra,
    msgServerId: (row.msgServerId as string | null) ?? '',
    msgLocalId: row.msgLocalId,
    from: row.fromUid,
    to: row.toUid,
    conversationId: row.conversationId,
    conversationType: row.conversationType,
    type: row.type,
    sendStatus: row.sendStatus,
    timestamp: row.timestamp,
    body: safeJsonParse(row.body, logger, 'body') ?? {},
    ext: safeJsonParse(row.ext, logger, 'ext') ?? {},
    sender: (safeJsonParse(row.sender, logger, 'sender') ?? { userId: row.fromUid }) as Sender,
  }
  if (row.isPeerRead !== null && row.isPeerRead !== undefined)
    record.isPeerRead = Boolean(row.isPeerRead)
  if (row.isPeerDelivered !== null && row.isPeerDelivered !== undefined)
    record.isPeerDelivered = Boolean(row.isPeerDelivered)
  if (row.recalled)
    record.recalled = true
  if (row.deleted)
    record.deleted = true
  if (row.tombstoneTime !== null && row.tombstoneTime !== undefined)
    record.tombstoneTime = row.tombstoneTime
  // 撤回操作者读回（扩展字段；UIKit v1 不消费，仅排障 / 审计观测用）
  if (row.recallOperator !== null && row.recallOperator !== undefined)
    record.recallOperator = row.recallOperator
  const modifiedInfo = safeJsonParse(row.modifiedInfo, logger, 'modifiedInfo')
  if (modifiedInfo !== undefined)
    record.modifiedInfo = modifiedInfo
  if (row.localPath)
    record.localPath = row.localPath
  if (row.isLocal)
    record.isLocal = true
  if (row.pinnedTime !== null && row.pinnedTime !== undefined)
    record.pinnedTime = row.pinnedTime
  return record as unknown as LocalStoredMessage
}

/** 供 FTS 内容拼装读取的最小形状（行场景 body 为 JSON 文本） */
export interface FtsSourceShape {
  type: string
  body: MessageBody
}

/** 从消息行构造 FTS 内容源（body JSON 解析失败按不可索引处理） */
export function rowToFtsSource(row: Record<string, unknown>): FtsSourceShape | null {
  const body = safeJsonParse(row.body)
  if (body === undefined || body === null || typeof body !== 'object')
    return null
  return { type: row.type as string, body: body as MessageBody }
}
