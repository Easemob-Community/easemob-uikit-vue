import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIKit } from './use-uikit'
import { createClient } from '../sdk/client'
import type { ClientConfig } from '../sdk/types'

export function useClient() {
  const { stores } = useUIKit()
  const clientStore = stores.client
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
    /** 原始 SDK Connection 实例 */
    connection: computed(() => client.value?.connection ?? null),
    /** 登录 */
    login: async (params: { user: string; accessToken?: string }) => {
      const result = await client.value?.login(params)
      clientStore.setCurrentUser(params.user)
      return result
    },
    /** 登出 */
    logout: async () => {
      await client.value?.logout()
      clientStore.setConnected(false)
      clientStore.setCurrentUser('')
    },
  }
}
