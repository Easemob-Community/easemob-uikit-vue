/**
 * 旁路持久化清洗函数：`SdkMessage` / `UiConversation` → 入库 DTO。
 *
 * 纯 TS 实现（零 vue / pinia / core 依赖）：契约包自实现，不引用
 * `uikit-core` 的 `limitDepth`（思路一致：限深 + WeakSet 循环兜底）。
 */

import type { MessageBody, SdkMessage } from '../types/message/body'
import type { UiConversation } from '../types/conversation'
import type { ConversationRecord, MessageRecord } from '../types/message/record'

/** ext 深拷贝最大深度；超过的层级以 '[Deep]' / '[Array]' 占位 */
const EXT_MAX_DEPTH = 5

/** 循环引用占位符（与 uikit-core log-store 语义一致） */
const CIRCULAR_PLACEHOLDER = '[Circular]'

/**
 * 环境无关的 File / Blob 探测：Node 侧无 `File` 全局，不能用 `instanceof`；
 * 按构造器名识别（File 继承 Blob，两处都拦）。
 */
function isFileLike(value: object): boolean {
  const ctorName = (value as { constructor?: { name?: string } }).constructor?.name
  return ctorName === 'File' || ctorName === 'Blob'
}

/**
 * 通用深度受限清洗：剥离函数 / File / Blob，循环引用置 '[Circular]'，
 * 超过 maxDepth 的层级以 '[Deep]' / '[Array]' 占位。
 * 返回 `undefined` 表示该值应被剔除（对象场景删键，数组场景保留 undefined→null 语义由调用方控制）。
 */
function sanitizeValue(value: unknown, depth: number, maxDepth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'function')
    return undefined
  if (typeof value === 'bigint')
    return String(value)
  if (!value || typeof value !== 'object')
    return value
  if (isFileLike(value))
    return undefined
  if (seen.has(value))
    return CIRCULAR_PLACEHOLDER
  if (depth >= maxDepth)
    return Array.isArray(value) ? '[Array]' : '[Deep]'
  seen.add(value)
  if (Array.isArray(value)) {
    // 数组保持长度（JSON 中 undefined → null 会产生歧义，被剔除项直接过滤）
    const out: unknown[] = []
    for (const item of value) {
      const cleaned = sanitizeValue(item, depth + 1, maxDepth, seen)
      if (cleaned !== undefined)
        out.push(cleaned)
    }
    return out
  }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    const cleaned = sanitizeValue(val, depth + 1, maxDepth, seen)
    if (cleaned !== undefined)
      out[key] = cleaned
  }
  return out
}

/** 清洗消息体：剥离 File / Blob / 函数值；combine 消息的 messageList 递归走整条消息清洗 */
function sanitizeBody(body: MessageBody): MessageBody {
  if (!body || typeof body !== 'object')
    return body
  const out: Record<string, unknown> = {}
  const seen = new WeakSet<object>()
  for (const [key, val] of Object.entries(body)) {
    // combine 子消息列表：整条消息递归清洗，保证子消息同样 JSON 安全
    if (key === 'messageList' && Array.isArray(val)) {
      out[key] = (val as SdkMessage[]).map(msg => toMessageRecord(msg))
      continue
    }
    const cleaned = sanitizeValue(val, 0, EXT_MAX_DEPTH, seen)
    if (cleaned !== undefined)
      out[key] = cleaned
  }
  return out as MessageBody
}

/**
 * `SdkMessage` → `MessageRecord`（入库 DTO）。
 *
 * - body 剥离 File / Blob / 函数值（发送中的图片 / 文件消息 body 可能携带本地 File）；
 * - combine 消息的 `messageList` 子消息递归清洗；
 * - `ext` 深拷贝限深（深度 5，循环引用置 '[Circular]'）；
 * - 墓碑字段（recalled / deleted / tombstoneTime）原样透传；
 * - 顶层其它字段防御性剥离函数值。
 */
export function toMessageRecord(msg: SdkMessage): MessageRecord {
  const record: Record<string, unknown> = { ...msg }
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'function')
      delete record[key]
  }
  record.body = sanitizeBody(msg.body)
  record.ext = (sanitizeValue(msg.ext, 0, EXT_MAX_DEPTH, new WeakSet<object>()) ?? {}) as Record<string, unknown>
  return record as unknown as MessageRecord
}

/**
 * `UiConversation` → `ConversationRecord`（入库 DTO）。
 * 字段皆纯数据，浅拷贝即可；防御性剥离函数值。
 */
export function toConversationRecord(cvs: UiConversation): ConversationRecord {
  const record: Record<string, unknown> = { ...cvs }
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'function')
      delete record[key]
  }
  return record as unknown as ConversationRecord
}
