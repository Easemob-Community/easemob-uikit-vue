import type { ConversationRepository } from '@easemob-community/uikit-sdk-contract'
import type { ConversationDomain } from '../../domain/conversation-domain'

export function createConversationRepository(domain: ConversationDomain): ConversationRepository {
  const conversationDomain = domain
  // 注意：repositories 注入不在此 getter 合并——fetchConversations 已由
  // ConversationDomain.refresh 委托覆盖（UI 实际消费 domains.*），
  // 其余注入方法本期不消费（Phase 3.1 仅留口子）。
  return {
    fetchConversations: async (cursor, pageSize) => {
      // 4.x 原生游标分页（游标由 domain 内部维护）：cursor 空 → refresh 第一页，
      // 否则 loadMore 追加一页；返回 store 快照 + domain 的 hasMore 状态
      if (!cursor)
        await conversationDomain.refresh()
      else
        await conversationDomain.loadMore(pageSize)
      return { list: conversationDomain.syncLocal(), cursor: undefined, hasMore: conversationDomain.hasMore }
    },
  }
}
