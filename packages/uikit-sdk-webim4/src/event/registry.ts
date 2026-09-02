import type { EasemobChat } from 'easemob-websdk-4'
import type { SdkPersistenceHooks, UIKitFeatures } from '@easemob/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import { resetSyncStatus } from '../use-sync-status'
import { resetReadReceiptState } from '../domain/message-domain'
import { resetStreamState } from '../adapter/message-adapter'
import type { EventStores } from './types'
import { createConnectionHandlers } from './connection-events'
import type { ConnectionEventCallbacks } from './connection-events'
import { createChatHandlers, resetChatEventState } from './chat-events'
import { createConversationHandlers } from './conversation-events'
import { createContactHandlers } from './contact-events'
import { createGroupHandlers } from './group-events'
import { createPresenceHandlers } from './presence-events'

/** 合并后的 4.x 事件处理器 id */
const HANDLER_ID = 'uikit'

/**
 * 统一注册 UIKit 所需的所有 4.x SDK 事件处理器。
 *
 * 与 5.x 按 manager 拆分注册不同，4.x 所有事件挂单一
 * `connection.addEventHandler(id, EventHandlerType)`——本函数把各域的
 * Partial handler 合并为一个对象一次注册；返回 dispose 函数，
 * 用于登出或组件卸载时清理。
 */
export function registerEventHandlers(
  client: Webim4Client,
  stores: EventStores,
  connectionCallbacks: ConnectionEventCallbacks = {},
  features?: UIKitFeatures,
  persistence?: SdkPersistenceHooks,
): () => void {
  const conn = client.connection
  if (!conn)
    throw new Error('[Webim4] connection 尚未初始化，无法注册事件处理器')

  const merged: EasemobChat.EventHandlerType = {
    ...createConnectionHandlers(stores, connectionCallbacks),
    ...createChatHandlers(client, stores, features, persistence),
    ...createConversationHandlers(stores, persistence),
    ...createContactHandlers(stores),
    ...createGroupHandlers(stores),
    ...createPresenceHandlers(stores),
  } as EasemobChat.EventHandlerType

  conn.addEventHandler(HANDLER_ID, merged)

  return () => {
    client.connection?.removeEventHandler(HANDLER_ID)
    // 模块级缓存状态随事件注册周期归零，防止 logout→login 跨会话残留（对齐 websdk5 dispose）
    resetChatEventState()
    resetSyncStatus()
    resetReadReceiptState()
    resetStreamState()
  }
}
