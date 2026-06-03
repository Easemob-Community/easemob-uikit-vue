import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIKit } from './use-uikit'
import { createClient } from '../sdk/client'
import type { ClientConfig } from '../sdk/types'
import { CONVERSATION_TYPE } from '../constants'
import { clearAllDrafts } from './use-conversation'
import type { ChatManager } from 'im-sdk-web'

/** SDK ConversationPage 类型提取 */
type SdkConversationPage = Awaited<ReturnType<ChatManager['getConversationList']>>

export function useClient() {
  const { stores } = useUIKit()
  const clientStore = stores.client
  const conversationStore = stores.conversation
  const { client } = storeToRefs(clientStore)

  const connected = computed(() => clientStore.connected)
  const isLoggedIn = computed(() => clientStore.isLoggedIn)
  const currentUser = computed(() => clientStore.currentUser)

  /** 手动初始化 SDK 客户端（适用于延迟初始化场景） */
  function init(config: ClientConfig) {
    const instance = createClient(config)
    clientStore.setClient(instance)
    return instance
  }

  /** 登录成功后获取会话列表 */
  async function fetchConversationsAfterLogin() {
    try {
      const res = await client.value?.getServerConversations({ pageSize: 50 })
      const page = res as SdkConversationPage
      const list = page?.items || []
      const mapped = list.map((item) => {
        const lastMsg = item.lastMessage
        return {
          id: item.conversationId,
          name: item.conversationId,
          lastMessage: (lastMsg?.body && typeof lastMsg.body === 'object' ? String((lastMsg.body as Record<string, unknown>).content || '') : ''),
          lastMessageTime: lastMsg?.timestamp || 0,
          unreadCount: item.unreadCount || 0,
          type: (item.conversationType === CONVERSATION_TYPE.GROUPCHAT ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT) as typeof CONVERSATION_TYPE.SINGLECHAT | typeof CONVERSATION_TYPE.GROUPCHAT,
          isPinned: item.isPinned || false,
          pinnedTime: item.pinnedTime || 0,
        }
      })
      conversationStore.setConversationList(mapped)
    } catch (error) {
      console.error('[UIKit] fetch conversations failed:', error)
    }
  }

  return {
    client,
    connected,
    isLoggedIn,
    currentUser,
    init,
    /** 原始 SDK ChatClient 实例 */
    sdkClient: computed(() => client.value?.client ?? null),
    /** 登录（支持 accessToken 或密码） */
    login: async (params: { user: string; accessToken?: string; password?: string }) => {
      const result = await client.value?.login(params)
      clientStore.setCurrentUser(params.user)
      // 登录成功后自动拉取服务端会话列表
      await fetchConversationsAfterLogin()
      return result
    },
    /** 登出 */
    logout: async () => {
      await client.value?.logout()
      clientStore.setConnected(false)
      clientStore.setCurrentUser('')
      conversationStore.clearConversationList()
      clearAllDrafts()
    },
  }
}
