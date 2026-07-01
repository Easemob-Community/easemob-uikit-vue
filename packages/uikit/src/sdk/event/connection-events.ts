import type { ConnectionEventHandlerMap } from 'easemob-websdk'
import type { RootStores } from './types'

/**
 * 创建连接事件处理器。
 * 注册到 ChatClient.addEventHandler。
 */
export function createConnectionHandlers(stores: RootStores): ConnectionEventHandlerMap {
  return {
    onConnecting: () => {
      stores.client.setConnecting(true)
    },
    onConnected: () => {
      stores.client.setConnected(true)
      stores.client.setConnecting(false)
    },
    onDisconnected: () => {
      stores.client.setConnected(false)
      stores.client.setConnecting(false)
      stores.client.setCurrentUser('')
    },
    onReconnectFailed: () => {
      stores.client.setConnecting(false)
      console.error('[UIKit] Auto-reconnect failed after max retries')
    },
    onTokenWillExpire: () => {
      console.warn('[UIKit] Token will expire')
    },
    onTokenExpired: () => {
      console.error('[UIKit] Token expired')
    },
    onOfflineMessageSyncStart: () => {
      // 离线消息同步开始：当前无需 UI 处理
    },
    onOfflineMessageSyncFinish: () => {
      // 离线消息同步结束：当前无需 UI 处理
    },
  }
}
