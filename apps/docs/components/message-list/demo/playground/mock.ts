/**
 * 单条气泡演练场 mock 数据（docs 专用，bubble.vue 使用）
 *
 * 构造覆盖引用卡片 / 多选态 / 状态组合 / 群已读圆圈的 UiMessage，
 * 供 EmMessageBubbleWrapper 直接渲染（EmUIKitProvider(:auto-init="false") 内）。
 * （消息列表配置面板演练场已并入在线代码演练场 template.ts，其 mock 为自包含构造。）
 */
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit'
import type { UiMessage } from '@easemob/uikit'

/** mock 会话 ID */
export const MOCK_BUBBLE_CONVERSATION_ID = 'mock_bubble_docs_001'

/** 对方普通文本消息（无引用） */
export function buildPlainMessage(): UiMessage {
  return {
    msgServerId: 'bubble_plain',
    msgLocalId: 'bubble_plain',
    from: 'u_tom',
    to: MOCK_BUBBLE_CONVERSATION_ID,
    sender: { userId: 'u_tom' },
    conversationId: MOCK_BUBBLE_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: Date.now() - 10 * 60_000,
    body: { content: '普通的对方文本消息，不携带任何附加信息。' },
    content: '普通的对方文本消息，不携带任何附加信息。',
    isSelf: false,
    status: MESSAGE_STATUS.READ,
  } as UiMessage
}

/** 对方文本消息 + 引用卡片（ext.msgQuote 驱动气泡下方 QuoteCard） */
export function buildQuoteMessage(): UiMessage {
  return {
    msgServerId: 'bubble_quote',
    msgLocalId: 'bubble_quote',
    from: 'u_tom',
    to: MOCK_BUBBLE_CONVERSATION_ID,
    sender: { userId: 'u_tom' },
    conversationId: MOCK_BUBBLE_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {
      msgQuote: {
        msgID: 'bubble_plain',
        msgPreview: '普通的对方文本消息，不携带任何附加信息。',
        msgSender: '李雷',
        msgType: 'text',
      },
    },
    timestamp: Date.now() - 9 * 60_000,
    body: { content: '这条消息引用了上面那条，引用卡片展示在气泡下方。' },
    content: '这条消息引用了上面那条，引用卡片展示在气泡下方。',
    isSelf: false,
    status: MESSAGE_STATUS.READ,
  } as UiMessage
}

/** 己方文本消息（状态由演练场配置实时切换） */
export function buildSelfMessage(status: UiMessage['status']): UiMessage {
  return {
    msgServerId: '',
    msgLocalId: 'bubble_self',
    from: 'u_self',
    to: MOCK_BUBBLE_CONVERSATION_ID,
    sender: { userId: 'u_self' },
    conversationId: MOCK_BUBBLE_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: Date.now() - 5 * 60_000,
    body: { content: '己方消息：状态图标与文本随演练场配置的「消息状态」组合变化。' },
    content: '己方消息：状态图标与文本随演练场配置的「消息状态」组合变化。',
    isSelf: true,
    status,
  } as UiMessage
}

/** 己方群消息 + 群已读回执圆圈（groupReadCount > 0 且 requireGroupAck） */
export function buildGroupReadMessage(): UiMessage {
  return {
    msgServerId: 'bubble_groupread',
    msgLocalId: 'bubble_groupread',
    from: 'u_self',
    to: MOCK_BUBBLE_CONVERSATION_ID,
    sender: { userId: 'u_self' },
    conversationId: MOCK_BUBBLE_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: Date.now() - 3 * 60_000,
    body: { content: '群聊消息：开启「群已读回执」后，气泡下方展示已读圆圈（数字 = 已读人数）。' },
    content: '群聊消息：开启「群已读回执」后，气泡下方展示已读圆圈（数字 = 已读人数）。',
    isSelf: true,
    status: MESSAGE_STATUS.READ,
    requireGroupAck: true,
    groupReadCount: 5,
  } as UiMessage
}
