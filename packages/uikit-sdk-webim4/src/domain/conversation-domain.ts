import WebIM from 'easemob-websdk-4'
import type { EasemobChat } from 'easemob-websdk-4'
import type { ConversationPersistenceHooks, ConversationRepository, ConversationTypeValue, UiConversation } from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, createLogger, toConversationRecord } from '@easemob-community/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import { extractLastMessageId, toUiConversations } from '../adapter/conversation-adapter'
import { firePersistenceHook } from '../persistence'

const conversationLogger = createLogger('UIKit:Webim4ConversationDomain')

/** 会话列表分页大小（getServerConversations pageSize 取值 1-50） */
const CONVERSATION_PAGE_SIZE = 50
/** 免打扰状态批量查询的单批上限（对齐 websdk5 patchConversationMuteStates 的 20 条/批） */
const MUTE_QUERY_BATCH_SIZE = 20
/** channel ack 节流窗口：同一会话该时长内不重复发送（对齐 websdk5） */
const CHANNEL_ACK_THROTTLE_MS = 1000

/**
 * ConversationStore 需要暴露给 Domain 的最小接口（与 websdk5 ConversationDomain 同构）。
 */
export interface ConversationStoreLike {
  setList: (list: UiConversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  setSyncing: (syncing: boolean) => void
  delete: (id: string) => void
  update: (id: string, patch: Partial<UiConversation>) => void
  /** 会话列表快照（可选）：sendChannelAck 用它读取未读数做短路守卫 */
  conversationList?: UiConversation[]
  /**
   * 置位「会话列表已加载」（可选）。websdk5 在 onSyncDataFinished 置位；
   * 4.x 无对等事件，由首次 refresh 成功后代偿置位（幂等），解锁同步横幅守卫。
   */
  setConversationsLoaded?: (v: boolean) => void
}

/** 会话资料补全目标（昵称/头像缺失的会话） */
export interface ConversationProfileTarget {
  id: string
  type: ConversationTypeValue
}

/** 会话资料补全结果 */
export interface ConversationProfile {
  id: string
  name?: string
  avatar?: string
}

export interface ConversationDomainDeps {
  /**
   * 进入会话后补发未发送过已读回执的接收消息（批量，fire-and-forget）：
   * 登录时收到的离线消息在 onMessage 阶段可能尚未打开会话而无法即时回执，
   * 点击会话进入后统一补发（对齐 websdk5 的依赖注入模式，不 import message-domain）。
   */
  sendPendingReadReceipts?: (conversationId: string, conversationType: ConversationTypeValue) => void
  /** 群聊会话摘要发送者显示名解析器（优先于发送者 userId 兜底） */
  resolveSenderName?: (userId: string) => string | undefined
  /**
   * 会话资料批量补全源：4.x 会话项不含名称/头像（主计划 2.8），
   * 由注入方（用户资料域 fetchUserInfoById + 群组域 getGroupInfo 的组合）批量解析。
   * domain 侧负责批量收集 + 去重缓存（D94 Promise 去重思路），注入方只做解析。
   */
  fetchConversationProfiles?: (
    targets: ConversationProfileTarget[],
  ) => Promise<ConversationProfile[]>
  /**
   * 从消息链路推导会话「最后一条消息 ID」（4.x 清未读需以该 ID 构造
   * read/channel 回执消息，接口不暴露该细节）；未注入时回退到 domain
   * 内部从会话 lastMessage 维护的映射。
   */
  getLastMessageId?: (conversationId: string, conversationType: ConversationTypeValue) => string | undefined
  /**
   * 会话数据入口接管注入（Phase 3.1 留口子）：当前仅消费 `fetchConversations`
   * （refresh 委托），其余方法为后续 DB 阶段预留。
   * Conversation repository override (Phase 3.1 seam): only
   * `fetchConversations` is consumed (refresh delegation) for now.
   */
  conversationRepository?: Partial<ConversationRepository>
  /**
   * 旁路持久化钩子（Electron 本地库 SQLite 留口子，对齐 websdk5）：
   * 会话列表回填（refresh/loadMore，含注入 repository 路径）后
   * `saveConversations(merged.map(toConversationRecord))` 整体快照落库；
   * fire-and-forget，钩子异常只告警不阻塞。
   */
  conversationPersistence?: ConversationPersistenceHooks
}

/**
 * 会话排序：置顶优先（按 pinnedTime 倒序），其余按最后一条消息时间倒序。
 * Array.prototype.sort 为稳定排序，时间相同项保持追加顺序，
 * 保证分页追加与首屏排序一致（主计划 2.8「排序稳定性」）。
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

/** 会话资料补全的最大尝试次数：失败/空名允许后续 refresh 重试，达上限后放弃 */
const MAX_PROFILE_ATTEMPTS = 3

/**
 * 会话业务域（4.x）。
 *
 * 与 5.x 的关键差异（主计划 8.2 / 九、映射表）：
 * - 会话列表：原生游标分页 `getServerConversations({pageSize: 1-50, cursor})`
 *   （置顶会话不在其内，需 `getServerPinnedConversations` 合并）；
 *   ⚠️ 不使用旧 REST `getConversationlist`（pageNum 分页、上限 20、无游标）。
 * - 清未读：无专用 API，统一发 channel 回执消息隐式清（channel 必须带 mid）；
 *   read 回执仅用于通知发送方消息已读，不会清本会话未读数。
 * - 免打扰：`setSilentModeForConversation` / `clearRemindTypeForConversation`；
 *   列表回读用 `getSilentModeForConversations` 批量查询。
 * - 无会话列表更新事件（无 onConversationListUpdate 等价物），
 *   列表变化由 refresh/loadMore 主动 setList + 多端事件（conversation-events）回填。
 */
export class ConversationDomain {
  /** 各会话最近一次发送 channel ack 的时间戳（节流用） */
  private channelAckSentAt = new Map<string, number>()
  /** 普通会话分页游标（'' 表示尚未拉取或已是最后一页） */
  private cursor = ''
  /** 是否还有更多普通会话可加载 */
  private hasMoreInner = true
  /** refresh 时透传的 includeEmptyConversations，loadMore 需沿用同一口径 */
  private includeEmpty = false
  /** loadMore 并发守卫 */
  private loadingMore = false
  /** 每会话最后一条消息 ID（从会话 lastMessage 推导，markRead 构造回执用） */
  private lastMessageIds = new Map<string, string>()
  /** 已成功补全（或重试达上限放弃）的会话 ID，不再重复请求（对齐 websdk5 fetchedGroupNameIds 语义） */
  private profileRequestedIds = new Set<string>()
  /** 正在请求资料补全的会话 ID（并发去重） */
  private profileInflightIds = new Set<string>()
  /** 各会话资料补全的失败/空名次数（配合 MAX_PROFILE_ATTEMPTS 封顶重试） */
  private profileAttemptCounts = new Map<string, number>()
  /**
   * 显式删除的会话 ID（remove/removeLocal 记账）：
   * merge 并集保留本地独有会话时跳过，防止已删会话被回填复活；
   * 服务端快照再次带回该会话时以服务端为准并清除标记。
   */
  private removedConversationIds = new Set<string>()

  constructor(
    private client: Webim4Client,
    private store: ConversationStoreLike,
    private deps: ConversationDomainDeps = {},
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4ConversationDomain] connection 尚未初始化')
    return conn
  }

  private get currentUserId() {
    return this.client.currentUserId || ''
  }

  /** 是否还有更多会话可加载（供 UI「加载更多」入口显隐） */
  get hasMore(): boolean {
    return this.hasMoreInner
  }

  /** 进入某个会话：4.x 无 setCurrentConversation 等价 API，仅记录 store 并补发未读回执 */
  enter(conversationId: string, conversationType: ConversationTypeValue) {
    this.store.setCurrentConversationId(conversationId)
    this.deps.sendPendingReadReceipts?.(conversationId, conversationType)
  }

  /** 离开当前会话 */
  leave() {
    this.store.setCurrentConversationId(null)
  }

  /**
   * 从本地缓存读取会话列表。
   * 4.x 默认无本地会话缓存（localCache 为可选 miniCore 能力，主链路不依赖），
   * 返回 store 当前快照；真实数据由 refresh/loadMore 从服务端拉取。
   */
  syncLocal(): UiConversation[] {
    return this.store.conversationList ?? []
  }

  /**
   * 主动刷新服务端会话列表（重置游标，拉取首页 + 全量置顶会话后回填 store）。
   * 4.x 无会话列表更新事件，刷新结果在此直接 setList。
   * 数据入口接管（Phase 3.1）：注入 fetchConversations 时改走注入实现
   * （游标翻页至 hasMore=false 合并全量，不触 SDK），写 store/排序/资料补全语义
   * 与默认路径对齐（对齐 websdk5 委托语义）。
   */
  async refresh(includeEmpty = false) {
    const fetchConversations = this.deps.conversationRepository?.fetchConversations
    if (fetchConversations) {
      this.includeEmpty = includeEmpty
      this.store.setSyncing(true)
      try {
        const items: UiConversation[] = []
        let cursor: string | undefined
        do {
          const page = await fetchConversations(cursor, CONVERSATION_PAGE_SIZE)
          items.push(...page.list)
          cursor = page.hasMore ? page.cursor : undefined
        } while (cursor)
        // 去重 + 并集合并现有列表（继承已补全名称/头像与本地字段）→ 稳定排序 → setList
        const list = this.mergeIncomingConversations(items, 'replace')
        this.store.setList(list)
        // 注入源一次性返回全量，SDK 分页游标状态复位（loadMore 不再追加）
        this.cursor = ''
        this.hasMoreInner = false
        this.store.setConversationsLoaded?.(true)
        conversationLogger.info('会话列表回填（注入 repository）', { count: list.length })
        // 旁路持久化：会话快照整体落库（与 SDK 默认路径同语义）
        this.persistConversations(list)
        // 资料/免打扰补全语义与默认路径对齐：注入项已带名称/头像时自动跳过
        void this.patchConversationProfiles(list)
        void this.patchMuteStates(list)
      }
      finally {
        this.store.setSyncing(false)
      }
      return
    }
    this.includeEmpty = includeEmpty
    this.store.setSyncing(true)
    try {
      const pinnedItems = await this.fetchAllPinnedConversations()
      // 4.x getServerConversations 返回全部会话（含置顶），提前按 ID 去重；置顶版本优先
      const pinnedById = new Map(pinnedItems.map(c => [c.conversationId, c]))
      const res = await this.connection.getServerConversations({
        pageSize: CONVERSATION_PAGE_SIZE,
        cursor: '',
        includeEmptyConversations: includeEmpty,
      })
      const data = res.data
      this.cursor = data?.cursor || ''
      this.hasMoreInner = !!this.cursor
      const regularItems = (data?.conversations || []).filter(c => !pinnedById.has(c.conversationId))
      this.applyServerItems([...pinnedItems, ...regularItems], 'replace')
      // 4.x 无 onSyncDataFinished 对等事件，首次刷新成功后置位（幂等，重复调用无副作用）
      this.store.setConversationsLoaded?.(true)
    }
    finally {
      this.store.setSyncing(false)
    }
  }

  /** 加载更多会话：按内部游标追加一页（无更多或加载中时短路） */
  async loadMore(pageSize = 20) {
    if (!this.hasMoreInner || this.loadingMore)
      return
    this.loadingMore = true
    try {
      const res = await this.connection.getServerConversations({
        // pageSize 取值范围 1-50，越界钳制
        pageSize: Math.min(Math.max(pageSize, 1), CONVERSATION_PAGE_SIZE),
        cursor: this.cursor,
        includeEmptyConversations: this.includeEmpty,
      })
      const data = res.data
      this.cursor = data?.cursor || ''
      this.hasMoreInner = !!this.cursor
      this.applyServerItems(data?.conversations || [], 'append')
    }
    finally {
      this.loadingMore = false
    }
  }

  /** 置顶/取消置顶会话 */
  async pin(conversationId: string, conversationType: ConversationTypeValue, pinned: boolean) {
    const res = await this.connection.pinConversation({
      conversationId,
      conversationType,
      isPinned: pinned,
    })
    // 4.x 本端无置顶变更事件（onMultiDeviceEvent 仅其他设备收到），成功后立即本地回写
    this.store.update(conversationId, {
      isPinned: pinned,
      pinnedTime: res.data?.pinnedTime || (pinned ? Date.now() : 0),
    })
  }

  /**
   * 设置/取消会话免打扰（对齐 websdk5 setMuted 语义）：
   * - 免打扰：setSilentModeForConversation，remindType=NONE（不提醒）；
   * - 取消：clearRemindTypeForConversation 恢复默认提醒（4.x 无 DEFAULT 常量，回写 'ALL'）。
   * 成功后立即更新本地 store（多端事件仅其他设备收到，本端需自行回写）。
   */
  async setMuted(conversationId: string, conversationType: ConversationTypeValue, muted: boolean) {
    const type = conversationType as EasemobChat.CONVERSATIONTYPE
    if (muted) {
      await this.connection.setSilentModeForConversation({
        conversationId,
        type,
        options: { paramType: 0, remindType: 'NONE' as EasemobChat.SILENTMODETYPE },
      })
    }
    else {
      await this.connection.clearRemindTypeForConversation({ conversationId, type })
    }
    this.store.update(conversationId, {
      isMuted: muted,
      remindType: muted ? 'NONE' : 'ALL',
    })
  }

  /**
   * 清空会话未读数。
   * 4.x 无清未读专用 API（源码已核），统一发 `type:'channel'` 回执消息隐式清未读
   *（主计划 8.2）：单聊/群聊均走 channel ack，`mid` 携带最后一条已读消息 ID。
   * `read` 回执仅用于告知发送方“某条消息已读”，不会清本会话未读数。
   * 「每会话最后一条消息 ID」由内部映射 + 注入的 getLastMessageId 推导，接口不暴露。
   */
  async markRead(conversationId: string, conversationType: ConversationTypeValue) {
    const lastMsgId = this.deps.getLastMessageId?.(conversationId, conversationType)
      ?? this.lastMessageIds.get(conversationId)
    conversationLogger.info('markRead 入参', {
      conversationId,
      conversationType,
      lastMsgId,
      lastMsgIdSource: this.deps.getLastMessageId?.(conversationId, conversationType) ? 'injected' : 'internal',
    })
    if (!lastMsgId) {
      conversationLogger.warn('markRead 跳过：无法推导会话最后一条消息 ID', { conversationId })
      return
    }
    try {
      const body = WebIM.message.create({
        type: 'channel',
        mid: lastMsgId,
        to: conversationId,
        chatType: conversationType === CONVERSATION_TYPE.GROUPCHAT ? 'groupChat' : 'singleChat',
      }) as EasemobChat.ChannelMsgBody
      conversationLogger.info('markRead 发送 channel 回执清未读', { conversationId, conversationType, lastMsgId, body })
      await this.connection.send(body)
    }
    catch (err) {
      conversationLogger.error('markRead 发送 channel 回执失败', { conversationId, conversationType, lastMsgId, err })
      throw err
    }
    // 4.x 清未读后无事件回推本端，立即本地清零
    this.store.update(conversationId, { unreadCount: 0 })
  }

  /**
   * 发送 channel ack（对齐 websdk5 的守卫与节流语义）：
   * 未读数为 0 时不发；同一会话 1s 节流窗口内不重复发送。
   * 4.x 无独立 channel ack API，归一到 markRead（单聊/群聊均发 channel 回执消息清未读）。
   */
  async sendChannelAck(conversationId: string, conversationType: ConversationTypeValue) {
    // 未读数为 0 时无需发送（store 未暴露会话列表时退化为不守卫）
    const unread = this.store.conversationList?.find(c => c.id === conversationId)?.unreadCount
    conversationLogger.info('sendChannelAck 入参', { conversationId, conversationType, unread })
    if (unread !== undefined && unread <= 0) {
      conversationLogger.info('sendChannelAck 跳过：未读数为 0', { conversationId })
      return
    }
    const now = Date.now()
    const last = this.channelAckSentAt.get(conversationId) || 0
    if (now - last < CHANNEL_ACK_THROTTLE_MS) {
      conversationLogger.info('sendChannelAck 跳过：1s 节流窗口内', { conversationId, elapsed: now - last })
      return
    }
    this.channelAckSentAt.set(conversationId, now)
    await this.markRead(conversationId, conversationType)
  }

  /**
   * 清空聊天记录（只清消息，不删除会话）。
   * - deleteRoamingMessages=true：removeHistoryMessages 删除当前时间之前的服务端漫游消息
   *   （注意 4.x 参数名为 `beforeTimeStamp`，与 5.x `beforeTimestamp` 大小写不同）；
   * - deleteRoamingMessages=false：仅由调用方清理本地消息缓存。
   */
  async clearChatHistory(
    conversationId: string,
    conversationType: ConversationTypeValue,
    deleteRoamingMessages = false,
  ) {
    if (deleteRoamingMessages) {
      await this.connection.removeHistoryMessages({
        targetId: conversationId,
        chatType: conversationType,
        beforeTimeStamp: Date.now(),
      })
    }
  }

  /** 删除会话（默认同时删除服务端漫游消息），成功后移除本地会话 */
  async remove(
    conversationId: string,
    conversationType: ConversationTypeValue,
    deleteRoamingMessages = true,
  ) {
    await this.connection.deleteConversation({
      channel: conversationId,
      chatType: conversationType,
      deleteRoam: deleteRoamingMessages,
    })
    this.store.delete(conversationId)
    this.lastMessageIds.delete(conversationId)
    // 记账显式删除：后续回填的并集合并不再复活该会话（服务端快照带回时以服务端为准）
    this.removedConversationIds.add(conversationId)
  }

  /** 删除会话但保留漫游消息（deleteRoam=false） */
  async removeLocal(conversationId: string, conversationType: ConversationTypeValue) {
    await this.connection.deleteConversation({
      channel: conversationId,
      chatType: conversationType,
      deleteRoam: false,
    })
    this.store.delete(conversationId)
    this.lastMessageIds.delete(conversationId)
    this.removedConversationIds.add(conversationId)
  }

  /** 添加会话标记（mark 取值 0-19，对应 4.x MarkType.mark_0 ~ mark_19） */
  async addMark(
    conversations: Array<{ conversationId: string, conversationType: ConversationTypeValue }>,
    mark: number,
  ) {
    await this.connection.addConversationMark({
      conversations,
      mark: mark as EasemobChat.MarkType,
    })
    // 本端无标记变更事件，成功后本地合并回写
    for (const { conversationId } of conversations) {
      const existing = this.store.conversationList?.find(c => c.id === conversationId)
      if (existing && !existing.marks.includes(mark)) {
        this.store.update(conversationId, { marks: [...existing.marks, mark] })
      }
    }
  }

  /** 移除会话标记 */
  async removeMark(
    conversations: Array<{ conversationId: string, conversationType: ConversationTypeValue }>,
    mark: number,
  ) {
    await this.connection.removeConversationMark({
      conversations,
      mark: mark as EasemobChat.MarkType,
    })
    for (const { conversationId } of conversations) {
      const existing = this.store.conversationList?.find(c => c.id === conversationId)
      if (existing && existing.marks.includes(mark)) {
        this.store.update(conversationId, { marks: existing.marks.filter(m => m !== mark) })
      }
    }
  }

  /**
   * 供消息链路在收发消息后回填会话最后一条消息 ID
   * （markRead 的 read/channel 回执参数推导源之一，非契约接口）。
   */
  noteLastMessageId(conversationId: string, messageId: string) {
    if (messageId)
      this.lastMessageIds.set(conversationId, messageId)
  }

  /** 拉取全量置顶会话（游标翻页至无 cursor；置顶会话通常很少，一页 50 即可覆盖） */
  private async fetchAllPinnedConversations(): Promise<EasemobChat.ConversationItem[]> {
    const items: EasemobChat.ConversationItem[] = []
    let cursor = ''
    do {
      const res = await this.connection.getServerPinnedConversations({
        pageSize: CONVERSATION_PAGE_SIZE,
        cursor,
        includeEmptyConversations: this.includeEmpty,
      })
      items.push(...(res.data?.conversations || []))
      cursor = res.data?.cursor || ''
    } while (cursor)
    return items
  }

  /**
   * 应用一批服务端会话项：记录最后一条消息 ID → 映射中立类型 →
   * 并集合并（mergeIncomingConversations）→ 稳定排序 → setList，
   * 随后旁路持久化快照 + 异步补全资料与免打扰状态。
   */
  private applyServerItems(
    items: readonly EasemobChat.ConversationItem[],
    mode: 'replace' | 'append',
  ) {
    for (const item of items) {
      const lastMsgId = extractLastMessageId(item)
      if (lastMsgId)
        this.lastMessageIds.set(item.conversationId, lastMsgId)
    }
    const incoming = toUiConversations(items, {
      currentUserId: this.currentUserId,
      resolveSenderName: this.deps.resolveSenderName,
    })
    const list = this.mergeIncomingConversations(incoming, mode)
    this.store.setList(list)
    conversationLogger.info('会话列表回填', { mode, count: list.length, hasMore: this.hasMoreInner })
    // 旁路持久化：会话快照整体落库（含并集保留的本地独有会话）
    this.persistConversations(list)
    void this.patchConversationProfiles(list)
    void this.patchMuteStates(list)
  }

  /**
   * 合并回填会话项与现有列表（对齐 websdk5 mergeWithExistingConversations 升级版语义）：
   * - **并集**：replace 模式下本地独有会话（如收消息浮现、服务端尚未带回）保留，
   *   不再被服务端快照整体覆盖冲掉；
   * - **本地字段保留**：共有项继承已补全的名称/头像（避免冲回 ID），
   *   以及 draft/draftTime/remindType 等本地维护字段；
   * - **显式 removed 不保留**：remove/removeLocal 记账的会话不并入；
   *   服务端快照再次带回时以服务端为准并清除删除标记。
   */
  private mergeIncomingConversations(
    incoming: readonly UiConversation[],
    mode: 'replace' | 'append',
  ): UiConversation[] {
    const existing = this.store.conversationList ?? []
    const prevById = new Map(existing.map(cvs => [cvs.id, cvs]))
    const merged = new Map<string, UiConversation>()
    if (mode === 'append') {
      for (const cvs of existing)
        merged.set(cvs.id, cvs)
    }
    for (const item of incoming) {
      // 服务端/注入源快照带回该会话：以服务端为准，清除显式删除标记
      this.removedConversationIds.delete(item.id)
      const prev = prevById.get(item.id)
      merged.set(item.id, prev
        ? {
          ...item,
          name: (!item.name || item.name === item.id) && prev.name && prev.name !== prev.id ? prev.name : item.name,
          avatar: item.avatar || prev.avatar,
          // 本地字段保留：草稿与提醒类型以本地为准（回填项不携带）
          ...(prev.draft !== undefined ? { draft: prev.draft } : {}),
          ...(prev.draftTime !== undefined ? { draftTime: prev.draftTime } : {}),
          // 免打扰状态以本地为准：回填项恒 isMuted=false 不携带（见 conversation-adapter），
          // 由 setMuted 回写与 patchMuteStates(getSilentModeForConversations) 权威维护
          isMuted: prev.isMuted,
          ...(prev.remindType !== undefined ? { remindType: prev.remindType } : {}),
        }
        : item)
    }
    if (mode === 'replace') {
      // 并集：本地独有会话保留（显式删除的除外）
      for (const cvs of existing) {
        if (!merged.has(cvs.id) && !this.removedConversationIds.has(cvs.id))
          merged.set(cvs.id, cvs)
      }
    }
    return sortConversations(Array.from(merged.values()))
  }

  /** 旁路持久化：会话列表快照整体落库（fire-and-forget，未注入零调用） */
  private persistConversations(list: readonly UiConversation[]): void {
    firePersistenceHook(
      conversationLogger,
      'saveConversations',
      this.deps.conversationPersistence?.saveConversations,
      list.map(toConversationRecord),
    )
  }

  /**
   * 批量补全会话名称/头像（主计划 2.8「补全的批量 + 缓存」）：
   * 每页会话统一收集缺失项 → 去重（已成功/已达上限不再请求、并发中不重复）→
   * 一次注入调用批量解析 → 逐项回写 store。
   * 只有成功拿到名称才永久标记；失败/空名计入尝试次数，允许后续 refresh 重试，
   * 达 MAX_PROFILE_ATTEMPTS 后放弃（防无效群/无昵称用户每次刷新都打请求）。
   */
  private async patchConversationProfiles(list: readonly UiConversation[]) {
    const fetchProfiles = this.deps.fetchConversationProfiles
    if (!fetchProfiles)
      return
    const targets: ConversationProfileTarget[] = []
    for (const cvs of list) {
      const missing = !cvs.name || cvs.name === cvs.id || !cvs.avatar
      if (!missing || this.profileRequestedIds.has(cvs.id) || this.profileInflightIds.has(cvs.id))
        continue
      targets.push({ id: cvs.id, type: cvs.type })
    }
    if (targets.length === 0)
      return
    for (const target of targets)
      this.profileInflightIds.add(target.id)
    try {
      const profiles = await fetchProfiles(targets)
      const profileById = new Map(profiles.map(profile => [profile.id, profile]))
      for (const target of targets) {
        const profile = profileById.get(target.id)
        if (profile?.name) {
          // 成功补全：永久标记，不再重复请求
          this.profileRequestedIds.add(target.id)
          const patch: Partial<UiConversation> = { name: profile.name }
          if (profile.avatar)
            patch.avatar = profile.avatar
          this.store.update(profile.id, patch)
        }
        else {
          if (profile?.avatar)
            this.store.update(profile.id, { avatar: profile.avatar })
          this.noteProfileMiss(target.id)
        }
      }
    }
    catch (err) {
      conversationLogger.warn('会话资料补全失败:', err)
      for (const target of targets)
        this.noteProfileMiss(target.id)
    }
    finally {
      for (const target of targets)
        this.profileInflightIds.delete(target.id)
    }
  }

  /** 记录一次补全失败/空名：达到上限后永久放弃（写入 requested 集合） */
  private noteProfileMiss(id: string) {
    const attempts = (this.profileAttemptCounts.get(id) ?? 0) + 1
    this.profileAttemptCounts.set(id, attempts)
    if (attempts >= MAX_PROFILE_ATTEMPTS) {
      this.profileRequestedIds.add(id)
      conversationLogger.warn('会话资料补全达到重试上限，放弃补全', { id, attempts })
    }
  }

  /**
   * 批量回写会话免打扰状态。
   * 4.x 会话项不携带免打扰字段，需 getSilentModeForConversations 批量查询
   * （对齐 websdk5 patchConversationMuteStates，20 条/批）。
   * 无自定义设置的会话不在返回 map 中，视为默认提醒（isMuted=false）。
   */
  private async patchMuteStates(list: readonly UiConversation[]) {
    if (list.length === 0)
      return
    for (let i = 0; i < list.length; i += MUTE_QUERY_BATCH_SIZE) {
      const batch = list.slice(i, i + MUTE_QUERY_BATCH_SIZE)
      try {
        const res = await this.connection.getSilentModeForConversations({
          conversationList: batch.map(c => ({ id: c.id, type: c.type })),
        })
        const data = res.data
        if (!data)
          continue
        for (const cvs of batch) {
          const entry = cvs.type === CONVERSATION_TYPE.GROUPCHAT
            ? data.group?.[cvs.id]
            : data.user?.[cvs.id]
          // remindType=NONE 或未过期的时长型免打扰（ignoreDuration 为 Unix 时间戳）均视为免打扰中
          const muted = !!entry && (
            entry.type === 'NONE'
            || (typeof entry.ignoreDuration === 'number' && entry.ignoreDuration > Date.now())
          )
          const existing = this.store.conversationList?.find(c => c.id === cvs.id)
          if (existing && existing.isMuted !== muted) {
            this.store.update(cvs.id, {
              isMuted: muted,
              remindType: entry?.type ?? (muted ? 'NONE' : 'ALL'),
            })
          }
        }
      }
      catch (err) {
        conversationLogger.warn('批量查询会话免打扰状态失败:', err)
      }
    }
  }
}
