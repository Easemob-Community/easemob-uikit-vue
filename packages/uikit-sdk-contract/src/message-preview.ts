import type { ConversationTypeValue } from './constants'
import { CONVERSATION_TYPE } from './constants'

/**
 * 自定义消息 event → 会话摘要预览文案映射（中立，与 locale 无关的硬编码兜底）。
 * 会话列表同步（SDK snippet）与消息驱动（UiMessage）共用同一份映射，
 * 保证自定义消息（如名片 userCard）在会话列表与消息列表的摘要展示一致。
 */
export const customEventPreviewMap: Record<string, string> = {
  userCard: '[名片]',
  order: '[订单]',
  vote: '[投票]',
}

/**
 * 群聊会话摘要拼接发送者前缀（单聊 / 无发送者 / 空文本不拼）。
 * 会话列表同步（conversation-adapter）与消息驱动共用同一拼接规则，
 * 保证两端摘要展示一致。
 */
export function formatConversationPreview(
  conversationType: ConversationTypeValue,
  senderName: string | undefined,
  text: string,
): string {
  if (conversationType === CONVERSATION_TYPE.GROUPCHAT && senderName && text) {
    return `${senderName}: ${text}`
  }
  return text
}
