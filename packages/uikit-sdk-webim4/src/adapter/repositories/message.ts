import type { MessageRepository, SdkMessage } from '@easemob-community/uikit-sdk-contract'
import type { MessageDomain } from '../../domain/message-domain'
import type { ConversationDomain } from '../../domain/conversation-domain'

export function createMessageRepository(domains: { message: MessageDomain, conversation: ConversationDomain }): MessageRepository {
  const messageDomain = domains.message
  const conversationDomain = domains.conversation

  // 注意：repositories 注入不在此 getter 合并——loadMessages 已由
  // MessageDomain.fetchHistory 委托覆盖（UI 实际消费 domains.*），
  // 其余注入方法本期不消费（Phase 3.1 仅留口子）。
  return {
    loadMessages: async (conversationId, conversationType, cursor, pageSize) => {
      const result = await messageDomain.fetchHistory(conversationId, conversationType, cursor, pageSize)
      return {
        list: result.list as SdkMessage[],
        cursor: result.cursor,
        hasMore: result.hasMore,
      }
    },

    sendText: (conversationId, conversationType, content, ext, needReadReceipt) =>
      messageDomain.sendText(conversationId, conversationType, content, ext, needReadReceipt),

    sendImage: (conversationId, conversationType, data, ext, needReadReceipt) =>
      messageDomain.sendImage(conversationId, conversationType, data, ext, needReadReceipt),

    sendFile: (conversationId, conversationType, data, ext, needReadReceipt) =>
      messageDomain.sendFile(conversationId, conversationType, data, ext, needReadReceipt),

    sendVoice: (conversationId, conversationType, data, duration, ext, needReadReceipt) =>
      messageDomain.sendVoice(conversationId, conversationType, data, duration, ext, needReadReceipt),

    sendVideo: (conversationId, conversationType, data, duration, ext, needReadReceipt) =>
      messageDomain.sendVideo(conversationId, conversationType, data, duration, ext, needReadReceipt),

    // 契约的 needReadReceipt 未透传：domain sendLocation 无此参数（SDK 不支持位置消息回执）
    sendLocation: (conversationId, conversationType, latitude, longitude, address, ext) =>
      messageDomain.sendLocation(conversationId, conversationType, latitude, longitude, address, ext),

    sendCustom: (conversationId, conversationType, event, customParams, ext) => {
      // 契约 customParams 为 unknown 值域，domain/SDK wire 仅接受 string 值域，做浅层 String 收敛
      const mappedParams = customParams
        ? Object.fromEntries(Object.entries(customParams).map(([k, v]) => [k, String(v)]))
        : undefined
      return messageDomain.sendCustom(conversationId, conversationType, event, mappedParams, ext)
    },

    sendCmd: (conversationId, conversationType, action, ext) =>
      messageDomain.sendCmd(conversationId, conversationType, action, ext),

    // 契约 sendCombine 无 compatibleText 参数，domain 侧以空串占位
    sendCombine: (conversationId, conversationType, title, summary, messageList, ext) =>
      messageDomain.sendCombine(conversationId, conversationType, title, summary, '', messageList, ext),

    recall: (conversationId, conversationType, messageId) =>
      messageDomain.recall(conversationId, conversationType, messageId),

    markMessagesRead: (conversationId, conversationType, messageIds) =>
      messageDomain.markMessagesRead(conversationId, conversationType, messageIds),

    markConversationRead: (conversationId, conversationType) =>
      conversationDomain.markRead(conversationId, conversationType),

    modifyText: (conversationId, conversationType, messageId, text) =>
      messageDomain.modifyText(conversationId, conversationType, messageId, text),

    getGroupReadReceiptUsers: async (groupId, messageId, _cursor, pageSize) => {
      // 4.x fetchGroupReadDetail 不支持分页（getGroupMsgReadUser limit 固定 500），
      // cursor 忽略，恒报 hasMore=false
      const result = await messageDomain.fetchGroupReadDetail(groupId, messageId, pageSize)
      return {
        list: result.users.map(u => ({ userId: u.userId, timestamp: u.timestamp })),
        cursor: undefined,
        hasMore: false,
      }
    },
  }
}
