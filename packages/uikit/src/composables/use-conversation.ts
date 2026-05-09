import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'
import { createUIKitStorageKey, getStorageBackend, type UIKitStorageType } from './use-uikit-storage'
import type { Conversation } from '../store/conversation'

/** 将服务端会话数据转换为 UIKIT Conversation 格式 */
function mapServerConversation(item: any): Conversation {
  const lastMsg = item.lastMessage || {}
  return {
    id: item.conversationId,
    name: item.conversationId,
    lastMessage: lastMsg.msg || lastMsg.type || '',
    lastMessageType: lastMsg.type || '',
    lastMessageSender: lastMsg.from || '',
    lastMessageTime: lastMsg.time || item.lastMessage?.time || 0,
    unreadCount: item.unReadCount || 0,
    type: item.conversationType,
    isPinned: item.isPinned || false,
    pinnedTime: item.pinnedTime || 0,
    isMuted: item.isMuted || false,
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

  /** 从服务端获取会话列表 */
  async function fetchServerConversations(options?: {
    pageSize?: number
    cursor?: string
    includeEmptyConversations?: boolean
    append?: boolean
  }) {
    const res = await client.value?.getServerConversations(options)
    const list: any[] = res?.data?.conversations || []
    const mapped = list.map(mapServerConversation)

    if (options?.append) {
      mapped.forEach((cvs) => conversationStore.addConversation(cvs))
    } else {
      conversationStore.setConversationList(mapped)
    }

    conversationStore.setConversationCursor(res?.data?.cursor || null)
    return res
  }

  /** 加载更多会话 */
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

    await client.value?.pinConversation({
      conversationId: id,
      conversationType: cvs.type,
      isPinned,
    })
    conversationStore.togglePin(id, isPinned)
  }

  /** 发送会话已读回执（仅单聊且存在未读消息时发送，群聊和不带未读的会话自动跳过） */
  async function sendChannelAck(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return
    // 未读数为 0 时无需发送，避免无效请求
    if (!cvs.unreadCount || cvs.unreadCount <= 0) {
      conversationStore.updateUnreadCount(id, 0)
      return
    }
    await client.value?.sendChannelAck({ chatType: cvs.type, to: id })
    conversationStore.updateUnreadCount(id, 0)
  }

  /** 删除会话（服务端+本地） */
  async function deleteConversation(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return

    await client.value?.deleteConversation({
      channel: id,
      chatType: cvs.type,
      deleteRoam: true,
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
