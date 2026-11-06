import { computed, ref } from 'vue'
import { type UIKitStorageType, type UiConversation, createUIKitStorageKey, getStorageBackend } from '@easemob-community/uikit-core'
import type { MessageInputDraft, MessageInputDraftSnapshot } from '../modules/chat/message-input/input-draft'
import { cloneMessageInputDraftSnapshot, getDraftSnapshotPreviewUrls } from '../modules/chat/message-input/input-draft'
import { useUIKit } from './use-uikit'

interface DraftCacheEntry extends MessageInputDraft {
  time: number
}

interface PersistedDraft {
  text: string
  time: number
}

/** 草稿存储模式 */
let draftStorageType: UIKitStorageType | 'none' = 'none'
const draftCache = new Map<string, DraftCacheEntry>()

function cloneSnapshot(snapshot: MessageInputDraftSnapshot | undefined): MessageInputDraftSnapshot | undefined {
  return snapshot ? cloneMessageInputDraftSnapshot(snapshot) : undefined
}

function revokeDraftPreviewUrls(draft: MessageInputDraft | undefined): void {
  if (!draft?.snapshot)
    return
  for (const url of getDraftSnapshotPreviewUrls(draft.snapshot))
    URL.revokeObjectURL(url)
}

function revokeReplacedDraftPreviewUrls(previous: DraftCacheEntry | undefined, next: MessageInputDraft): void {
  if (!previous?.snapshot)
    return
  const retained = new Set(next.snapshot ? getDraftSnapshotPreviewUrls(next.snapshot) : [])
  for (const url of getDraftSnapshotPreviewUrls(previous.snapshot)) {
    if (!retained.has(url))
      URL.revokeObjectURL(url)
  }
}

export function isDraftPreviewUrlRetained(url: string): boolean {
  for (const draft of draftCache.values()) {
    if (draft.snapshot && getDraftSnapshotPreviewUrls(draft.snapshot).includes(url))
      return true
  }
  return false
}

/** 初始化草稿存储模式 */
export function initDraftStorage(type: UIKitStorageType | 'none') {
  draftStorageType = type
}

/** 清除所有草稿 */
export function clearAllDrafts() {
  for (const draft of draftCache.values())
    revokeDraftPreviewUrls(draft)
  draftCache.clear()
}

export function useConversation() {
  const { domains, stores, features } = useUIKit()
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

  function writeDraft(conversationId: string, draft: MessageInputDraft): void {
    if (features.enableDraft === false) {
      clearDraft(conversationId)
      return
    }
    const key = getDraftKey(conversationId)
    const previous = draftCache.get(key)
    const draftData: DraftCacheEntry = {
      ...draft,
      snapshot: cloneSnapshot(draft.snapshot),
      time: Date.now(),
    }
    revokeReplacedDraftPreviewUrls(previous, draftData)
    draftCache.set(key, draftData)
    conversationStore.updateConversation(conversationId, {
      draft: draft.preview,
      draftTime: draftData.time,
    })
    if (draftStorageType !== 'none') {
      try {
        const persisted: PersistedDraft = { text: draft.text, time: draftData.time }
        getStorageBackend(draftStorageType).setItem(key, JSON.stringify(persisted))
      }
      catch {
        // ignore
      }
    }
  }

  /** 保存文本草稿 */
  function saveDraft(conversationId: string, text: string) {
    if (!text) {
      clearDraft(conversationId)
      return
    }
    writeDraft(conversationId, { text, preview: text })
  }

  /** 保存包含编辑器状态的草稿 */
  function saveInputDraft(conversationId: string, draft: MessageInputDraft): void {
    writeDraft(conversationId, draft)
  }

  /** 加载完整草稿 */
  function loadInputDraft(conversationId: string): MessageInputDraft | null {
    if (features.enableDraft === false) {
      clearDraft(conversationId)
      return null
    }
    const key = getDraftKey(conversationId)
    const cached = draftCache.get(key)
    if (cached)
      return cached
    if (draftStorageType !== 'none') {
      try {
        const raw = getStorageBackend(draftStorageType).getItem(key)
        if (raw) {
          const data = JSON.parse(raw) as PersistedDraft
          const hydrated: DraftCacheEntry = { text: data.text, preview: data.text, time: data.time }
          draftCache.set(key, hydrated)
          conversationStore.updateConversation(conversationId, {
            draft: hydrated.preview,
            draftTime: data.time,
          })
          return hydrated
        }
      }
      catch {
        // ignore
      }
    }
    return null
  }

  /** 加载文本草稿 */
  function loadDraft(conversationId: string): string {
    return loadInputDraft(conversationId)?.text || ''
  }

  /** 清除草稿 */
  function clearDraft(conversationId: string) {
    const key = getDraftKey(conversationId)
    revokeDraftPreviewUrls(draftCache.get(key))
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

  /** 仅重算现有会话摘要，用于语言等展示上下文变化 */
  function refreshConversationPreviews(): void {
    domains.conversation.refreshPreviews?.()
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

  /** 置顶/取消置顶（乐观更新：先写 store 立即反馈，失败回滚原值并抛错） */
  async function pinConversation(id: string, isPinned: boolean) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    conversationStore.togglePin(id, isPinned)
    try {
      await domains.conversation.pin(id, cvs.type, isPinned)
    }
    catch (err) {
      conversationStore.updateConversation(id, { isPinned: cvs.isPinned, pinnedTime: cvs.pinnedTime })
      throw err
    }
  }

  /** 设置/取消免打扰（乐观更新：先写 store 立即反馈，失败回滚原值并抛错） */
  async function muteConversation(id: string, muted: boolean) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    conversationStore.updateConversation(id, { isMuted: muted })
    try {
      await domains.conversation.setMuted(id, cvs.type, muted)
    }
    catch (err) {
      conversationStore.updateConversation(id, { isMuted: cvs.isMuted })
      throw err
    }
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

  /** 清空聊天记录 */
  async function clearChatHistory(id: string, deleteRoamingMessages = false) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.clearChatHistory(id, cvs.type, deleteRoamingMessages)
    stores.message.clearConversationMessages(id)
  }

  /** 删除会话（默认保留漫游消息，仅删除本地缓存；删除会话≠删历史） */
  async function deleteConversation(id: string, deleteRoamingMessages = false) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.remove(id, cvs.type, deleteRoamingMessages)
    cleanupDeletedConversation(id)
  }

  /** 删除会话但保留漫游消息（异步，SDK 会同步服务端会话列表与本地缓存） */
  async function removeConversation(id: string) {
    const cvs = conversationStore.conversationList.find(c => c.id === id)
    if (!cvs)
      return
    await domains.conversation.removeLocal(id, cvs.type)
    cleanupDeletedConversation(id)
  }

  /**
   * 删除会话后的本地清理：
   * 从列表移除并清空 currentConversationId（若删的是当前会话），
   * 同时清掉该会话的本地消息缓存。
   * 必须先清 currentConversationId：SDK 删除成功后会通过会话列表事件回填 store，
   * store.setConversationList 的"保留当前会话"补回逻辑只在 currentConversationId
   * 非空时触发，先置空可避免已删除会话被旧快照补回列表（复活）。
   */
  function cleanupDeletedConversation(id: string) {
    if (conversationStore.currentConversationId === id) {
      conversationStore.setCurrentConversationId(null)
      stores.message.clearConversationMessages(id)
    }
    conversationStore.deleteConversation(id)
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
    refreshConversationPreviews,
    refreshConversations,
    loadMoreConversations,
    pinConversation,
    muteConversation,
    markConversationRead,
    sendChannelAck,
    clearChatHistory,
    deleteConversation,
    removeConversation,
    /** 直接设置本地会话列表（业务自定义数据源 / demo 注入 mock 用） */
    setLocalConversationList(list: UiConversation[]) {
      conversationStore.setConversationList(list)
    },
    saveDraft,
    saveInputDraft,
    loadDraft,
    loadInputDraft,
    clearDraft,
  }
}
