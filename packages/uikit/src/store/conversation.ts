import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConversationTypeValue } from '../constants'

export interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  /** 最后一条消息类型（对齐 SDK MessageType: text/image/voice/video/file/cmd/custom/location） */
  lastMessageType?: string
  /** 最后一条消息发送者名称（群聊场景） */
  lastMessageSender?: string
  lastMessageTime?: number
  unreadCount?: number
  type: ConversationTypeValue
  /** 是否置顶 */
  isPinned?: boolean
  /** 置顶时间戳 */
  pinnedTime?: number
  /** 是否静音/免打扰 */
  isMuted?: boolean
  /** 草稿内容 */
  draft?: string
  /** 草稿保存时间戳 */
  draftTime?: number
  /** 显示名称（来自服务端 display） */
  displayName?: string
  /** 头像 URL（来自服务端 display） */
  avatarUrl?: string
  /** 提醒类型 */
  remindType?: string
  /** 会话标记 */
  marks?: number[]
  /** 已读位置时间戳（毫秒），来自 SessionItem.readReceipt */
  readReceipt?: number
}

export const useConversationStore = defineStore('conversation', () => {
  const conversationList = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const conversationCursor = ref<string | null>(null)
  /**
   * 是否已从服务端成功拉取过会话列表（仅记录首次首屏请求）。
   * 用于避免 ConversationContainer 在 tab 切换（mount/unmount）时反复触发远端拉取。
   * 登出时由 clearConversationList 自动重置。
   */
  const conversationsLoaded = ref(false)
  /** 群成员数缓存（groupId -> count），用于群已读回执的已读/未读人数计算 */
  const groupMemberCountMap = ref<Record<string, number>>({})

  /** 会话维度的对方输入状态：key = conversationId，value = 是否正在输入 */
  const typingMap = ref<Record<string, boolean>>({})

  /** 会话维度的是否有人@我：key = conversationId，value = 是否被@ */
  const atMeMap = ref<Record<string, boolean>>({})

  /** 会话列表是否正在从服务端同步（WebSocket 同步阶段） */
  const isSyncingConversations = ref(false)

  /** 按置顶状态和时间排序的会话列表 */
  const sortedConversationList = computed(() => {
    return [...conversationList.value].sort((a, b) => {
      // 置顶优先
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // 同置顶状态下按时间倒序
      const aTime = a.pinnedTime || a.lastMessageTime || 0
      const bTime = b.pinnedTime || b.lastMessageTime || 0
      return bTime - aTime
    })
  })

  const hasMoreConversations = computed(() => {
    return conversationCursor.value !== null && conversationCursor.value !== ''
  })

  function addConversation(cvs: Conversation) {
    const index = conversationList.value.findIndex((item: Conversation) => item.id === cvs.id)
    if (index > -1) {
      conversationList.value[index] = { ...conversationList.value[index], ...cvs }
    } else {
      conversationList.value.unshift(cvs)
    }
  }

  function setConversationList(list: Conversation[]) {
    conversationList.value = list
  }

  function deleteConversation(id: string) {
    conversationList.value = conversationList.value.filter((item: Conversation) => item.id !== id)
    if (currentConversation.value?.id === id) {
      currentConversation.value = null
    }
  }

  function setCurrentConversation(cvs: Conversation | null) {
    currentConversation.value = cvs
  }

  function updateConversation(id: string, patch: Partial<Conversation>) {
    const index = conversationList.value.findIndex((item: Conversation) => item.id === id)
    if (index > -1) {
      conversationList.value[index] = { ...conversationList.value[index], ...patch }
    }
  }

  function updateUnreadCount(id: string, count: number) {
    const cvs = conversationList.value.find((item: Conversation) => item.id === id)
    if (cvs) {
      cvs.unreadCount = count
    }
  }

  function togglePin(id: string, isPinned: boolean, pinnedTime?: number) {
    const cvs = conversationList.value.find((item: Conversation) => item.id === id)
    if (cvs) {
      cvs.isPinned = isPinned
      cvs.pinnedTime = isPinned ? (pinnedTime || Date.now()) : 0
    }
  }

  function setConversationCursor(cursor: string | null) {
    conversationCursor.value = cursor
  }

  function setConversationsLoaded(v: boolean) {
    conversationsLoaded.value = v
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

  /** 设置会话的@我状态 */
  function setAtMe(conversationId: string, hasAtMe: boolean) {
    atMeMap.value[conversationId] = hasAtMe
  }

  function setSyncingConversations(v: boolean) {
    isSyncingConversations.value = v
  }

  function clearConversationList() {
    conversationList.value = []
    currentConversation.value = null
    conversationCursor.value = null
    groupMemberCountMap.value = {}
    typingMap.value = {}
    atMeMap.value = {}
    conversationsLoaded.value = false
    isSyncingConversations.value = false
  }

  return {
    conversationList,
    sortedConversationList,
    currentConversation,
    conversationCursor,
    conversationsLoaded,
    setConversationsLoaded,
    hasMoreConversations,
    addConversation,
    setConversationList,
    deleteConversation,
    setCurrentConversation,
    updateConversation,
    updateUnreadCount,
    togglePin,
    setConversationCursor,
    groupMemberCountMap,
    setGroupMemberCount,
    getGroupMemberCount,
    typingMap,
    setTyping,
    atMeMap,
    setAtMe,
    isSyncingConversations,
    setSyncingConversations,
    clearConversationList,
  }
})
