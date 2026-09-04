/**
 * 内部共享上下文：驱动 / FTS 队列 / 配置 / 告警通道。
 */

import type { SqliteDriver } from './driver/driver'
import type { FtsIndexQueue } from './fts/fts'

/** 告警通道（决策 3.2：写库失败只 warn 不阻塞，默认 console.warn） */
export interface PersistenceLogger {
  warn: (...args: unknown[]) => void
}

export interface PersistenceContext {
  db: SqliteDriver
  fts: FtsIndexQueue
  logger: PersistenceLogger
  /** chatRoom 消息是否落库（决策 8.1：弹幕高频无持久化价值，默认关） */
  persistChatRoom: boolean
}

/**
 * chatRoom 会话类型 wire 值。
 * 契约包 `CONVERSATION_TYPE` 刻意只收单群聊两值（chatRoom 归 chatroom 场景包），
 * 本包不反向依赖 chatroom 包，此处按 wire 常量单点声明（与 SDK `ChatConversationType` 对齐）。
 */
export const CHATROOM_TYPE = 'chatRoom'
