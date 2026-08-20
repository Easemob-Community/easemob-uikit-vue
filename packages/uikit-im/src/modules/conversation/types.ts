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

/**
 * Header `+` 菜单自定义项（conversation-list `menuItems` prop）。
 * 不传 `menuItems` 时使用内置三项（新建会话/添加联系人/创建群组）；
 * 传入空数组可隐藏菜单入口。
 */
export interface ConversationHeaderMenuItem {
  /** 操作 key（唯一标识） */
  key: string
  /** 菜单项文本 */
  label: string
  /** 图标名（EmIcon 图标名） */
  icon?: string
  /** 点击处理器；未提供时命中内置 key 走内置弹窗，否则触发 header-menu-action 事件 */
  handler?: (key: string) => void | Promise<void>
}

/**
 * 会话列表项完全接管插槽作用域（#item）。
 * 提供会话数据、选中/高亮态与内置动作句柄，让业务方完全掌控会话项渲染。
 */
export interface ConversationItemSlotScope {
  /** 当前会话 */
  conversation: Conversation
  /** 是否为当前激活会话 */
  active: boolean
  /** 是否处于键盘导航高亮态 */
  keyboardFocus: boolean
  /** 选中该会话（切换会话 + 已读回执 + 草稿加载等内部逻辑） */
  select: () => void
  /** 置顶/取消置顶 */
  pin: (isPinned: boolean) => void
  /** 免打扰/取消免打扰 */
  mute: (muted: boolean) => void
  /** 删除该会话（打开内置二次确认） */
  delete: () => void
  /** 标记已读 */
  read: () => void
  /** 触发自定义操作（customActions 中未提供 handler 的项） */
  customAction: (key: string) => void
}
