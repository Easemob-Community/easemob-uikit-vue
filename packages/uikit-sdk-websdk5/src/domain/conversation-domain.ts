import type { ConversationPersistenceHooks, ConversationRepository, ConversationTypeValue, UiConversation } from '@easemob-community/uikit-sdk-contract'
import { MESSAGE_TYPE, createLogger } from '@easemob-community/uikit-sdk-contract'
import { toUiConversations } from '../adapter/conversation-adapter'
import type { ManagerHost } from '../client'

const conversationLogger = createLogger('Conversation')

/**
 * 会话排序：置顶优先（按 pinnedTime 倒序），其余按最后一条消息时间倒序。
 * 注入 repository 的 refresh 路径使用（SDK 默认路径由 refreshSessionList 事件回填，
 * 不经本函数）。稳定排序，时间相同项保持追加顺序（对齐 webim4 sortConversations）。
 */
function sortConversations(list: readonly UiConversation[]): UiConversation[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned)
      return a.isPinned ? -1 : 1
    if (a.isPinned)
      return (b.pinnedTime ?? 0) - (a.pinnedTime ?? 0)
    return (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0)
  })
}

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
    if (type === MESSAGE_TYPE.COMBINE || type === 'unknown') {
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
    private hooks: {
      /**
       * 进入会话后补发未发送过已读回执的接收消息（批量，fire-and-forget）：
       * 登录时收到的离线消息在 onMessage 阶段可能尚未打开会话而无法即时回执，
       * 点击会话进入后统一补发（群聊使发送方气泡及时显示已读数）。
       */
      sendPendingReadReceipts?: (conversationId: string, conversationType: ConversationTypeValue) => void
      /**
       * 群聊会话摘要发送者显示名解析器。
       * 优先于 SDK lastMessage.sender.nickname，用于资料已缓存时直接展示昵称。
       */
      resolveSenderName?: (userId: string) => string | undefined
      /**
       * 会话数据入口接管注入（Phase 3.1 留口子）：当前仅消费 `fetchConversations`
       * （refresh 委托），其余方法为后续 DB 阶段预留。
       * Conversation repository override (Phase 3.1 seam): only
       * `fetchConversations` is consumed (refresh delegation) for now.
       */
      conversationRepository?: Partial<ConversationRepository>
      /**
       * 旁路持久化钩子（只写不读）：当前由 chat-events 会话同步分支消费
       * （saveConversations），本域预留口子保持装配对称，暂不消费。
       */
      persistence?: ConversationPersistenceHooks
    } = {},
  ) {}

  /** 进入某个会话：通知 SDK 当前正在浏览该会话 */
  enter(conversationId: string, conversationType: ConversationTypeValue) {
    this.client.chatManager.setCurrentConversation({ conversationId, conversationType })
    this.store.setCurrentConversationId(conversationId)
    // 补发该会话尚未回执的接收消息（不阻塞进入会话）
    this.hooks.sendPendingReadReceipts?.(conversationId, conversationType)
  }

  /** 离开当前会话 */
  leave() {
    this.client.chatManager.resetCurrentConversation()
    this.store.setCurrentConversationId(null)
  }

  /** 从本地缓存读取会话列表 */
  syncLocal(): UiConversation[] {
    const items = this.client.chatManager.getConversationList()
    conversationLogger.info('getConversationList raw (syncLocal)', items)
    dumpRawSnippets(items, 'syncLocal')
    const list = toUiConversations(items, { resolveSenderName: this.hooks.resolveSenderName })
    this.store.setList(list)
    return list
  }

  /**
   * 主动刷新服务端会话列表，由 onConversationListUpdate 事件回填 store。
   * 数据入口接管（Phase 3.1）：注入 fetchConversations 时改走注入实现
   * （游标翻页至 hasMore=false 合并全量后直接 setList，不触 SDK 也无事件回填）。
   */
  async refresh(includeEmpty = false) {
    const fetchConversations = this.hooks.conversationRepository?.fetchConversations
    if (fetchConversations) {
      const items: UiConversation[] = []
      let cursor: string | undefined
      do {
        const page = await fetchConversations(cursor, 50)
        items.push(...page.list)
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      // 去重（同 id 后者覆盖前者），并继承现有列表已补全的名称/头像，
      // 避免注入源缺资料时把已补全值冲回 ID（对齐 mergeWithExistingConversations 语义）
      const existing = this.store.conversationList ?? []
      const prevById = new Map(existing.map(cvs => [cvs.id, cvs]))
      const merged = new Map<string, UiConversation>()
      for (const item of items) {
        const prev = prevById.get(item.id)
        merged.set(item.id, prev
          ? {
            ...item,
            name: (!item.name || item.name === item.id) && prev.name && prev.name !== prev.id ? prev.name : item.name,
            avatar: item.avatar || prev.avatar,
          }
          : item)
      }
      this.store.setList(sortConversations(Array.from(merged.values())))
      return
    }
    await this.client.chatManager.refreshSessionList({ includeEmpty })
  }

  /** 删除会话（默认同时删除漫游消息；SDK 0.14.227 成功后总会清理本地会话缓存） */
  async remove(
    conversationId: string,
    conversationType: ConversationTypeValue,
    deleteRoamingMessages = true,
  ) {
    await this.client.chatManager.deleteConversation({
      conversationId,
      conversationType,
      deleteRoamingMessages,
    })
  }

  /** 删除会话但保留漫游消息（SDK 已无仅本地删除 API，用 deleteRoamingMessages=false 代替） */
  async removeLocal(conversationId: string, conversationType: ConversationTypeValue) {
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
    conversationType: ConversationTypeValue,
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
    conversationType: ConversationTypeValue,
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
  async markRead(conversationId: string, conversationType: ConversationTypeValue) {
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
    conversationType: ConversationTypeValue,
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
  async addMark(conversations: { conversationId: string, conversationType: ConversationTypeValue }[], mark: number) {
    await this.client.chatManager.addConversationMark({
      conversations,
      mark: mark as any,
    })
  }

  /** 移除会话标记 */
  async removeMark(conversations: { conversationId: string, conversationType: ConversationTypeValue }[], mark: number) {
    await this.client.chatManager.removeConversationMark({
      conversations,
      mark: mark as any,
    })
  }

  /** 发送 channel ack */
  async sendChannelAck(conversationId: string, conversationType: ConversationTypeValue) {
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
    conversationLogger.info('getConversationList raw (loadMore)', items)
    const list = toUiConversations(items, { resolveSenderName: this.hooks.resolveSenderName })
    this.store.setList(list)
  }
}
