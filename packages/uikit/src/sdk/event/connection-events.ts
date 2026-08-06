import type { ConnectionEventHandlerMap } from 'easemob-websdk'
import { createLogger } from '../../utils/logger'
import type { RootStores } from './types'

const connLog = createLogger('UIKit:ConnEvents')

/** 连接级事件对外回调 */
export interface ConnectionEventCallbacks {
  /** Token 即将过期 */
  onTokenWillExpire?: () => void
  /** Token 已过期 */
  onTokenExpired?: () => void
}

/**
 * 创建连接事件处理器。
 * 注册到 ChatClient.addEventHandler。
 */
export function createConnectionHandlers(
  stores: RootStores,
  callbacks: ConnectionEventCallbacks = {},
): ConnectionEventHandlerMap {
  return {
    onConnecting: () => {
      connLog.info('onConnecting')
      stores.client.setConnecting(true)
    },
    onConnected: () => {
      connLog.info('onConnected')
      stores.client.setConnected(true)
      stores.client.setConnecting(false)
    },
    onDisconnected: () => {
      connLog.info('onDisconnected')
      stores.client.setConnected(false)
      stores.client.setConnecting(false)
      // 断线不清 currentUser：自动重连只触发 onConnected，
      // 若此处清空则重连后 currentUser 永不恢复；仅 logout 时才清除。
    },
    onReconnectFailed: () => {
      connLog.info('onReconnectFailed')
      stores.client.setConnecting(false)
      connLog.error('Auto-reconnect failed after max retries')
    },
    onTokenWillExpire: () => {
      connLog.info('onTokenWillExpire')
      connLog.warn('Token will expire')
      callbacks.onTokenWillExpire?.()
    },
    onTokenExpired: () => {
      connLog.info('onTokenExpired')
      connLog.error('Token expired')
      callbacks.onTokenExpired?.()
    },
    onOfflineMessageSyncStart: () => {
      connLog.info('onOfflineMessageSyncStart')
      stores.message.setSyncingMessages(true)
    },
    onOfflineMessageSyncFinish: () => {
      connLog.info('onOfflineMessageSyncFinish')
      stores.message.setSyncingMessages(false)
    },
  }
}
