import type { EventStores } from '../../event/types'
import { createClientStore } from './client'
import { createContactStore } from './contact'
import { createConversationStore } from './conversation'
import { createGroupStore } from './group'
import { createMessageStore } from './message'
import { createPresenceStore } from './presence'
import type { HandlersRef, InternalStoreHost } from './types'
import { createUserInfoStore } from './user-info'

export function createInternalStores(host: InternalStoreHost, handlersRef: HandlersRef): EventStores {
  return {
    client: createClientStore(host, handlersRef),
    message: createMessageStore(handlersRef),
    conversation: createConversationStore(handlersRef),
    contact: createContactStore(handlersRef),
    group: createGroupStore(handlersRef),
    presence: createPresenceStore(handlersRef),
    userInfo: createUserInfoStore(handlersRef),
  }
}
