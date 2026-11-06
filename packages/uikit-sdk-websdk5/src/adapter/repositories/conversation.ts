import type { ConversationRepository } from '@easemob-community/uikit-sdk-contract'
import type { ConversationDomain } from '../../domain/conversation-domain'

export function createConversationRepository(domain: ConversationDomain): ConversationRepository {
  const conversationDomain = domain
  // 注意：repositories 注入不在此 getter 合并——fetchConversations 已由
  // ConversationDomain.refresh 委托覆盖（UI 实际消费 domains.*），
  // 其余注入方法本期不消费（Phase 3.1 仅留口子）。
  return {
    fetchConversations: async () => {
      // SDK5 当前无游标分页，直接返回本地会话全量快照
      const list = conversationDomain.syncLocal()
      return { list, cursor: undefined, hasMore: false }
    },
  }
}
