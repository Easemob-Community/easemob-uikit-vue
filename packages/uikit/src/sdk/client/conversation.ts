import type { ConversationTypeValue } from '../../constants'
import type { ConversationFilter as SdkConversationFilter, Message } from 'easemob-websdk'
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
    const filter: SdkConversationFilter = {}
    console.log('[UIKitClient] getServerConversations -> chatManager.getConversationList', options)
    const result = await this.core.chatManager.getConversationList(filter)
    console.log('[UIKitClient] getServerConversations <- result', {
      count: result.length,
    })
    return result
  }

  /** 获取本地会话列表（来自 SDK 同步后的内存数据） */
  getSessionList() {
    const list = this.core.chatManager.getConversationList()
    console.log('[ConversationService] getSessionList:', {
      count: list.length,
      items: list.map((item) => ({
        sessionId: item.conversationId,
        type: item.conversationType,
        unreadCount: item.unreadCount,
        lastMessageAt: item.lastMessageAt,
      })),
    })
    return list
  }

  /** 强制刷新会话列表 */
  async refreshSessionList(
    options?: { includeEmpty?: boolean },
  ) {
    return this.core.chatManager.refreshSessionList({
      includeEmpty: options?.includeEmpty ?? false,
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
    console.log('[ConversationService] markConversationRead ->', {
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
    const result = await this.core.chatManager.markConversationRead({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
    // mark 后立即查询该会话在列表中的状态
    const sessionList = this.core.chatManager.getConversationList()
    const session = sessionList.find(
      (s) => s.conversationId === options.conversationId,
    )
    console.log('[ConversationService] markConversationRead <- result:', result, 'session after mark:', session ? {
      sessionId: session.conversationId,
      unreadCount: session.unreadCount,
    } : 'not found')
    return result
  }

  /** 发送消息已读回执（单聊/群聊统一入口） */
  async sendMessageReadAck(
    options: {
      message: Message
      ackContent?: string
    },
  ) {
    return this.core.chatManager.markMessageRead({
      messages: [
        {
          message: options.message,
          ackContent: options.ackContent,
        },
      ],
    })
  }

  /** 删除会话 */
  async deleteConversation(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      deleteRoamingMessages?: boolean
      deleteLocal?: boolean
    },
  ) {
    return this.core.chatManager.deleteConversation({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      deleteRoamingMessages: options.deleteRoamingMessages ?? false,
      deleteLocal: options.deleteLocal ?? true,
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
