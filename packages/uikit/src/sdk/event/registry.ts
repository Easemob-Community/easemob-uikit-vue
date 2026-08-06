import type { ManagerHost } from '../client'
import type { RootStores } from './types'
import { createConnectionHandlers } from './connection-events'
import type { ConnectionEventCallbacks } from './connection-events'
import { createChatHandlers } from './chat-events'
import { createContactHandlers } from './contact-events'
import { createGroupHandlers } from './group-events'
import { createPresenceHandlers } from './presence-events'

/**
 * 统一注册 UIKit 所需的所有 SDK 事件处理器。
 * 返回 dispose 函数，用于登出或组件卸载时清理。
 */
export function registerEventHandlers(
  client: ManagerHost,
  stores: RootStores,
  connectionCallbacks: ConnectionEventCallbacks = {},
) {
  const connHandlers = createConnectionHandlers(stores, connectionCallbacks)
  const chatHandlers = createChatHandlers(client, stores)
  const contactHandlers = createContactHandlers(stores)
  const groupHandlers = createGroupHandlers(stores)
  const presenceHandlers = createPresenceHandlers(stores)

  // 连接事件注册到 ChatClient
  client.addEventHandler('uikit-conn', connHandlers)

  // 各 manager 事件注册到对应 manager
  client.chatManager.addEventHandler('uikit-chat', chatHandlers)
  client.contactManager.addEventHandler('uikit-contact', contactHandlers)
  client.groupManager.addEventHandler('uikit-group', groupHandlers)
  client.presenceManager.addEventHandler('uikit-presence', presenceHandlers)

  return () => {
    client.removeEventHandler('uikit-conn')
    client.chatManager.removeEventHandler('uikit-chat')
    client.contactManager.removeEventHandler('uikit-contact')
    client.groupManager.removeEventHandler('uikit-group')
    client.presenceManager.removeEventHandler('uikit-presence')
  }
}
