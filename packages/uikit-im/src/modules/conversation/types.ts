import type { UiConversation as Conversation } from '@easemob/uikit-core'

/**
 * 会话列表分栏 tab 类型：
 * - all：全部会话
 * - unread：未读会话（unreadCount > 0）
 * - atMe：@我 的会话（本地 atMeMap 命中）
 * - single：单聊
 * - group：群组
 */
export type ConversationTabKey = 'all' | 'unread' | 'atMe' | 'single' | 'group'

/** 默认分栏 tab 集合：全部 / 未读 / @我 / 单聊 / 群组（顺序即渲染优先级） */
export const DEFAULT_CONVERSATION_TABS: ConversationTabKey[] = [
  'all',
  'unread',
  'atMe',
  'single',
  'group',
]

/**
 * 会话分栏 tab 栏完全接管插槽作用域（#tabs / ConversationTabs 默认插槽）。
 * 提供 tabs / activeTab / selectTab，让业务方完全掌控渲染。
 */
export interface ConversationTabsSlotScope {
  /** 当前展示的分栏 tab 集合（顺序即优先级） */
  tabs: ConversationTabKey[]
  /** 当前激活的分栏 tab */
  activeTab: ConversationTabKey
  /** 切换分栏 tab */
  selectTab: (tab: ConversationTabKey) => void
}

export interface ConversationAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position?: 'mobile' | 'pc' | 'both'
  handler?: (conversation: Conversation) => void | Promise<void>
}
