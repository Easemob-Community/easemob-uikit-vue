import { type ComputedRef, type InjectionKey, type Ref, computed, inject, isRef, onScopeDispose, provide, shallowRef } from 'vue'
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
import type { ConnectionEventCallbacks } from '../sdk/event/connection-events'
import { useMessageStore } from '../store/message'
import { useConversationStore } from '../store/conversation'
import { useContactStore } from '../store/contact'
import { useGroupStore } from '../store/group'
import { usePresenceStore } from '../store/presence'
import { useClientStore } from '../store/client'
import { useThemeStore } from '../store/theme'
import { useUserInfoStore } from '../store/user-info'
import type { RootStores } from '../sdk/event/types'
import { getNoticeConfigResolver, setNoticeConfigResolver } from '../sdk/event/notice-utils'
import type { NoticeConfig } from '../sdk/event/notice-utils'
import { resolveUserDisplayName } from '../utils/resolve-last-message-text'
import type { UIKitDataSource, UIKitFeatures } from './types'
import { type H5AdaptationConfig, useH5Adaptation } from './use-h5-adaptation'
import { clearAllDrafts } from './use-conversation'
import { resetMultiSelectState } from './use-message-actions'
import { useInvitePersistenceInternal } from './use-invite-persistence'

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
  /** 系统通知自定义配置（惰性读取，支持运行时变更） */
  noticeConfig: NoticeConfig
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
  presenceStrangerMode: 'none',
  fetchGroupMemberPresenceOnVisible: true,
  contactFetchMode: 'page',
  enableGroup: true,
  enableUserInfo: true,
  enableUserInfoSubscription: true,
  enableInvitePersistence: true,
  enableDraft: true,
  enableAtMe: true,
  enableTyping: true,
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
    /** 支持传入 computed：ctx.features 以 getter 形式在每次读取时解析最新值 */
    features?: Partial<UIKitFeatures> | ComputedRef<Partial<UIKitFeatures>>
    /** 支持传入 computed：ctx.dataSource 以惰性代理形式在每次读取时解析最新值 */
    dataSource?: Partial<UIKitDataSource> | ComputedRef<Partial<UIKitDataSource> | undefined>
    /**
     * 系统通知自定义配置：renderText 自定义文案 / filter 条件隐藏 / disabledEvents 禁用事件。
     * 支持传入 computed，运行时切换即可生效。
     */
    noticeConfig?: NoticeConfig | ComputedRef<NoticeConfig>
    h5?: H5AdaptationConfig
    /**
     * 用户资料订阅无权限/服务未开通时的回调；UIKit 默认将其绑定到内置 Toast。
     */
    onUserInfoSubscriptionPermissionError?: () => void
    /** 连接级事件回调（token 即将过期 / 已过期等） */
    connectionCallbacks?: ConnectionEventCallbacks
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

  // features / dataSource 支持传入响应式 computed：
  // ctx 上的字段不再静态快照，每次读取时解析最新 props，
  // 运行时切换 enableContact / enablePresence 等开关即刻生效（初始化行为不变）。
  const resolveFeatures = (): UIKitFeatures => ({
    ...defaultFeatures,
    ...(isRef(options.features) ? options.features.value : options.features),
  })
  const features = {} as UIKitFeatures
  for (const key of Object.keys(defaultFeatures) as (keyof UIKitFeatures)[]) {
    Object.defineProperty(features, key, {
      enumerable: true,
      get: () => resolveFeatures()[key],
    })
  }

  const resolveDataSource = (): UIKitDataSource => {
    const ds = isRef(options.dataSource) ? options.dataSource.value : options.dataSource
    return (ds || {}) as UIKitDataSource
  }
  const dataSource = new Proxy({} as UIKitDataSource, {
    get: (_target, prop) => resolveDataSource()[prop as keyof UIKitDataSource],
    has: (_target, prop) => prop in resolveDataSource(),
    ownKeys: () => Reflect.ownKeys(resolveDataSource()),
    getOwnPropertyDescriptor: (_target, prop) => Object.getOwnPropertyDescriptor(resolveDataSource(), prop),
  })

  const resolveNoticeConfig = (): NoticeConfig => {
    const cfg = isRef(options.noticeConfig) ? options.noticeConfig.value : options.noticeConfig
    return (cfg || {}) as NoticeConfig
  }
  const noticeConfig = new Proxy({} as NoticeConfig, {
    get: (_target, prop) => resolveNoticeConfig()[prop as keyof NoticeConfig],
    has: (_target, prop) => prop in resolveNoticeConfig(),
    ownKeys: () => Reflect.ownKeys(resolveNoticeConfig()),
    getOwnPropertyDescriptor: (_target, prop) => Object.getOwnPropertyDescriptor(resolveNoticeConfig(), prop),
  })
  // 注册到通知管线（模块级解析器，与 locale 的 currentLocale 同款模式；卸载时重置）
  setNoticeConfigResolver(resolveNoticeConfig)

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
    get pushManager() {
      return requireClient().pushManager
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
    conversation: new ConversationDomain(host, stores.conversation, {
      // 进入会话时批量补发未回执的接收消息（登录离线消息场景）
      sendPendingReadReceipts: (id, type) => void domains.message.sendPendingReadReceipts(id, type),
      // 会话列表群聊摘要优先使用 UIKit 已缓存的联系人备注 / 用户资料昵称
      resolveSenderName: userId => resolveUserDisplayName(stores, userId),
    }),
    contact: new ContactDomain(host, stores.contact),
    group: new GroupDomain(host, stores.group),
    presence: new PresenceDomain(host, stores.presence),
    userInfo: new UserInfoDomain(
      host,
      stores.userInfo,
      // Domain 构造时解析一次快照（初始化行为不变）；ctx.dataSource 则为惰性代理
      resolveDataSource(),
      options.onUserInfoSubscriptionPermissionError,
    ),
  }

  /** 创建 SDK 客户端并注册事件（首次或重新初始化） */
  function setupClient(cfg: ClientConfig): UIKitClient {
    disposeEvents?.()
    disposeUserInfoDomain?.()
    uikitClient = createClient(cfg)
    currentAppKey = cfg.appKey
    stores.client.setAppKey(cfg.appKey)
    disposeEvents = registerEventHandlers(uikitClient, stores, options.connectionCallbacks, features)
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
    disposeEvents?.()
    disposeEvents = null
    disposeUserInfoDomain?.()
    disposeUserInfoDomain = null
    stores.client.clearClient()
    stores.conversation.clearConversations()
    stores.message.clearMessages()
    stores.contact.clearContacts()
    stores.group.clearGroups()
    stores.presence.clearPresence()
    stores.userInfo.clearUserInfos()
    // 清理模块级单例：多选状态与草稿缓存（跨登录会话不应残留）
    resetMultiSelectState()
    clearAllDrafts()
  }

  const ctx: UIKitContext = {
    client,
    domains,
    stores,
    features,
    dataSource,
    noticeConfig,
    h5,
    theme: useThemeStore(),
    init,
    login,
    logout,
  }

  provide(UIKIT_CONTEXT_KEY, ctx)

  // 好友申请/群邀请本地持久化：按登录用户 + appKey 隔离，仅保留 pending 状态
  // 与 address-book-container / contact-notice-list 中显式调用的 useInvitePersistence 共用同一 storage key，
  // 避免 provider 级与组件级两套独立机制导致数据不一致。
  // 使用 Internal 版本直接传入 stores，避免在 Provider 自身内部调用 useUIKit()（inject 无法在当前组件命中）
  useInvitePersistenceInternal(computed(() => features.enableInvitePersistence ?? true), stores)

  onScopeDispose(() => {
    disposeEvents?.()
    disposeEvents = null
    disposeUserInfoDomain?.()
    disposeUserInfoDomain = null
    // 卸载时重置通知配置解析器，避免残留已卸载 Provider 的配置；
    // 仅当当前解析器仍属于本实例时才重置，避免误清空后挂载 Provider 的配置（多 Provider 并存场景）
    if (getNoticeConfigResolver() === resolveNoticeConfig)
      setNoticeConfigResolver(() => ({}))
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
