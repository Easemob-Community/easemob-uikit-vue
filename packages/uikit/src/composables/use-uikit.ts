import { type InjectionKey, type Ref, inject, onScopeDispose, provide, shallowRef } from 'vue'
import type { ClientConfig, ManagerHost, UIKitClient } from '../sdk/client'
import { createClient } from '../sdk/client'
import {
  ContactDomain,
  ConversationDomain,
  GroupDomain,
  MessageDomain,
  PresenceDomain,
  UserInfoDomain,
} from '../sdk/domain'
import { registerEventHandlers } from '../sdk/event/registry'
import { useMessageStore } from '../store/message'
import { useConversationStore } from '../store/conversation'
import { useContactStore } from '../store/contact'
import { useGroupStore } from '../store/group'
import { usePresenceStore } from '../store/presence'
import { useClientStore } from '../store/client'
import { useThemeStore } from '../store/theme'
import { useUserInfoStore } from '../store/user-info'
import type { RootStores } from '../sdk/event/types'
import type { UIKitDataSource, UIKitFeatures } from './types'
import { useH5Adaptation, type H5AdaptationConfig } from './use-h5-adaptation'

export type { UIKitDataSource, UIKitFeatures, ContactFetchMode } from './types'
export type { H5AdaptationConfig } from './use-h5-adaptation'

/** UIKit 登录参数：支持 accessToken 或密码登录 */
export interface UIKitLoginParams {
  user: string
  accessToken?: string
  password?: string
}

export interface UIKitContext {
  client: Ref<ManagerHost>
  domains: {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
    userInfo: UserInfoDomain
  }
  stores: RootStores
  features: UIKitFeatures
  dataSource: UIKitDataSource
  /** H5 适配状态（viewport / 安全区 / 键盘高度 / 下拉刷新开关） */
  h5: ReturnType<typeof useH5Adaptation>
  /** 主题 store（provider 与消费方共享同一实例） */
  theme: ReturnType<typeof useThemeStore>
  /** 手动初始化 SDK 客户端（延迟初始化场景，auto-init=false 时使用） */
  init: (config: ClientConfig) => UIKitClient
  /** 登录（支持 accessToken 或密码） */
  login: (params: UIKitLoginParams) => Promise<void>
  /** 登出 */
  logout: () => Promise<void>
}

export const UIKIT_CONTEXT_KEY: InjectionKey<UIKitContext> = Symbol('uikit')

const defaultFeatures: UIKitFeatures = {
  enableContact: true,
  enableBlocklist: true,
  enablePresence: false,
  contactFetchMode: 'page',
  enableGroup: true,
  enableUserInfo: true,
  enableUserInfoSubscription: true,
}

/**
 * 初始化 UIKit Provider。
 * 在 <UIKitProvider> 组件的 setup 中调用。
 *
 * 支持延迟初始化：当 `autoInit === false`（或未提供 appKey）时，setup 阶段不创建 SDK 客户端，
 * 待业务通过 `useClient().init(config)` 传入 appKey 后再创建。Domain 层通过 ManagerHost 代理
 * 在运行时读取当前客户端，因此可在初始化前构建、初始化后正常工作。
 */
export function useUIKitProvider(
  config: ClientConfig,
  options: {
    autoInit?: boolean
    features?: Partial<UIKitFeatures>
    dataSource?: Partial<UIKitDataSource>
    h5?: H5AdaptationConfig
  } = {},
) {
  const stores: RootStores = {
    message: useMessageStore(),
    conversation: useConversationStore(),
    contact: useContactStore(),
    group: useGroupStore(),
    presence: usePresenceStore(),
    client: useClientStore(),
    userInfo: useUserInfoStore(),
  }

  // H5 适配状态：单一实例注入 context，避免各组件重复监听
  const h5 = useH5Adaptation(options.h5 ?? {})

  // 真实 SDK 客户端懒加载：auto-init=false 时在 init() 调用后才创建
  let uikitClient: UIKitClient | null = null
  let disposeEvents: (() => void) | null = null
  let disposeUserInfoDomain: (() => void) | null = null
  let currentAppKey = config.appKey || ''

  function requireClient(): UIKitClient {
    if (!uikitClient) {
      throw new Error(
        '[UIKit] SDK 尚未初始化：请先调用 useClient().init(config)，或在 <UIKitProvider> 上提供 appKey 且保持 auto-init 开启',
      )
    }
    return uikitClient
  }

  // ManagerHost 代理：domains 持有它，运行时委托到当前 client（支持延迟/重新初始化）
  const host: ManagerHost = {
    get chatManager() {
      return requireClient().chatManager
    },
    get contactManager() {
      return requireClient().contactManager
    },
    get groupManager() {
      return requireClient().groupManager
    },
    get presenceManager() {
      return requireClient().presenceManager
    },
    get userInfoManager() {
      return requireClient().userInfoManager
    },
    get currentUserId() {
      return uikitClient?.currentUserId ?? null
    },
    addEventHandler(id, handlers) {
      requireClient().addEventHandler(id, handlers)
    },
    removeEventHandler(id) {
      requireClient().removeEventHandler(id)
    },
  }

  // 使用 shallowRef 避免深层 UnwrapRef 丢失 SDK Manager 的私有字段导致类型不兼容
  const client: Ref<ManagerHost> = shallowRef(host)

  const domains = {
    message: new MessageDomain(host, stores.message),
    conversation: new ConversationDomain(host, stores.conversation),
    contact: new ContactDomain(host, stores.contact),
    group: new GroupDomain(host, stores.group),
    presence: new PresenceDomain(host, stores.presence),
    userInfo: new UserInfoDomain(host, stores.userInfo, options.dataSource || {}),
  }

  /** 创建 SDK 客户端并注册事件（首次或重新初始化） */
  function setupClient(cfg: ClientConfig): UIKitClient {
    disposeEvents?.()
    disposeUserInfoDomain?.()
    uikitClient = createClient(cfg)
    currentAppKey = cfg.appKey
    stores.client.setAppKey(cfg.appKey)
    disposeEvents = registerEventHandlers(uikitClient, stores)
    domains.userInfo.listen()
    disposeUserInfoDomain = () => domains.userInfo.dispose()
    return uikitClient
  }

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey
  if (options.autoInit !== false && config.appKey) {
    setupClient(config)
  }

  function init(cfg: ClientConfig): UIKitClient {
    return setupClient(cfg)
  }

  async function login(params: UIKitLoginParams): Promise<void> {
    const instance = requireClient()
    await instance.login(params.user, params.accessToken ?? params.password ?? '')
    stores.client.setCurrentUser(params.user)
    stores.client.setAppKey(currentAppKey)
  }

  async function logout(): Promise<void> {
    if (uikitClient) {
      await uikitClient.logout()
    }
    disposeUserInfoDomain?.()
    disposeUserInfoDomain = null
    stores.client.clearClient()
    stores.conversation.clearConversationList()
    stores.message.clearMessages()
    stores.contact.clearContacts()
    stores.group.clearGroups()
    stores.presence.clear()
    stores.userInfo.clearUserInfos()
  }

  const ctx: UIKitContext = {
    client,
    domains,
    stores,
    features: { ...defaultFeatures, ...options.features },
    dataSource: options.dataSource || {},
    h5,
    theme: useThemeStore(),
    init,
    login,
    logout,
  }

  provide(UIKIT_CONTEXT_KEY, ctx)

  onScopeDispose(() => {
    disposeEvents?.()
  })

  return ctx
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
