import type { ConversationTypeValue } from '../../constants'

/**
 * 消息通知条目。
 * 同一会话短时间窗口内的连续消息会合并为同一条：
 * 内容刷新为最新消息，unreadCount 累加，卡片不新增。
 */
export interface NotificationItem {
  /** 通知唯一 ID（同会话合并时复用同一 ID） */
  id: string
  /** 标题（单聊为发送者名，群聊为群名） */
  title: string
  /** 正文摘要（群聊包含 "发送者: 内容" 前缀） */
  body: string
  /** 头像地址（单聊为发送者头像，群聊为群头像） */
  avatar?: string
  /** 消息时间戳（ms） */
  timestamp: number
  /** 会话 ID */
  conversationId: string
  /** 会话类型 */
  conversationType: ConversationTypeValue
  /** 合并窗口内累计的消息条数（>1 时展示未读合并数） */
  unreadCount: number
}
