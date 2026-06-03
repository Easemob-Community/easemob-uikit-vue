import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { createUIKitStorageKey, getStorageBackend, type UIKitStorageType } from './use-uikit-storage'
import type { Conversation } from '../store/conversation'
import type { ChatManager } from 'im-sdk-web'

/**
 * SDK ConversationPage 类型提取（未从 im-sdk-web 主入口导出）。
 */
type SdkConversationPage = Awaited<ReturnType<ChatManager['getConversationList']>>

/**
 * 将本地 SessionItem（WebSocket 同步数据）转换为 UIKIT Conversation 格式。
 * SDK 5.x 优先使用 getSessionList() 获取会话数据，字段更丰富。
 */
export function mapSessionItem(item: unknown): Conversation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = item as any
  const lastMsg = s.lastMessage
  const lastMsgBody = lastMsg?.body || {}
  return {
    id: s.sessionId,
    name: s.display?.displayName || s.sessionId,
    avatar: s.display?.avatarUrl,
    lastMessage: lastMsgBody.content || lastMsgBody.msg || lastMsg?.type || '',
    lastMessageType: lastMsg?.type || '',
    lastMessageSender: lastMsg?.from || '',
    lastMessageTime: s.lastMessageAt || lastMsg?.timestamp || 0,
    unreadCount: s.unreadCount || 0,
    type: s.type as Conversation['type'],
    isPinned: s.isPinned || false,
    pinnedTime: s.pinnedTime || 0,
    isMuted: s.remindType === 'none',
    displayName: s.display?.displayName,
    avatarUrl: s.display?.avatarUrl,
    remindType: s.remindType,
    marks: [...(s.marks || [])] as number[],
    readReceipt: s.readReceipt || 0,
  }
}

/**
 * 将 REST 分页会话数据（ConversationItem）转换为 UIKIT Conversation 格式。
 * 仅用于 loadMore 等分页场景。
 *
 * @see SDK_DEFICIENCY: ConversationItem 未暴露 isMuted、remindType、display（displayName/avatarUrl）字段，
 * 这些字段仅在 SessionItem 中可用（通过 getSessionList）。
 */
function mapConversationItem(item: SdkConversationPage['items'][number]): Conversation {
  const lastMsg = item.lastMessage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (lastMsg?.body || {}) as Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemAny = item as any
  return {
    id: item.conversationId,
    name: item.conversationId || itemAny.display?.displayName || '',
    avatar: itemAny.display?.avatarUrl,
    lastMessage: body.content || body.msg || lastMsg?.type || '',
    lastMessageType: lastMsg?.type || '',
    lastMessageSender: (lastMsg as any)?.from || '',
    lastMessageTime: lastMsg?.timestamp || 0,
    unreadCount: item.unreadCount || 0,
    type: item.conversationType as Conversation['type'],
    isPinned: item.isPinned || false,
    pinnedTime: item.pinnedTime || 0,
    isMuted: itemAny.isMuted || false,
    displayName: itemAny.display?.displayName,
    avatarUrl: itemAny.display?.avatarUrl,
    remindType: itemAny.remindType,
    marks: [...item.marks] as number[],
    readReceipt: itemAny.readReceipt || 0,
  }
}

/** 草稿存储配置 */
let draftStorageType: UIKitStorageType | 'none' = 'none'

/** 草稿缓存（内存级，始终存在），key 与外部存储完全一致 */
const draftCache = new Map<string, { text: string; time: number }>()

/**
 * 初始化草稿存储模式
 * - 'none': 仅内存缓存（默认）
 * - 'session': sessionStorage 持久化
 * - 'local': localStorage 持久化
 */
export function initDraftStorage(type: UIKitStorageType | 'none') {
  draftStorageType = type
}

/**
 * 清除所有草稿缓存（用于登出时调用）
 */
export function clearAllDrafts() {
  draftCache.clear()
}

export function useConversation() {
  const { client, stores } = useUIKit()
  const conversationStore = stores.conversation

  const conversationList = computed(() => conversationStore.sortedConversationList)
  const currentConversation = computed(() => conversationStore.currentConversation)
  const hasMore = computed(() => conversationStore.hasMoreConversations)
  const loadingMore = ref(false)

  function selectConversation(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (cvs) {
      conversationStore.setCurrentConversation(cvs)
    }
  }

  /**
   * 从服务端获取会话列表
   *
   * 默认仅在未拉取过会话时才向远端发起请求（首屏 / 刷新页面）：
   * - 如果 store 中 `conversationsLoaded === true`，会直接跳过远端调用，
   *   仅依赖本地 store 渲染，避免容器多次 mount/unmount 造成重复拉取。
   * - 传入 `force: true` 可强制拉取（下拉刷新 / 业务主动刷新场景）。
   * - `append: true` 在加载更多场景使用，不受该短路逻辑影响。
   */
  /**
   * 获取会话列表（SDK 5.x WebSocket 驱动）。
   *
   * 策略：
   * - 首次加载：优先调用 getSessionList() 读取 WebSocket 同步的本地内存数据。
   *   如果本地无数据（同步尚未完成），fallback 到 REST getConversationList。
   * - 加载更多（append）：走 REST getConversationList 分页。
   * - force 刷新：触发 refreshSessionList() 强制服务端重新同步，
   *   同步完成后由 onConversationListSyncDidFinish 事件自动填充 store。
   */
  async function fetchServerConversations(options?: {
    pageSize?: number
    cursor?: string
    includeEmptyConversations?: boolean
    append?: boolean
    /** 强制拉取，忽略本地已加载标志。仅对非 append 场景生效 */
    force?: boolean
  }) {
    const isLoadMore = !!options?.append
    const isForceRefresh = !!options?.force
    console.log('[useConversation] fetchServerConversations called', {
      isLoadMore,
      isForceRefresh,
      conversationsLoaded: conversationStore.conversationsLoaded,
      clientExists: !!client.value,
    })

    // ===== 加载更多：走 REST 分页 =====
    if (isLoadMore) {
      console.log('[useConversation] loadMore mode -> REST getConversationList')
      const res = await client.value?.conversation.getServerConversations(options)
      const page = res as SdkConversationPage
      const list = page?.items || []
      const mapped: Conversation[] = list.map(mapConversationItem)
      mapped.forEach((cvs) => conversationStore.addConversation(cvs))
      conversationStore.setConversationCursor(page?.cursor || null)
      return page
    }

    // ===== 强制刷新：触发 WebSocket 重新同步 =====
    if (isForceRefresh) {
      console.log('[useConversation] force refresh -> calling refreshSessionList')
      await client.value?.conversation.refreshSessionList({
        needEmptySession: options?.includeEmptyConversations ?? false,
      })
      // refreshSessionList 会触发 onConversationListSyncDidStart/Finish，
      // 在 Finish 回调中会调用 getSessionList 填充 store，此处无需额外处理。
      return null
    }

    // ===== 首次加载：优先读本地 SessionList =====
    if (!isLoadMore && !isForceRefresh && conversationStore.conversationsLoaded) {
      console.log('[useConversation] skipped: conversationsLoaded is true')
      return null
    }

    console.log('[useConversation] first load -> try getSessionList')
    const sessionList = client.value?.conversation.getSessionList()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = sessionList as any[]
    if (sessions && sessions.length > 0) {
      console.log('[useConversation] getSessionList hit', { count: sessions.length })
      const mapped = sessions.map(mapSessionItem)
      conversationStore.setConversationList(mapped)
      conversationStore.setConversationsLoaded(true)
      // SessionList 不支持分页游标，标记为无更多
      conversationStore.setConversationCursor(null)
      return { items: sessions, cursor: '', hasMore: false }
    }

    // ===== Fallback：本地无数据，走 REST =====
    console.log('[useConversation] getSessionList empty -> fallback to REST')
    const res = await client.value?.conversation.getServerConversations(options)
    const page = res as SdkConversationPage
    const list = page?.items || []
    const mapped: Conversation[] = list.map(mapConversationItem)
    conversationStore.setConversationList(mapped)
    conversationStore.setConversationsLoaded(true)
    conversationStore.setConversationCursor(page?.cursor || null)
    return page
  }

  /**
   * 强制刷新会话列表。
   * 触发 WebSocket 重新同步，同步完成后由事件回调自动更新 store。
   */
  async function refreshConversations(options?: {
    pageSize?: number
    includeEmptyConversations?: boolean
  }) {
    return fetchServerConversations({ ...options, force: true })
  }

  /** 加载更多会话（REST 分页） */
  async function loadMoreConversations(pageSize?: number) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      await fetchServerConversations({
        pageSize,
        cursor: conversationStore.conversationCursor || undefined,
        append: true,
      })
    } finally {
      loadingMore.value = false
    }
  }

  /** 置顶/取消置顶会话 */
  async function pinConversation(id: string, isPinned: boolean) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return

    await client.value?.conversation.setConversationPinned({
      conversationId: id,
      conversationType: cvs.type,
      pinned: isPinned,
    })
    conversationStore.togglePin(id, isPinned)
  }

  /** 发送会话已读回执（单聊/群聊均支持，未读数为 0 时跳过以避免无效请求） */
  async function sendChannelAck(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return
    // 未读数为 0 时无需发送，避免无效请求
    if (!cvs.unreadCount || cvs.unreadCount <= 0) {
      conversationStore.updateUnreadCount(id, 0)
      return
    }
    await client.value?.conversation.markConversationRead({ conversationId: id, conversationType: cvs.type })
    conversationStore.updateUnreadCount(id, 0)
  }

  /** 删除会话（服务端+本地） */
  async function deleteConversation(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return

    await client.value?.conversation.deleteConversation({
      conversationId: id,
      conversationType: cvs.type,
      deleteRoamingMessages: true,
    })
    conversationStore.deleteConversation(id)
  }

  /** 本地删除会话 */
  function removeConversation(id: string) {
    conversationStore.deleteConversation(id)
  }

  /** 本地添加/更新单个会话 */
  function addLocalConversation(cvs: Conversation) {
    conversationStore.addConversation(cvs)
  }

  /** 本地批量设置会话列表 */
  function setLocalConversationList(list: Conversation[]) {
    conversationStore.setConversationList(list)
  }

  /** 本地更新会话字段 */
  function updateLocalConversation(id: string, patch: Partial<Conversation>) {
    conversationStore.updateConversation(id, patch)
  }

  /** ===== 草稿管理 ===== */

  /**
   * 生成草稿缓存/存储的统一 key
   * 格式与 useUIKitStorage 完全一致：easemob_uikit_{hash(appKey_userId)}_draft_{conversationId}
   * 确保不同 appKey / 不同用户 的草稿天然隔离
   */
  function getDraftKey(conversationId: string): string {
    return createUIKitStorageKey(
      stores.client.appKey,
      stores.client.currentUser,
      `draft_${conversationId}`
    )
  }

  /**
   * 保存草稿
   * @param conversationId 会话 ID
   * @param text 草稿文本
   */
  function saveDraft(conversationId: string, text: string) {
    if (!text) {
      clearDraft(conversationId)
      return
    }
    const key = getDraftKey(conversationId)
    const draftData = { text, time: Date.now() }
    draftCache.set(key, draftData)
    conversationStore.updateConversation(conversationId, {
      draft: text,
      draftTime: draftData.time,
    })
    // 持久化到外部存储
    if (draftStorageType !== 'none') {
      try {
        const storage = getStorageBackend(draftStorageType)
        storage.setItem(key, JSON.stringify(draftData))
      } catch {
        // storage 不可用时静默降级
      }
    }
  }

  /**
   * 加载草稿
   * @param conversationId 会话 ID
   * @returns 草稿文本，无草稿返回空字符串
   */
  function loadDraft(conversationId: string): string {
    const key = getDraftKey(conversationId)
    // 优先读内存缓存
    const cached = draftCache.get(key)
    if (cached) return cached.text
    // 尝试从外部存储恢复
    if (draftStorageType !== 'none') {
      try {
        const storage = getStorageBackend(draftStorageType)
        const raw = storage.getItem(key)
        if (raw) {
          const data = JSON.parse(raw) as { text: string; time: number }
          draftCache.set(key, data)
          conversationStore.updateConversation(conversationId, {
            draft: data.text,
            draftTime: data.time,
          })
          return data.text
        }
      } catch {
        // storage 不可用时静默降级
      }
    }
    return ''
  }

  /**
   * 清除草稿
   * @param conversationId 会话 ID
   */
  function clearDraft(conversationId: string) {
    const key = getDraftKey(conversationId)
    draftCache.delete(key)
    conversationStore.updateConversation(conversationId, {
      draft: '',
      draftTime: 0,
    })
    if (draftStorageType !== 'none') {
      try {
        const storage = getStorageBackend(draftStorageType)
        storage.removeItem(key)
      } catch {
        // storage 不可用时静默降级
      }
    }
  }

  return {
    conversationList,
    currentConversation,
    hasMore,
    loadingMore,
    selectConversation,
    fetchServerConversations,
    refreshConversations,
    loadMoreConversations,
    pinConversation,
    sendChannelAck,
    deleteConversation,
    removeConversation,
    addLocalConversation,
    setLocalConversationList,
    updateLocalConversation,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}
