import type { UIKitClient } from '../client'
import { getClient } from '../client'
import { useMessageStore } from '../../store/message'
import { useClientStore } from '../../store/client'
import { useConversationStore } from '../../store/conversation'
import { useGroupStore } from '../../store/group'
import { useContactStore } from '../../store/contact'
import { usePresenceStore } from '../../store/presence'
import { createConnectionHandler } from './connection'
import { createMessageHandler } from './message'
import { createConversationHandler } from './conversation'
import { createContactHandler } from './contact'
import { createGroupHandler } from './group'
import { createPresenceHandler } from './presence'

export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  client: ReturnType<typeof useClientStore>
  conversation: ReturnType<typeof useConversationStore>
  group: ReturnType<typeof useGroupStore>
  contact: ReturnType<typeof useContactStore>
  presence: ReturnType<typeof usePresenceStore>
}

/** 事件处理器可选业务开关，按需挂载对应类别事件 */
export interface EventHandlerOptions {
  /** 是否启用好友事件（邀请/同意/拒绝/删除等） */
  enableContact?: boolean
  /** 是否启用黑名单事件 */
  enableBlocklist?: boolean
  /** 是否启用在线状态事件 */
  enablePresence?: boolean
  /** 是否启用群组体系 */
  enableGroup?: boolean
}

export function createEventHandler(client: UIKitClient, stores: RootStores, options: EventHandlerOptions = {}) {
  // ========== 连接事件处理器 ==========
  const connHandler = createConnectionHandler(stores)

  // ========== Chat 事件处理器 ==========
  const messageHandler = createMessageHandler(stores)
  const conversationHandler = createConversationHandler(client, stores)

  const chatHandler = {
    ...messageHandler,
    ...conversationHandler,
  }

  // ========== 好友事件（可选） ==========
  if (options.enableContact) {
    const contactHandler = createContactHandler(stores)
    client.addContactEventHandler('uikit-contact', contactHandler)
  }

  // ========== 黑名单事件（可选） ==========
  if (options.enableBlocklist) {
    const blockHandler = {
      onContactDeleted: (msg: { from?: string }) => {
        const userId = msg.from
        if (userId) stores.contact.addToBlackList({ userId, name: userId })
      },
    }
    client.addContactEventHandler('uikit-blocklist', blockHandler)
  }

  // ========== 在线状态事件（可选） ==========
  if (options.enablePresence) {
    const presenceHandler = createPresenceHandler(stores)
    client.presenceManager.addEventHandler('uikit-presence', presenceHandler)
  }

  // ========== 群组事件（可选） ==========
  if (options.enableGroup) {
    const groupHandler = createGroupHandler(stores)
    client.addGroupEventHandler('uikit-group', groupHandler)
  }

  // 注册事件处理器
  client.addEventHandler('uikit-conn', connHandler)
  client.addChatEventHandler('uikit-chat', chatHandler)

  return {
    dispose: () => {
      client.removeEventHandler('uikit-conn')
      client.removeChatEventHandler('uikit-chat')
      if (options.enableContact) {
        client.removeContactEventHandler('uikit-contact')
      }
      if (options.enableBlocklist) {
        client.removeContactEventHandler('uikit-blocklist')
      }
      if (options.enablePresence) {
        client.presenceManager.removeEventHandler('uikit-presence')
      }
      if (options.enableGroup) {
        client.removeGroupEventHandler('uikit-group')
      }
    },
  }
}

