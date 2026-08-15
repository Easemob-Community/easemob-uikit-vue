import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiConversation } from '@easemob/uikit-core'

export const useConversationStore = defineStore('conversation', () => {
  const conversationList = ref<UiConversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const conversationsLoaded = ref(false)
  const isSyncingConversations = ref(false)
  const groupMemberCountMap = ref<Record<string, number>>({})
  const atMeMap = ref<Record<string, boolean>>({})
  /** 正在输入状态：仅单聊，key 为 conversationId */
  const typingMap = ref<Record<string, { userId: string }>>({})
  /** typing 功能全局开关，默认开启 */
  const typingEnabled = ref(true)
  /** typing 状态过期计时器（模块私有，避免频繁触发响应式更新） */
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const TYPING_TIMEOUT = 5000

  const currentConversation = computed(() =>
    conversationList.value.find(c => c.id === currentConversationId.value) || null,
  )

  const sortedConversationList = computed(() => {
    return [...conversationList.value].sort((a, b) => {
      if (a.isPinned && !b.isPinned)
        return -1
      if (!a.isPinned && b.isPinned)
        return 1
      const aTime = a.pinnedTime || a.lastMessageTime || 0
      const bTime = b.pinnedTime || b.lastMessageTime || 0
      return bTime - aTime
    })
  })

  /** 是否还有更多会话可加载（分页数据源场景，SDK 全量加载时为 false） */
  const hasMoreConversations = ref(false)

  function addConversation(cvs: UiConversation) {
    const index = conversationList.value.findIndex(item => item.id === cvs.id)
    if (index > -1) {
      conversationList.value[index] = { ...conversationList.value[index], ...cvs }
    }
    else {
      conversationList.value.unshift(cvs)
    }
  }

  function setConversationList(list: UiConversation[]) {
    const currentId = currentConversationId.value
    const currentCvs = currentId
      ? conversationList.value.find(item => item.id === currentId)
      : undefined
    conversationList.value = list
    // 保留当前会话：刷新/同步后的列表若不含当前会话，把本地快照补回去，
    // 避免从联系人/群组详情新建空会话后被刷新覆盖导致右侧聊天消失。
    // 该补回只在 currentConversationId 非空时触发；删除会话的路径
    // （useConversation.cleanupDeletedConversation）会先置空 currentConversationId，
    // 因此被删除的当前会话不会被补回（不会在列表中复活）。
    if (currentId && currentCvs && !list.some(item => item.id === currentId)) {
      conversationList.value = [currentCvs, ...list]
    }
  }

  function deleteConversation(id: string) {
    conversationList.value = conversationList.value.filter(item => item.id !== id)
    if (currentConversationId.value === id) {
      currentConversationId.value = null
    }
  }

  function setCurrentConversationId(id: string | null) {
    currentConversationId.value = id
  }

  function updateConversation(id: string, patch: Partial<UiConversation>) {
    const index = conversationList.value.findIndex(item => item.id === id)
    if (index > -1) {
      conversationList.value[index] = { ...conversationList.value[index], ...patch }
    }
  }

  function updateUnreadCount(id: string, count: number) {
    updateConversation(id, { unreadCount: count })
  }

  function togglePin(id: string, isPinned: boolean, pinnedTime?: number) {
    updateConversation(id, {
      isPinned,
      pinnedTime: isPinned ? (pinnedTime || Date.now()) : undefined,
    })
  }

  function setConversationsLoaded(v: boolean) {
    conversationsLoaded.value = v
  }

  function setSyncingConversations(v: boolean) {
    isSyncingConversations.value = v
  }

  function setGroupMemberCount(groupId: string, count: number) {
    groupMemberCountMap.value[groupId] = count
  }

  function getGroupMemberCount(groupId: string): number {
    return groupMemberCountMap.value[groupId] || 0
  }

  function setAtMe(conversationId: string, hasAtMe: boolean) {
    atMeMap.value[conversationId] = hasAtMe
  }

  /**
   * 设置会话的正在输入状态。
   * 同一会话高频触发时仅重置过期 timer，不重复更新响应式状态，避免 UI 抖动。
   */
  function setTypingEnabled(enabled: boolean) {
    typingEnabled.value = enabled
    if (!enabled) {
      typingTimers.forEach(timer => clearTimeout(timer))
      typingTimers.clear()
      typingMap.value = {}
    }
  }

  function setTyping(conversationId: string, userId: string) {
    if (!typingEnabled.value)
      return
    const existingTimer = typingTimers.get(conversationId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    typingTimers.set(conversationId, setTimeout(() => {
      clearTyping(conversationId)
    }, TYPING_TIMEOUT))

    const existed = typingMap.value[conversationId]
    if (!existed || existed.userId !== userId) {
      typingMap.value[conversationId] = { userId }
    }
  }

  function clearTyping(conversationId: string) {
    const timer = typingTimers.get(conversationId)
    if (timer) {
      clearTimeout(timer)
      typingTimers.delete(conversationId)
    }
    if (typingMap.value[conversationId]) {
      delete typingMap.value[conversationId]
    }
  }

  function setHasMoreConversations(value: boolean) {
    hasMoreConversations.value = value
  }

  function clearConversations() {
    conversationList.value = []
    currentConversationId.value = null
    conversationsLoaded.value = false
    isSyncingConversations.value = false
    hasMoreConversations.value = false
    groupMemberCountMap.value = {}
    atMeMap.value = {}
    typingTimers.forEach(timer => clearTimeout(timer))
    typingTimers.clear()
    typingMap.value = {}
  }

  // 别名方法：兼容 Domain 层接口
  const setList = setConversationList
  const setSyncing = setSyncingConversations
  const remove = deleteConversation
  const removeLocal = deleteConversation
  const update = updateConversation
  const del = deleteConversation

  return {
    conversationList,
    sortedConversationList,
    currentConversation,
    currentConversationId,
    hasMoreConversations,
    conversationsLoaded,
    isSyncingConversations,
    groupMemberCountMap,
    atMeMap,
    typingMap,
    typingEnabled,
    addConversation,
    setConversationList,
    setList,
    deleteConversation,
    remove,
    removeLocal,
    delete: del,
    setCurrentConversationId,
    updateConversation,
    update,
    updateUnreadCount,
    togglePin,
    setConversationsLoaded,
    setSyncingConversations,
    setSyncing,
    setGroupMemberCount,
    getGroupMemberCount,
    setAtMe,
    setTypingEnabled,
    setTyping,
    clearTyping,
    setHasMoreConversations,
    clearConversations,
  }
})
