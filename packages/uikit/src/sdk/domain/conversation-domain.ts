import type { ManagerHost } from '../client'
import type { UiConversation } from '../types'
import { toUiConversations } from '../adapter/conversation-adapter'
import { createLogger } from '../../utils/logger'

const conversationLogger = createLogger('Conversation')

/**
 * 诊断：打印 SDK 原始会话项中 combine/unknown 类型的 lastMessage 形态。
 * 用于定位合并消息在会话列表预览空白的问题（payload-decoder 降级 /
 * toConversationSummary 产 'unknown' 两条 SDK 侧嫌疑路径）。
 * 仅当列表中存在 combine/unknown snippet 时才输出，正常情况零噪音。
 */
function dumpRawSnippets(items: ReturnType<ManagerHost['chatManager']['getConversationList']>, source: string): void {
  const typeCount: Record<string, number> = {}
  const suspects: unknown[] = []
  for (const item of items) {
    const type = String(item.lastMessage?.type ?? '(null)')
    typeCount[type] = (typeCount[type] ?? 0) + 1
    if (type === 'combine' || type === 'unknown') {
      suspects.push({
        conversationId: item.conversationId,
        lastMessage: item.lastMessage,
      })
    }
  }
  if (suspects.length > 0) {
    conversationLogger.info(`raw snippets (${source})`, { typeCount, suspects })
  }
}

/**
 * ConversationStore 需要暴露给 Domain 的最小接口。
 */
export interface ConversationStoreLike {
  setList: (list: UiConversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  setSyncing: (syncing: boolean) => void
  delete: (id: string) => void
  update: (id: string, patch: Partial<UiConversation>) => void
  /** 会话列表快照（可选）：sendChannelAck 用它读取未读数做短路守卫 */
  conversationList?: UiConversation[]
}

/**
 * 会话业务域：封装 SDK ChatManager 的会话相关能力。
 */

/** channel ack 节流窗口：同一会话该时长内不重复发送 */
const CHANNEL_ACK_THROTTLE_MS = 1000

export class ConversationDomain {
  /** 各会话最近一次发送 channel ack 的时间戳 */
  private channelAckSentAt = new Map<string, number>()

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
    dumpRawSnippets(items, 'syncLocal')
    const list = toUiConversations(items)
    this.store.setList(list)
    return list
  }

  /** 主动刷新服务端会话列表，由 onConversationListUpdate 事件回填 store */
  async refresh(includeEmpty = false) {
    await this.client.chatManager.refreshSessionList({ includeEmpty })
  }

  /** 删除会话（默认同时删除漫游消息；SDK 0.14.227 成功后总会清理本地会话缓存） */
  async remove(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    deleteRoamingMessages = true,
  ) {
    await this.client.chatManager.deleteConversation({
      conversationId,
      conversationType,
      deleteRoamingMessages,
    })
  }

  /** 删除会话但保留漫游消息（SDK 已无仅本地删除 API，用 deleteRoamingMessages=false 代替） */
  async removeLocal(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    await this.client.chatManager.deleteConversation({
      conversationId,
      conversationType,
      deleteRoamingMessages: false,
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

  /**
   * 设置/取消会话免打扰。
   * - 免打扰：PushManager.setConversationSilentMode，规则为 remindType=NONE（不提醒）；
   * - 取消：clearConversationRemindType 恢复默认提醒。
   * 成功后立即更新本地 store（多端同步事件不保证回推到本端），
   * 若服务端随后下发 CONVERSATION_MUTE_INFO_CHANGED 事件，更新是幂等的。
   */
  async setMuted(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    muted: boolean,
  ) {
    if (muted) {
      await this.client.pushManager.setConversationSilentMode({
        conversationId,
        conversationType,
        rule: { mode: 'REMIND_TYPE', remindType: 'NONE' },
      })
    }
    else {
      await this.client.pushManager.clearConversationRemindType({
        conversationId,
        conversationType,
      })
    }
    this.store.update(conversationId, {
      isMuted: muted,
      remindType: muted ? 'NONE' : 'DEFAULT',
    })
  }

  /** 清空会话未读数（协议仅同步自己多设备，不再发送给对方） */
  async markRead(conversationId: string, conversationType: 'singleChat' | 'groupChat') {
    await this.client.chatManager.clearConversationUnreadMessageCount({
      conversationId,
      conversationType,
    })
  }

  /**
   * 清空聊天记录（只清消息，不删除会话）。
   * - deleteRoamingMessages=true：同时删除服务端漫游历史消息
   *   （SDK removeHistoryMessages 按 beforeTimestamp 清空当前时间之前的全部历史）；
   * - deleteRoamingMessages=false：仅由调用方清理本地消息缓存。
   * 注意：不要使用 deleteConversation 实现"清空聊天记录"，否则整个会话会从列表消失。
   */
  async clearChatHistory(
    conversationId: string,
    conversationType: 'singleChat' | 'groupChat',
    deleteRoamingMessages = false,
  ) {
    if (deleteRoamingMessages) {
      await this.client.chatManager.removeHistoryMessages({
        conversationId,
        conversationType,
        beforeTimestamp: Date.now(),
      })
    }
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
    // 未读数为 0 时无需发送（store 未暴露会话列表时退化为不守卫）
    const unread = this.store.conversationList?.find(c => c.id === conversationId)?.unreadCount
    if (unread !== undefined && unread <= 0)
      return
    // 简单节流：同一会话短时间内不重复发送
    const now = Date.now()
    const last = this.channelAckSentAt.get(conversationId) || 0
    if (now - last < CHANNEL_ACK_THROTTLE_MS)
      return
    this.channelAckSentAt.set(conversationId, now)
    // SDK5 无 sendChannelAck；使用 clearConversationUnreadMessageCount 达到已读效果
    await this.markRead(conversationId, conversationType)
  }

  /** 加载更多会话：SDK5 当前无分页游标，直接返回本地列表 */
  async loadMore(_pageSize?: number) {
    const items = this.client.chatManager.getConversationList()
    const list = toUiConversations(items)
    this.store.setList(list)
  }
}
