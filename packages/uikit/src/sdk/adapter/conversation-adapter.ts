import type { ConversationItem } from 'easemob-websdk'
import type { UiConversation } from '../types'
import { extractSnippetText } from './message-adapter'

/**
 * 将 SDK 本地会话缓存项转换为 UIKit 会话展示类型。
 */
export function toUiConversation(item: ConversationItem): UiConversation {
  return {
    id: item.conversationId,
    name: item.conversationName || item.conversationId,
    avatar: item.conversationAvatar,
    type: item.conversationType === 'groupChat' ? 'groupChat' : 'singleChat',
    unreadCount: item.unreadCount || 0,
    lastMessageText: extractSnippetText(item.lastMessage),
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
