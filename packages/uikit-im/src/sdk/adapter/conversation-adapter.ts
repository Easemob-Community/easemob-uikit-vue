import type { ConversationItem } from 'easemob-websdk'
import { CONVERSATION_TYPE } from '@easemob/uikit-core'
import { formatConversationPreview } from '../../utils/resolve-last-message-text'
import type { UiConversation } from '@easemob/uikit-core'
import { extractSnippetText, normalizeUserId } from './message-adapter'

export interface ToUiConversationOptions {
  /** 群聊摘要发送者显示名解析器；返回 undefined 时回退到 SDK 提供的 sender 或 from */
  resolveSenderName?: (userId: string) => string | undefined
}

/**
 * 将 SDK 本地会话缓存项转换为 UIKit 会话展示类型。
 */
export function toUiConversation(item: ConversationItem, options?: ToUiConversationOptions): UiConversation {
  const snippetText = extractSnippetText(item.lastMessage)
  // 群聊会话利用 SDK lastMessage.sender 预填充的发送者信息，拼接 "发送者: 消息" 格式。
  // sender.nickname 在 enableUserInfoSync 开启后由 SDK 在消息链路中补齐；
  // 若 UIKit 用户资料/联系人资料已缓存，优先用 resolver 解析为备注/昵称。
  // from / sender.userId 先归一化（去掉多设备后缀 /deviceId），保证 resolver 能命中资料。
  // 拼接规则与消息驱动的 resolveLastMessageText 保持一致（formatConversationPreview）。
  const rawFrom = normalizeUserId(item.lastMessage?.from || '')
  const senderUserId = normalizeUserId(item.lastMessage?.sender?.userId || '')
  const senderId = senderUserId || rawFrom
  const resolvedName = senderId ? options?.resolveSenderName?.(senderId) : undefined
  const senderName = item.lastMessage?.sender?.nickname || resolvedName || senderUserId || rawFrom || ''
  const lastMessageText = formatConversationPreview(item.conversationType, senderName, snippetText)

  return {
    id: item.conversationId,
    name: item.conversationName || item.conversationId,
    avatar: item.conversationAvatar,
    type: item.conversationType === CONVERSATION_TYPE.GROUPCHAT ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT,
    unreadCount: item.unreadCount || 0,
    lastMessageText,
    // 保留群聊最后一条消息发送者 userId，供会话列表项在资料异步就绪后重新解析昵称
    lastMessageFrom: senderId || undefined,
    lastMessageTime: item.lastMessageAt,
    isPinned: item.isPinned ?? false,
    pinnedTime: item.pinnedTimestamp,
    isMuted: item.remindType === 'NONE',
    marks: [...(item.marks || [])],
    remindType: item.remindType,
  }
}

/** 批量转换 SDK 会话项 */
export function toUiConversations(items: readonly ConversationItem[], options?: ToUiConversationOptions): UiConversation[] {
  return items.map(item => toUiConversation(item, options))
}
