import { type InjectionKey, type Ref, inject, onScopeDispose, provide, shallowRef } from 'vue'
import type { ClientConfig, ManagerHost } from '../sdk/client'
import { createClient } from '../sdk/client'
import {
  ContactDomain,
  ConversationDomain,
  GroupDomain,
  MessageDomain,
  PresenceDomain,
} from '../sdk/domain'
import { registerEventHandlers } from '../sdk/event/registry'
import { useMessageStore } from '../store/message'
import { useConversationStore } from '../store/conversation'
import { useContactStore } from '../store/contact'
import { useGroupStore } from '../store/group'
import { usePresenceStore } from '../store/presence'
import { useClientStore } from '../store/client'
import type { RootStores } from '../sdk/event/types'
import type { UIKitDataSource, UIKitFeatures } from './types'

export type { UIKitDataSource, UIKitFeatures, ContactFetchMode } from './types'

export interface UIKitContext {
  client: Ref<ManagerHost>
  domains: {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
  }
  stores: RootStores
  features: UIKitFeatures
  dataSource: UIKitDataSource
}

export const UIKIT_CONTEXT_KEY: InjectionKey<UIKitContext> = Symbol('uikit')

const defaultFeatures: UIKitFeatures = {
  enableContact: true,
  enableBlocklist: true,
  enablePresence: false,
  contactFetchMode: 'page',
  enableGroup: true,
}

/**
 * 初始化 UIKit Provider。
 * 在 <UIKitProvider> 组件的 setup 中调用。
 */
export function useUIKitProvider(
  config: ClientConfig,
  options: {
    features?: Partial<UIKitFeatures>
    dataSource?: Partial<UIKitDataSource>
  } = {},
) {
  const uikitClient = createClient(config)
  // 使用 shallowRef 避免深层 UnwrapRef 丢失 SDK Manager 的私有字段导致类型不兼容
  const client: Ref<ManagerHost> = shallowRef(uikitClient)

  const stores: RootStores = {
    message: useMessageStore(),
    conversation: useConversationStore(),
    contact: useContactStore(),
    group: useGroupStore(),
    presence: usePresenceStore(),
    client: useClientStore(),
  }

  const domains = {
    message: new MessageDomain(client.value, stores.message),
    conversation: new ConversationDomain(client.value, stores.conversation),
    contact: new ContactDomain(client.value, stores.contact),
    group: new GroupDomain(client.value, stores.group),
    presence: new PresenceDomain(client.value, stores.presence),
  }

  const dispose = registerEventHandlers(client.value, stores)

  const ctx: UIKitContext = {
    client,
    domains,
    stores,
    features: { ...defaultFeatures, ...options.features },
    dataSource: options.dataSource || {},
  }

  provide(UIKIT_CONTEXT_KEY, ctx)

  onScopeDispose(() => {
    dispose()
  })

  return {
    ...ctx,
    /** 登录 */
    async login(userId: string, token: string) {
      await uikitClient.login(userId, token)
      stores.client.setCurrentUser(userId)
      stores.client.setAppKey(config.appKey)
    },
    /** 登出 */
    async logout() {
      await uikitClient.logout()
      stores.client.clearClient()
      stores.conversation.clearConversationList()
      stores.message.clearMessages()
      stores.contact.clearContacts()
      stores.group.clearGroups()
      stores.presence.clear()
    },
  }
}

/**
 * 获取 UIKit Context。
 * 必须在 <UIKitProvider> 内部使用。
 */
export function useUIKit() {
  const ctx = inject(UIKIT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useUIKit() must be used within <UIKitProvider>')
  }
  return ctx
}
