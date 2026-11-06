import type { EventStores } from '../../event/types'
import type { HandlersRef, InternalStoreHost } from './types'

/** 创建连接状态 store：跟踪 connected/connecting/hasConnectedOnce 并翻译为 ConnectState */
export function createClientStore(
  host: InternalStoreHost,
  handlersRef: HandlersRef,
): EventStores['client'] {
  let connected = false
  let connecting = false
  let hasConnectedOnce = false
  let kicked = false

  function getConnectState(): import('@easemob-community/uikit-sdk-contract').ConnectState {
    if (connecting)
      return 'connecting'
    if (connected)
      return 'connected'
    if (hasConnectedOnce)
      return 'reconnectFailed'
    return 'disconnected'
  }

  function emit() {
    handlersRef()?.onConnectStateChange?.(getConnectState())
  }

  return {
    get currentUser() {
      return host.currentUserId || ''
    },
    get client() {
      return host.client
        ? { deleteConversationOnGroupDestroyed: host.client.deleteConversationOnGroupDestroyed }
        : null
    },
    setConnected(value: boolean) {
      connected = value
      // 重新连接成功即恢复账号态（清除被踢标记）
      if (value)
        kicked = false
      emit()
    },
    setConnecting(value: boolean) {
      connecting = value
      emit()
    },
    setHasConnectedOnce(value: boolean) {
      hasConnectedOnce = value
    },
    setKicked(_code?: number) {
      // 被踢为账号态终态（SDK 不再自动重连）：内置 store 记账，避免影响 ConnectState 翻译
      kicked = true
      emit()
    },
  }
}
