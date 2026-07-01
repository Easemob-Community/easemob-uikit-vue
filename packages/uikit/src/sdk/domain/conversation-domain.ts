import type { ManagerHost } from '../client'
import type { UiConversation } from '../types'
import { toUiConversations } from '../adapter/conversation-adapter'

/**
 * ConversationStore 需要暴露给 Domain 的最小接口。
 */
export interface ConversationStoreLike {
  setList: (list: UiConversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  setSyncing: (syncing: boolean) => void
  delete: (id: string) => void
  update: (id: string, patch: Partial<UiConversation>) => void
}

/**
 * 会话业务域：封装 SDK ChatManager 的会话相关能力。
 */
export class ConversationDomain {
  constructor(
    private client: ManagerHost,
    private store: ConversationStoreLike,
  ) {}

  /** 进入某个会话：通知 SDK 当前正在浏览该会话 */
  enter(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    this.client.chatManager.setCurrentConversation({ conversationId, conversationType })
    this.store.setCurrentConversationId(conversationId)
  }

  /** 离开当前会话 */
  leave() {
    this.client.chatManager.resetCurrentConversation()
    this.store.setCurrentConversationId(null)
  }

  /** 从本地缓存读取会话列表 */
  syncLocal(): UiConversation[] {
    const items = this.client.chatManager.getConversationList()
    const list = toUiConversations(items)
    this.store.setList(list)
    return list
  }

  /** 主动刷新服务端会话列表，由 onConversationListUpdate 事件回填 store */
  async refresh(includeEmpty = false) {
    await this.client.chatManager.refreshSessionList({ includeEmpty })
  }

  /** 删除会话（默认同时删除漫游消息和本地缓存） */
  async remove(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    deleteRoamingMessages = true,
  ) {
    await this.client.chatManager.deleteConversation({
      conversationId,
      conversationType,
      deleteRoamingMessages,
      deleteLocal: true,
    })
  }

  /** 仅删除本地缓存 */
  removeLocal(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    this.client.chatManager.deleteConversationLocally({
      conversationId,
      conversationType,
    })
    this.store.delete(conversationId)
  }

  /** 置顶/取消置顶会话 */
  async pin(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    pinned: boolean,
  ) {
    await this.client.chatManager.setConversationPinned({
      conversationId,
      conversationType,
      pinned,
    })
  }

  /** 标记会话已读 */
  async markRead(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    await this.client.chatManager.markConversationRead({
      conversationId,
      conversationType,
    })
  }

  /** 添加会话标记 */
  async addMark(conversations: { conversationId: string, conversationType: 'singleChat' | 'groupChat' }[], mark: number) {
    await this.client.chatManager.addConversationMark({
      conversations,
      mark: mark as any,
    })
  }

  /** 移除会话标记 */
  async removeMark(conversations: { conversationId: string, conversationType: 'singleChat' | 'groupChat' }[], mark: number) {
    await this.client.chatManager.removeConversationMark({
      conversations,
      mark: mark as any,
    })
  }

  /** 发送 channel ack */
  async sendChannelAck(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    // SDK5 无 sendChannelAck；使用 markConversationRead 达到已读效果
    await this.markRead(conversationId, conversationType)
  }

  /** 加载更多会话：SDK5 当前无分页游标，直接返回本地列表 */
  async loadMore(_pageSize?: number) {
    const items = this.client.chatManager.getConversationList()
    const list = toUiConversations(items)
    this.store.setList(list)
  }
}
