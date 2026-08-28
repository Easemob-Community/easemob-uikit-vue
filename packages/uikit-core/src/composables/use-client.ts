import { computed } from 'vue'
import { useCoreUIKit } from './use-uikit'

export function useClient() {
  const ctx = useCoreUIKit()
  const { client, stores } = ctx
  const clientStore = stores.client

  const connected = computed(() => clientStore.connected)
  const connecting = computed(() => clientStore.connecting)
  /** 是否已成功连接过：用于区分首次连接与自动重连 */
  const hasConnectedOnce = computed(() => clientStore.hasConnectedOnce)
  const isLoggedIn = computed(() => clientStore.connected && !!clientStore.currentUser)
  const currentUser = computed(() => clientStore.currentUser)
  const sdkClient = computed(() => client.value)

  return {
    client,
    sdkClient,
    connected,
    connecting,
    hasConnectedOnce,
    isLoggedIn,
    currentUser,
    /** 手动初始化 SDK 客户端（延迟初始化场景） */
    init: ctx.init,
    /** 登录（支持 accessToken 或密码） */
    login: ctx.login,
    /**
     * SDK 层登出：断开 SDK 连接并清理 core stores（client/presence/userInfo）。
     * 注意：core 无场景状态；场景包（如 uikit-im）的 UIKit 内部状态
     * （会话/消息/联系人/群、草稿、多选等）请用场景包提供的退出入口
     * （uikit-im 为 useUIKit().logout()）做完整重置。
     */
    logout: ctx.logout,
  }
}
