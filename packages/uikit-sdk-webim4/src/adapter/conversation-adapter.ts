import type { EasemobChat } from 'easemob-websdk-4'
import type { MessagePreviewLabels, UiConversation, UiMessage } from '@easemob/uikit-sdk-contract'
import {
  CONVERSATION_TYPE,
  customEventPreviewMap,
  defaultLastMessageTextResolver,
  formatConversationPreview,
  normalizeUserId,
} from '@easemob/uikit-sdk-contract'
import { toUiMessage } from './message-adapter'

/** 4.x adapter 默认中文摘要标签（与历史 UI 行为保持一致）；notification-engine 复用。 */
export const adapterPreviewLabels: MessagePreviewLabels = {
  image: '[图片]',
  sticker: '[表情]',
  voice: '[语音]',
  video: '[视频]',
  file: '[文件]',
  location: '[位置]',
  combine: '[聊天记录]',
  custom: customEventPreviewMap,
  customFallback: '[自定义]',
  unknown: '',
}

/** 4.x 会话项类型别名（ServerConversations.conversations 元素） */
type ServerConversationItem = EasemobChat.ConversationItem

export interface ToUiConversationOptions {
  /** 当前登录用户 ID（toUiMessage 推导会话归属/方向所需） */
  currentUserId: string
  /** 群聊摘要发送者显示名解析器；返回 undefined 时回退到发送者 userId */
  resolveSenderName?: (userId: string) => string | undefined
}

/**
 * 从 4.x 会话项提取 lastMessage 的中立 UiMessage。
 * lastMessage 可能是空对象（`Record<string, never>`，无消息会话）或 null，
 * 也可能是 read/delivery/channel 回执体（不含 chatType/time/ext，不可转 UiMessage），均需排除。
 */
function toLastUiMessage(
  item: ServerConversationItem,
  currentUserId: string,
): UiMessage | undefined {
  const raw = item.lastMessage
  if (!raw || !('id' in raw) || !raw.id)
    return undefined
  if (raw.type === 'read' || raw.type === 'delivery' || raw.type === 'channel')
    return undefined
  return toUiMessage(raw as EasemobChat.ExcludeAckMessageBody, currentUserId)
}

/**
 * 提取会话最后一条消息 ID（domain 层维护「每会话最后一条消息 ID」用，
 * 4.x 清未读需以该 ID 构造 read/channel 回执消息）。
 */
export function extractLastMessageId(item: ServerConversationItem): string | undefined {
  const raw = item.lastMessage
  return raw && 'id' in raw && raw.id ? raw.id : undefined
}

/**
 * 将 4.x 服务端会话项（getServerConversations / getServerPinnedConversations 返回）
 * 转换为中立 UiConversation。
 *
 * 4.x 会话项不含名称/头像（ConversationItem 仅 conversationId/conversationType/
 * isPinned/pinnedTime/unReadCount/lastMessage/marks）：
 * - `name` 先以 conversationId 兜底展示，由 domain 层注入的资料源批量补全覆盖
 *   （补全判定沿用「name 为空或等于 id」的既有语义，见 websdk5 mergeWithExistingConversations）；
 * - `avatar` 留空，同样由 domain 层补全；
 * - `isMuted` 会话项不携带，恒为 false，由 domain 层 getSilentModeForConversations 批量回写。
 */
export function toUiConversation(
  item: ServerConversationItem,
  options: ToUiConversationOptions,
): UiConversation {
  const type = item.conversationType === CONVERSATION_TYPE.GROUPCHAT
    ? CONVERSATION_TYPE.GROUPCHAT
    : CONVERSATION_TYPE.SINGLECHAT

  const uiMsg = toLastUiMessage(item, options.currentUserId)
  const senderId = uiMsg ? normalizeUserId(uiMsg.from || '') : ''
  // 群聊摘要拼「发送者: 消息」前缀；4.x 无 sender 资料，优先走注入的 resolver，兜底 userId
  const senderName = senderId
    ? options.resolveSenderName?.(senderId) || senderId
    : undefined
  const lastMessageText = uiMsg
    ? formatConversationPreview(type, senderName, defaultLastMessageTextResolver(uiMsg, adapterPreviewLabels))
    : ''

  return {
    id: item.conversationId,
    name: item.conversationId,
    avatar: undefined,
    type,
    unreadCount: item.unReadCount || 0,
    lastMessageText,
    // 保留群聊最后一条消息发送者 userId，供会话列表项在资料异步就绪后重新解析昵称
    lastMessageFrom: type === CONVERSATION_TYPE.GROUPCHAT && senderId ? senderId : undefined,
    lastMessageTime: uiMsg?.timestamp,
    isPinned: item.isPinned ?? false,
    pinnedTime: item.pinnedTime || undefined,
    isMuted: false,
    marks: (item.marks || []).map(mark => Number(mark)),
  }
}

/** 批量转换 4.x 服务端会话项 */
export function toUiConversations(
  items: readonly ServerConversationItem[],
  options: ToUiConversationOptions,
): UiConversation[] {
  return items.map(item => toUiConversation(item, options))
}

/** 收消息会话代偿结果：会话摘要 patch + 未读增量（0/1） */
export interface ConversationUpsertFromMessage {
  /** 会话摘要 patch（lastMessageText/lastMessageTime/lastMessageFrom） */
  patch: Partial<UiConversation>
  /** 未读增量：他人消息且未「到达即读」为 1，其余为 0 */
  unreadIncrement: 0 | 1
}

/**
 * 从收发消息推导会话列表代偿更新。
 * 4.x 无 5.x 的 `onConversationListUpdate` 对等事件，未读角标 / lastMessage /
 * 新会话浮现必须在 onMessage 手动 upsert（websdk5 侧由 SDK 会话事件承担）。
 * - 摘要文本与 toUiConversation 同口径（群聊拼「发送者: 消息」前缀）；
 * - 未读增量：自己发送（含多端同步）恒为 0；`readOnArrive`（当前会话且页面可见，
 *   该情形已自动发已读回执，对齐 websdk5 当前会话自动已读语义）为 0，其余他人消息为 1。
 */
export function deriveConversationUpsertFromMessage(
  uiMsg: UiMessage,
  options: {
    /** 是否「当前活跃会话且页面可见」（到达即读，不计未读） */
    readOnArrive: boolean
    /** 群聊摘要发送者显示名解析器；返回 undefined 时回退到发送者 userId */
    resolveSenderName?: (userId: string) => string | undefined
  },
): ConversationUpsertFromMessage {
  const type = uiMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT
    ? CONVERSATION_TYPE.GROUPCHAT
    : CONVERSATION_TYPE.SINGLECHAT
  const senderId = normalizeUserId(uiMsg.from || '')
  const senderName = type === CONVERSATION_TYPE.GROUPCHAT && senderId
    ? options.resolveSenderName?.(senderId) || senderId
    : undefined
  return {
    patch: {
      lastMessageText: formatConversationPreview(type, senderName, defaultLastMessageTextResolver(uiMsg, adapterPreviewLabels)),
      lastMessageTime: uiMsg.timestamp,
      lastMessageFrom: type === CONVERSATION_TYPE.GROUPCHAT && senderId ? senderId : undefined,
    },
    unreadIncrement: !uiMsg.isSelf && !options.readOnArrive ? 1 : 0,
  }
}
