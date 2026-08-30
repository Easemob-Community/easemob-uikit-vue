import type { EasemobChat } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-sdk-contract'
import { setSyncStatus } from '../use-sync-status'

const connLog = createLogger('UIKit:Webim4ConnEvents')

/**
 * 连接事件处理器依赖的最小 Store 集合（结构类型，与 websdk5 同构）。
 */
export interface ConnectionEventStores {
  client: {
    setConnected: (value: boolean) => void
    setConnecting: (value: boolean) => void
    setHasConnectedOnce: (value: boolean) => void
  }
  conversation: {
    conversationsLoaded: boolean
  }
  message: {
    setSyncingMessages: (value: boolean) => void
  }
}

/** 连接级事件对外回调 */
export interface ConnectionEventCallbacks {
  /** Token 即将过期 */
  onTokenWillExpire?: () => void
  /** Token 已过期 */
  onTokenExpired?: () => void
}

/**
 * 创建 4.x 连接事件处理器。
 * 注册到 `connection.addEventHandler(id, handlers)`（4.x 所有事件挂单一 handler 对象）。
 *
 * 4.x 连接事件与 5.x 的对应关系（主计划 8.2）：
 * - `onConnected` / `onDisconnected`（4.8.0 起带断开原因参数）/ `onReconnecting`
 * - `onTokenWillExpire`（4.15.0 起，Token 有效期 80% 时回调）/ `onTokenExpired`
 * - `onOfflineMessageSyncStart` / `onOfflineMessageSyncFinish`（离线消息拉取，4.x 无分类型同步事件）
 */
export function createConnectionHandlers(
  stores: ConnectionEventStores,
  callbacks: ConnectionEventCallbacks = {},
): Partial<EasemobChat.EventHandlerType> {
  return {
    onConnected: () => {
      connLog.info('onConnected')
      stores.client.setConnected(true)
      stores.client.setConnecting(false)
      // 标记首次连接成功：此后再次 onReconnecting 即为自动重连，横幅据此区分文案
      stores.client.setHasConnectedOnce(true)
    },
    onReconnecting: () => {
      connLog.info('onReconnecting')
      stores.client.setConnected(false)
      stores.client.setConnecting(true)
    },
    onDisconnected: (error) => {
      connLog.info('onDisconnected', error ? { error } : undefined)
      stores.client.setConnected(false)
      stores.client.setConnecting(false)
      // 断线不清 currentUser：自动重连只触发 onConnected，
      // 若此处清空则重连后 currentUser 永不恢复；仅 logout 时才清除。
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
      setSyncStatus('message', { status: 'syncing' })
      // 保留「仅首次加载时展示横幅」的判断，避免重连成功后已加载完会话列表的场景再次抖动
      if (!stores.conversation.conversationsLoaded) {
        stores.message.setSyncingMessages(true)
      }
    },
    onOfflineMessageSyncFinish: () => {
      connLog.info('onOfflineMessageSyncFinish')
      stores.message.setSyncingMessages(false)
      setSyncStatus('message', { status: 'success', finishedAt: Date.now() })
    },
  }
}
