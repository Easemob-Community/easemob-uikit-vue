import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import type { Conversation } from '../store/conversation'

/** 将服务端会话数据转换为 UIKIT Conversation 格式 */
function mapServerConversation(item: any): Conversation {
  const lastMsg = item.lastMessage || {}
  return {
    id: item.conversationId,
    name: item.conversationId,
    lastMessage: lastMsg.msg || lastMsg.type || '',
    lastMessageTime: lastMsg.time || item.lastMessage?.time || 0,
    unreadCount: item.unReadCount || 0,
    type: item.conversationType,
    isPinned: item.isPinned || false,
    pinnedTime: item.pinnedTime || 0,
  }
}

export function useConversation() {
  const { client, stores } = useUIKit()
  const conversationStore = stores.conversation

  const conversationList = computed(() => conversationStore.sortedConversationList)
  const currentConversation = computed(() => conversationStore.currentConversation)

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
  }) {
    const res = await client.value?.getServerConversations(options)
    const list: any[] = res?.data?.conversations || []
    const mapped = list.map(mapServerConversation)
    conversationStore.setConversationList(mapped)
    return res
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

  /** 发送会话已读回执 */
  async function sendChannelAck(id: string) {
    const cvs = conversationStore.conversationList.find((c: { id: string }) => c.id === id)
    if (!cvs) return

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

  return {
    conversationList,
    currentConversation,
    selectConversation,
    fetchServerConversations,
    pinConversation,
    sendChannelAck,
    deleteConversation,
    removeConversation,
  }
}
