import { computed, ref } from 'vue'
import type { UiConversation } from '../sdk/types'
import { useUIKit } from './use-uikit'
import { type UIKitStorageType, createUIKitStorageKey, getStorageBackend } from './use-uikit-storage'

/** 草稿存储模式 */
let draftStorageType: UIKitStorageType | 'none' = 'none'
const draftCache = new Map<string, { text: string, time: number }>()

/** 初始化草稿存储模式 */
export function initDraftStorage(type: UIKitStorageType | 'none') {
  draftStorageType = type
}

/** 清除所有草稿 */
export function clearAllDrafts() {
  draftCache.clear()
}

export function useConversation() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const clientStore = stores.client

  const conversationList = computed(() => conversationStore.sortedConversationList)
  const currentConversation = computed(() => conversationStore.currentConversation)
  const isSyncing = computed(() => conversationStore.isSyncingConversations)
  const hasMore = computed(() => conversationStore.hasMoreConversations)

  const loadingMore = ref(false)

  function getDraftKey(conversationId: string): string {
    return createUIKitStorageKey(
      clientStore.appKey,
      clientStore.currentUser,
      `draft_${conversationId}`,
    )
  }

  /** 保存草稿 */
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
    if (draftStorageType !== 'none') {
      try {
        getStorageBackend(draftStorageType).setItem(key, JSON.stringify(draftData))
      }
      catch {
        // ignore
      }
    }
  }

  /** 加载草稿 */
  function loadDraft(conversationId: string): string {
    const key = getDraftKey(conversationId)
    const cached = draftCache.get(key)
    if (cached)
      return cached.text
    if (draftStorageType !== 'none') {
      try {
        const raw = getStorageBackend(draftStorageType).getItem(key)
        if (raw) {
          const data = JSON.parse(raw) as { text: string, time: number }
          draftCache.set(key, data)
          conversationStore.updateConversation(conversationId, {
            draft: data.text,
            draftTime: data.time,
          })
          return data.text
        }
      }
      catch {
        // ignore
      }
    }
    return ''
  }

  /** 清除草稿 */
  function clearDraft(conversationId: string) {
    const key = getDraftKey(conversationId)
    draftCache.delete(key)
    conversationStore.updateConversation(conversationId, {
      draft: '',
      draftTime: 0,
    })
    if (draftStorageType !== 'none') {
      try {
        getStorageBackend(draftStorageType).removeItem(key)
      }
      catch {
        // ignore
      }
    }
  }

  /** 进入会话 */
  function selectConversation(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    domains.conversation.enter(id, cvs.type)
  }

  /** 离开当前会话 */
  function leaveConversation() {
    domains.conversation.leave()
  }

  /** 首屏同步：读本地缓存 */
  function syncLocalConversations(): UiConversation[] {
    return domains.conversation.syncLocal()
  }

  /** 下拉刷新：触发服务端同步 */
  async function refreshConversations(includeEmpty = false) {
    await domains.conversation.refresh(includeEmpty)
  }

  /** 加载更多会话 */
  async function loadMoreConversations(pageSize = 50) {
    if (loadingMore.value || !hasMore.value)
      return
    loadingMore.value = true
    try {
      await domains.conversation.loadMore(pageSize)
    }
    finally {
      loadingMore.value = false
    }
  }

  /** 置顶/取消置顶 */
  async function pinConversation(id: string, isPinned: boolean) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.pin(id, cvs.type, isPinned)
  }

  /** 标记会话已读 */
  async function markConversationRead(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.markRead(id, cvs.type)
  }

  /** 发送 channel ack */
  async function sendChannelAck(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.sendChannelAck(id, cvs.type)
  }

  /** 删除会话 */
  async function deleteConversation(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.remove(id, cvs.type)
  }

  /** 本地删除会话 */
  function removeConversation(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    domains.conversation.removeLocal(id, cvs.type)
  }

  return {
    conversationList,
    currentConversation,
    isSyncing,
    hasMore,
    loadingMore,
    selectConversation,
    leaveConversation,
    syncLocalConversations,
    refreshConversations,
    loadMoreConversations,
    pinConversation,
    markConversationRead,
    sendChannelAck,
    deleteConversation,
    removeConversation,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}
