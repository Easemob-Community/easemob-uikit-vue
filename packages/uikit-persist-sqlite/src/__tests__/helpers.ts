/**
 * 测试数据工厂（makeRecord(overrides) 模式，对齐 websdk5 persistence-hooks 测试风格）。
 */

import type { ConversationRecord, MessageRecord } from '@easemob/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'

let recordSeq = 0

/** 构造入库消息 DTO（默认单聊文本消息） */
export function makeRecord(overrides: Partial<MessageRecord> = {}): MessageRecord {
  const seq = ++recordSeq
  return {
    msgServerId: `srv-${seq}`,
    msgLocalId: `loc-${seq}`,
    from: 'peer1',
    to: 'me',
    sender: { userId: 'peer1' },
    conversationId: 'c1',
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: 1700000000000 + seq,
    body: { content: `hello ${seq}` },
    ...overrides,
  }
}

/** 构造入库会话 DTO */
export function makeConversation(overrides: Partial<ConversationRecord> = {}): ConversationRecord {
  const seq = ++recordSeq
  return {
    id: `cv-${seq}`,
    name: `会话 ${seq}`,
    type: CONVERSATION_TYPE.SINGLECHAT,
    unreadCount: 0,
    lastMessageText: `last ${seq}`,
    lastMessageTime: 1700000000000 + seq,
    isPinned: false,
    isMuted: false,
    marks: [],
    ...overrides,
  }
}
