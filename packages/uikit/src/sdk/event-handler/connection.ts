import type { EventPayloadMap } from 'easemob-websdk'
import type { RootStores } from './index'

/**
 * 创建连接事件处理器
 */
export function createConnectionHandler(stores: RootStores) {
  const handler = {
    onConnecting: (_payload: EventPayloadMap['onConnecting']) => {
      stores.client.setConnecting(true)
    },
    onConnected: (_payload: EventPayloadMap['onConnected']) => {
      stores.client.setConnected(true)
      stores.client.setConnecting(false)
    },
    onDisconnected: (_payload: EventPayloadMap['onDisconnected']) => {
      stores.client.setConnected(false)
      stores.client.setConnecting(false)
      stores.client.setCurrentUser('')
    },
    onReconnectFailed: (_payload: EventPayloadMap['onReconnectFailed']) => {
      stores.client.setConnecting(false)
      console.error('[UIKit] Auto-reconnect failed after max retries')
    },
    onOfflineMessageSyncStart: () => {
      console.log('[UIKit] Offline message sync started')
    },
    onOfflineMessageSyncFinish: () => {
      console.log('[UIKit] Offline message sync finished')
    },
    onTokenWillExpire: (_payload: EventPayloadMap['onTokenWillExpire']) => {
      console.warn('[UIKit] Token will expire')
    },
    onTokenExpired: (_payload: EventPayloadMap['onTokenExpired']) => {
      console.error('[UIKit] Token expired')
    },
  }

  return handler
}
