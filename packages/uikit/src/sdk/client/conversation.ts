import type { ConversationTypeValue } from '../../constants'
import type { ClientCore } from './index'

/**
 * 会话相关 API 服务
 */
export class ConversationService {
  constructor(private core: ClientCore) {}

  /** 从服务端分页获取会话列表 */
  async getServerConversations(
    options?: {
      pageSize?: number
      cursor?: string
      includeEmptyConversations?: boolean
    },
  ) {
    const params = {
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
      includeEmptyConversations: options?.includeEmptyConversations ?? false,
    }
    console.log('[UIKitClient] getServerConversations -> chatManager.getConversationList', params)
    const result = await this.core.chatManager.getConversationList(params)
    console.log('[UIKitClient] getServerConversations <- result', {
      hasItems: !!result && 'items' in result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itemCount: (result as any)?.items?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursor: (result as any)?.cursor,
    })
    return result
  }

  /** 获取本地会话列表（WebSocket 同步的内存数据） */
  getSessionList() {
    return this.core.chatManager.getSessionList()
  }

  /** 强制刷新会话列表 */
  async refreshSessionList(
    options?: { needEmptySession?: boolean; needSessionMark?: boolean },
  ) {
    return this.core.chatManager.refreshSessionList({
      needEmptySession: options?.needEmptySession ?? false,
      needSessionMark: options?.needSessionMark ?? false,
    })
  }

  /** 置顶/取消置顶会话 */
  async setConversationPinned(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      pinned: boolean
    },
  ) {
    return this.core.chatManager.setConversationPinned({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      pinned: options.pinned,
    })
  }

  /** 标记会话已读（替代 sendChannelAck） */
  async markConversationRead(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
    },
  ) {
    return this.core.chatManager.markConversationRead({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
  }

  /** 发送消息已读回执（单聊） */
  async sendMessageReadAck(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      messageId: string
    },
  ) {
    return this.core.chatManager.sendMessageReadAck({
      conversationId: options.conversationId,
      messageId: options.messageId,
    })
  }

  /** 发送群消息已读回执 */
  async sendGroupMessageReadAck(
    options: {
      groupId: string
      messageId: string
      ackContent?: string
    },
  ) {
    return this.core.chatManager.sendGroupMessageReadAck({
      groupId: options.groupId,
      messageId: options.messageId,
      ackContent: options.ackContent || JSON.stringify({}),
    })
  }

  /** 删除会话 */
  async deleteConversation(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      deleteRoamingMessages?: boolean
    },
  ) {
    return this.core.chatManager.deleteConversation({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      deleteRoamingMessages: options.deleteRoamingMessages ?? false,
    })
  }

  /** 获取历史消息（分页） */
  async getHistoryMessages(
    options: {
      targetId: string
      conversationType: ConversationTypeValue
      pageSize?: number
      cursor?: string
    },
  ) {
    return this.core.chatManager.getHistoryMessages({
      conversationId: options.targetId,
      conversationType: options.conversationType,
      pageSize: options.pageSize ?? 20,
      cursor: options.cursor ?? '',
    })
  }
}
