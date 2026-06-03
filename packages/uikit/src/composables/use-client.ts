import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIKit } from './use-uikit'
import { createClient } from '../sdk/client'
import type { ClientConfig } from '../sdk/types'
import { clearAllDrafts } from './use-conversation'

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
      // SDK 5.x: 登录后会自动触发 WebSocket 会话同步，
      // 通过 onConversationListSyncDidStart/Finish 事件驱动，
      // 不再手动调用 REST 接口拉取。
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
