import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiConversation } from '../sdk/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversationList = ref<UiConversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const conversationsLoaded = ref(false)
  const isSyncingConversations = ref(false)
  const groupMemberCountMap = ref<Record<string, number>>({})
  const typingMap = ref<Record<string, boolean>>({})
  const atMeMap = ref<Record<string, boolean>>({})

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

  /** SDK5 当前 getConversationList 无分页游标 */
  const hasMoreConversations = computed(() => false)

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

  function setTyping(conversationId: string, isTyping: boolean) {
    typingMap.value[conversationId] = isTyping
  }

  function setAtMe(conversationId: string, hasAtMe: boolean) {
    atMeMap.value[conversationId] = hasAtMe
  }

  function clearConversationList() {
    conversationList.value = []
    currentConversationId.value = null
    conversationsLoaded.value = false
    isSyncingConversations.value = false
    groupMemberCountMap.value = {}
    typingMap.value = {}
    atMeMap.value = {}
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
    typingMap,
    atMeMap,
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
    setTyping,
    setAtMe,
    clearConversationList,
  }
})
