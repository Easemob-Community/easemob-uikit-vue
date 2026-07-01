import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { createUIKitStorageKey, getStorageBackend, type UIKitStorageType } from './use-uikit-storage'
import type { Conversation } from '../store/conversation'
import type { ConversationItem } from 'easemob-websdk'

/**
 * 将本地 ConversationItem（SDK 同步数据）转换为 UIKIT Conversation 格式。
 */
export function mapSessionItem(item: ConversationItem): Conversation {
  const lastMsg = item.lastMessage
  const lastMsgBody = lastMsg?.body || {}
  return {
    id: item.conversationId,
    name: item.conversationName || item.conversationId,
    avatar: item.conversationAvatar,
    lastMessage: (lastMsgBody.content as string) || (lastMsgBody.msg as string) || lastMsg?.type || '',
    lastMessageType: lastMsg?.type || '',
    lastMessageSender: lastMsg?.from || '',
    lastMessageTime: item.lastMessageAt || lastMsg?.timestamp || 0,
    unreadCount: item.unreadCount || 0,
    type: item.conversationType as Conversation['type'],
    isPinned: item.isPinned || false,
    pinnedTime: item.pinnedTimestamp || 0,
    isMuted: item.remindType === 'NONE',
    displayName: item.conversationName,
    avatarUrl: item.conversationAvatar,
    remindType: item.remindType,
    marks: [...(item.marks || [])] as number[],
    readReceipt: item.readAt || 0,
  }
}

/**
 * 将 REST 分页会话数据（ConversationItem）转换为 UIKIT Conversation 格式。
 * 仅用于 loadMore 等分页场景。
 */
function mapConversationItem(item: ConversationItem): Conversation {
  return mapSessionItem(item)
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
      const list = await client.value?.conversation.getServerConversations(options)
      const mapped: Conversation[] = (list || []).map(mapConversationItem)
      mapped.forEach((cvs) => conversationStore.addConversation(cvs))
      // SDK5 getConversationList 当前返回完整数组，无 cursor 分页；需要时再接入
      conversationStore.setConversationCursor(null)
      return list
    }

    // ===== 强制刷新：触发 WebSocket 重新同步 =====
    if (isForceRefresh) {
      console.log('[useConversation] force refresh -> calling refreshSessionList')
      await client.value?.conversation.refreshSessionList({
        includeEmpty: options?.includeEmptyConversations ?? false,
      })
      // refreshSessionList 会触发 onConversationListUpdate，
      // 在事件回调中会调用 getConversationList 填充 store，此处无需额外处理。
      return null
    }

    // ===== 首次加载：优先读本地 SessionList =====
    if (!isLoadMore && !isForceRefresh && conversationStore.conversationsLoaded) {
      console.log('[useConversation] skipped: conversationsLoaded is true')
      return null
    }

    console.log('[useConversation] first load -> try getSessionList')
    const sessionList = client.value?.conversation.getSessionList()
    const sessions = sessionList || []
    if (sessions.length > 0) {
      console.log('[useConversation] getSessionList hit', { count: sessions.length })
      const mapped = sessions.map(mapSessionItem)
      conversationStore.setConversationList(mapped)
      conversationStore.setConversationsLoaded(true)
      // SessionList 不支持分页游标，标记为无更多
      conversationStore.setConversationCursor(null)
      return sessions
    }

    // ===== Fallback：本地无数据，走 REST =====
    console.log('[useConversation] getSessionList empty -> fallback to REST')
    const list = await client.value?.conversation.getServerConversations(options)
    const mapped: Conversation[] = (list || []).map(mapConversationItem)
    conversationStore.setConversationList(mapped)
    conversationStore.setConversationsLoaded(true)
    conversationStore.setConversationCursor(null)
    return list
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
    try {
      await client.value?.conversation.markConversationRead({ conversationId: id, conversationType: cvs.type })
      conversationStore.updateUnreadCount(id, 0)
      console.log('[sendChannelAck] markConversationRead success:', { conversationId: id, unreadCount: 0 })
    } catch (error) {
      console.warn('[sendChannelAck] markConversationRead failed:', { conversationId: id, error })
      // 调用失败时不更新本地未读数，避免"假已读"
    }
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
