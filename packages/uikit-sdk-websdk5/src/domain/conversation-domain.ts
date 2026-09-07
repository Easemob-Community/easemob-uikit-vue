import type { ConversationListFilter, ConversationPage, ConversationPersistenceHooks, ConversationRepository, ConversationSearchParams, ConversationTypeValue, UiConversation } from '@easemob/uikit-sdk-contract'
import { MESSAGE_TYPE, createLogger } from '@easemob/uikit-sdk-contract'
import { toUiConversations } from '../adapter/conversation-adapter'
import type { ManagerHost } from '../client'

const conversationLogger = createLogger('Conversation')

/**
 * 会话排序：置顶优先（按 pinnedTime 倒序），其余按最后一条消息时间倒序。
 * 注入 repository 的 refresh 路径使用（SDK 默认路径由 refreshSessionList 事件回填，
 * 不经本函数）。稳定排序，时间相同项保持追加顺序（对齐 webim4 sortConversations）。
 * 注意：此处展示排序键（置顶段 pinnedTime、非置顶段 lastMessageTime）与 DB 侧
 * keyset 分页键（coalesce(lastMessageTime, draftTime, createdAt)）不一致是刻意的——
 * 本函数只管「展示层口径」，分页键由注入实现（repository）内部保证，两者无需对齐。
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
  /** 分页数据源场景回写「还有更多会话」（可选，SDK 全量加载场景缺省即可） */
  setHasMoreConversations?: (value: boolean) => void
}

/**
 * 会话业务域：封装 SDK ChatManager 的会话相关能力。
 */

/** channel ack 节流窗口：同一会话该时长内不重复发送 */
const CHANNEL_ACK_THROTTLE_MS = 1000

export class ConversationDomain {
  /** 各会话最近一次发送 channel ack 的时间戳 */
  private channelAckSentAt = new Map<string, number>()

  /** 注入数据源的分页游标（refresh 拉首页时重置；loadMore 续页推进） */
  private injectedCursor: string | undefined

  /** 注入数据源是否还有下一页（无游标即到底） */
  private injectedHasMore = false

  /** 注入数据源的当前过滤条件（决策 8.19：refresh 登记，loadMore 续页沿用；refresh 重置游标即 filter 维度隔离） */
  private injectedFilter: ConversationListFilter | undefined

  /**
   * 注入页归一化：实现方返回 hasMore=true 但 cursor 缺失属契约违例
   * （ConversationPage 约定 hasMore=true 必带 cursor），按到底处理并 warn 一次——
   * 否则 UI 触底后 loadMore 会持 undefined 游标原地空转假加载。
   */
  private normalizeInjectedPage(page: ConversationPage): ConversationPage {
    if (page.hasMore && !page.cursor) {
      conversationLogger.warn('[ConversationDomain] fetchConversations 契约违例：hasMore=true 但 cursor 缺失，按到底处理')
      return { ...page, hasMore: false }
    }
    return page
  }

  /**
   * 合并注入页与现有列表：继承现有列表已补全的名称/头像，
   * 避免注入源缺资料时把已补全值冲回 ID（对齐 mergeWithExistingConversations 语义）。
   */
  private mergeWithExisting(items: UiConversation[]): UiConversation[] {
    const existing = this.store.conversationList ?? []
    const prevById = new Map(existing.map(cvs => [cvs.id, cvs]))
    return items.map((item) => {
      const prev = prevById.get(item.id)
      return prev
        ? {
          ...item,
          name: (!item.name || item.name === item.id) && prev.name && prev.name !== prev.id ? prev.name : item.name,
          avatar: item.avatar || prev.avatar,
        }
        : item
    })
  }

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
       * 会话数据入口接管注入：消费 `fetchConversations`（refresh 拉首页 +
       * loadMore 游标续页委托，大会话量懒加载不一次性灌全量）。
       * Conversation repository override: `fetchConversations` is consumed
       * (refresh first page + loadMore cursor continuation).
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
   * 数据入口接管：注入 fetchConversations 时改走注入实现——**只拉首页**并
   * 记录游标（大会话量懒加载，不一次性灌全量），续页由 `loadMore` 推进；
   * 不触 SDK 也无事件回填。
   * `filter`（决策 8.19）：分类过滤下推注入源，游标按 filter 维度隔离——
   * 与上次 refresh 的 filter 不同即重置游标重新拉首页；SDK 默认路径忽略 filter。
   */
  async refresh(includeEmpty = false, filter?: ConversationListFilter) {
    const fetchConversations = this.hooks.conversationRepository?.fetchConversations
    if (fetchConversations) {
      // 登记过滤条件供 loadMore 沿用（refresh 拉首页即游标重置，天然按 filter 维度隔离）
      this.injectedFilter = filter
      const page = this.normalizeInjectedPage(await fetchConversations(undefined, 50, filter))
      this.injectedCursor = page.hasMore ? page.cursor : undefined
      this.injectedHasMore = page.hasMore
      this.store.setHasMoreConversations?.(page.hasMore)
      this.store.setList(sortConversations(this.mergeWithExisting(page.list)))
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

  /**
   * 加载更多会话。
   * 注入数据源路径：游标续页追加（去重 + 重排序 + 回写 hasMore），无更多时短路；
   * SDK 默认路径：SDK5 当前无分页游标，直接返回本地列表。
   * Load more conversations: with an injected repository, continues from the
   * cursor and appends (dedupe + re-sort + hasMore write-back); otherwise falls
   * back to the SDK local list (SDK5 has no pagination cursor).
   */
  async loadMore(pageSize = 50) {
    const fetchConversations = this.hooks.conversationRepository?.fetchConversations
    if (fetchConversations) {
      if (!this.injectedHasMore || !this.injectedCursor)
        return
      // 续页沿用 refresh 登记的过滤条件（游标按 filter 维度隔离）
      const page = this.normalizeInjectedPage(await fetchConversations(this.injectedCursor, pageSize, this.injectedFilter))
      this.injectedCursor = page.hasMore ? page.cursor : undefined
      this.injectedHasMore = page.hasMore
      this.store.setHasMoreConversations?.(page.hasMore)
      const existing = this.store.conversationList ?? []
      const existingIds = new Set(existing.map(cvs => cvs.id))
      const appended = [
        ...existing,
        ...this.mergeWithExisting(page.list).filter(cvs => !existingIds.has(cvs.id)),
      ]
      this.store.setList(sortConversations(appended))
      return
    }
    const items = this.client.chatManager.getConversationList()
    conversationLogger.info('getConversationList raw (loadMore)', items)
    const list = toUiConversations(items, { resolveSenderName: this.hooks.resolveSenderName })
    this.store.setList(list)
  }

  /**
   * 登出清理：重置注入数据源的分页游标/hasMore（避免跨 logout/login 存活，
   * 换账号登录后 loadMore 仍按旧账号游标续页）。对齐 UserInfoDomain.dispose 惯例，
   * 由 adapter logout 收口调用。
   */
  dispose() {
    this.injectedCursor = undefined
    this.injectedHasMore = false
    this.injectedFilter = undefined
  }

  /**
   * 全量总未读数（仅注入数据源时可用）：委托 repository 聚合查询；
   * 未注入返回 null（调用方回落内存求和）。
   * Total unread across all conversations (injected data source only);
   * null when not injected.
   */
  async getTotalUnreadCount(): Promise<number | null> {
    const query = this.hooks.conversationRepository?.getTotalUnreadCount
    if (!query)
      return null
    return query()
  }

  /**
   * 是否支持会话列表过滤下推（决策 8.19）：注入数据源即视为支持
   * （persist 实现下推 SQL；其它注入源可在忽略 filter 时回落——UI 侧据此
   * 决定 tab 过滤走远程还是内存）。SDK 默认路径恒 false（SDK 本地列表无此能力）。
   */
  get supportsConversationListFilter(): boolean {
    return !!this.hooks.conversationRepository?.fetchConversations
  }

  /**
   * 会话搜索（仅注入数据源时可用）：委托 conversationRepository.searchConversations，
   * 结果原样返回、不写入会话 store（搜索渲染态由调用方本地持有）。
   * 未注入返回 null，UI 回落内存过滤。
   * Conversation search (injected data source only): delegates to the repository
   * override; results are NOT written to the conversation store. Returns null
   * when not injected so the UI falls back to in-memory filtering.
   */
  async searchConversations(params: ConversationSearchParams): Promise<ConversationPage | null> {
    const search = this.hooks.conversationRepository?.searchConversations
    if (!search)
      return null
    return search(params)
  }
}
