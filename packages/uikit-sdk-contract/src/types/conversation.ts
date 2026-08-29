import type { ConversationTypeValue } from '../constants'

/** UIKit 会话展示类型 */
export interface UiConversation {
  /** 会话 ID */
  id: string
  /** 展示名称 */
  name: string
  /** 头像 */
  avatar?: string
  /** 会话类型 */
  type: ConversationTypeValue
  /** 未读数 */
  unreadCount: number
  /** 最后一条消息摘要文本 */
  lastMessageText: string
  /** 最后一条消息发送者 userId（群聊场景用于异步资料就绪后重新解析昵称） */
  lastMessageFrom?: string
  /** 最后一条消息时间戳 */
  lastMessageTime?: number
  /** 是否置顶 */
  isPinned: boolean
  /** 置顶时间戳 */
  pinnedTime?: number
  /** 是否免打扰 */
  isMuted: boolean
  /** 会话标记列表 */
  marks: number[]
  /** 草稿内容 */
  draft?: string
  /** 草稿保存时间 */
  draftTime?: number
  /** 提醒类型 */
  remindType?: string
}
