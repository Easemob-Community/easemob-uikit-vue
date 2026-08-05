import type { ConversationItem } from 'easemob-websdk'
import { CONVERSATION_TYPE } from '../../constants'
import { formatConversationPreview } from '../../utils/resolve-last-message-text'
import type { UiConversation } from '../types'
import { extractSnippetText } from './message-adapter'

/**
 * 将 SDK 本地会话缓存项转换为 UIKit 会话展示类型。
 */
export function toUiConversation(item: ConversationItem): UiConversation {
  const snippetText = extractSnippetText(item.lastMessage)
  // 群聊会话利用 SDK lastMessage.sender 预填充的发送者信息，拼接 "发送者: 消息" 格式。
  // sender.nickname 在 enableUserInfoSync 开启后由 SDK 在消息链路中补齐，
  // 未补齐时回退到 from（userId）保证总有前缀。
  // 拼接规则与消息驱动的 resolveLastMessageText 保持一致（formatConversationPreview）。
  const senderName = item.lastMessage?.sender?.nickname || item.lastMessage?.from || ''
  const lastMessageText = formatConversationPreview(item.conversationType, senderName, snippetText)

  return {
    id: item.conversationId,
    name: item.conversationName || item.conversationId,
    avatar: item.conversationAvatar,
    type: item.conversationType === CONVERSATION_TYPE.GROUPCHAT ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT,
    unreadCount: item.unreadCount || 0,
    lastMessageText,
    lastMessageTime: item.lastMessageAt,
    isPinned: item.isPinned ?? false,
    pinnedTime: item.pinnedTimestamp,
    isMuted: item.remindType === 'NONE',
    marks: [...(item.marks || [])],
    remindType: item.remindType,
  }
}

/** 批量转换 SDK 会话项 */
export function toUiConversations(items: readonly ConversationItem[]): UiConversation[] {
  return items.map(item => toUiConversation(item))
}
