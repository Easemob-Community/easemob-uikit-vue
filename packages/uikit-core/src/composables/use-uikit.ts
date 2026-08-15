import { type ComputedRef, type InjectionKey, type Ref, inject, isRef, onScopeDispose, provide, shallowRef } from 'vue'
import type { ClientConfig, ManagerHost, UIKitClient } from '../sdk/client'
import { createClient } from '../sdk/client'
import { UserInfoDomain } from '../sdk/domain/user-info-domain'
import { PresenceDomain } from '../sdk/domain/presence-domain'
import type { ConnectionEventCallbacks } from '../sdk/event/connection-events'
import { type NoticeConfig, getNoticeConfigResolver, setNoticeConfigResolver } from '../sdk/event/notice-utils'
import { useClientStore } from '../store/client'
import { usePresenceStore } from '../store/presence'
import { useUserInfoStore } from '../store/user-info'
import { useThemeStore } from '../store/theme'
import type { UIKitDataSource, UIKitFeatures } from './types'
import { type H5AdaptationConfig, useH5Adaptation } from './use-h5-adaptation'

/** core 侧 UIKit 登录参数：支持 accessToken 或密码登录 */
export interface CoreUIKitLoginParams {
  user: string
  accessToken?: string
  password?: string
}

/** core provider 管理的 Pinia stores（client / presence / userInfo） */
export interface CoreStores {
  client: ReturnType<typeof useClientStore>
  presence: ReturnType<typeof usePresenceStore>
  userInfo: ReturnType<typeof useUserInfoStore>
}

export interface CoreUIKitContext {
  client: Ref<ManagerHost>
  domains: {
    presence: PresenceDomain
    userInfo: UserInfoDomain
  }
  stores: CoreStores
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
  login: (params: CoreUIKitLoginParams) => Promise<void>
  /** 登出 */
  logout: () => Promise<void>
}

export const CORE_UIKIT_CONTEXT_KEY: InjectionKey<CoreUIKitContext> = Symbol('uikit-core')

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

export interface CoreUIKitProviderOptions {
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
  /** 连接级事件回调（token 即将过期 / 已过期等）；core 不消费，保留给场景层挂钩使用 */
  connectionCallbacks?: ConnectionEventCallbacks
  /**
   * 场景包名称（如 'UIKit-IM'），随 createClient 注入客户端版本日志展示；默认 'UIKit'。
   * 延迟初始化路径（ctx.init(config)）同样生效。
   */
  clientName?: string
  /** 场景包版本号（如 '2.0.0'），随 createClient 注入客户端版本日志展示；未提供时日志只输出 SDK + Core 版本 */
  clientVersion?: string
  /**
   * 场景层挂钩：core 在 createClient + stores.client.setAppKey + domains.userInfo.listen()
   * 之后调用，用于注册场景级 SDK 事件等；返回的 dispose 函数在重新初始化 / logout /
   * scope dispose 时调用。
   */
  onClientSetup?: (client: UIKitClient, coreStores: CoreStores) => (() => void) | void
}

/**
 * 初始化 core 侧 UIKit Provider（客户端生命周期 + core stores/domains）。
 * 场景包（uikit-im 等）的 Provider 在此基础上组合场景 stores/domains 与事件注册。
 *
 * 支持延迟初始化：当 `autoInit === false`（或未提供 appKey）时，setup 阶段不创建 SDK 客户端，
 * 待业务通过 `init(config)` 传入 appKey 后再创建。Domain 层通过 ManagerHost 代理
 * 在运行时读取当前客户端，因此可在初始化前构建、初始化后正常工作。
 */
export function useCoreUIKitProvider(
  config: ClientConfig,
  options: CoreUIKitProviderOptions = {},
): CoreUIKitContext {
  const stores: CoreStores = {
    client: useClientStore(),
    presence: usePresenceStore(),
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
  let disposeClientSetup: (() => void) | null = null
  let disposeUserInfoDomain: (() => void) | null = null
  let currentAppKey = config.appKey || ''

  function requireClient(): UIKitClient {
    if (!uikitClient) {
      throw new Error(
        '[UIKit] SDK 尚未初始化：请先调用 init(config)，或在 Provider 上提供 appKey 且保持 auto-init 开启',
      )
    }
    return uikitClient
  }

  // ManagerHost 代理：domains 持有它，运行时委托到当前 client（支持延迟/重新初始化）
  const host: ManagerHost = {
    get chatManager() {
      return requireClient().chatManager
    },
    get chatRoomManager() {
      return requireClient().chatRoomManager
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
    presence: new PresenceDomain(host, stores.presence),
    userInfo: new UserInfoDomain(
      host,
      stores.userInfo,
      // Domain 构造时解析一次快照（初始化行为不变）；ctx.dataSource 则为惰性代理
      resolveDataSource(),
      options.onUserInfoSubscriptionPermissionError,
    ),
  }

  /** 创建 SDK 客户端并完成 core 侧初始化（首次或重新初始化） */
  function setupClient(cfg: ClientConfig): UIKitClient {
    disposeClientSetup?.()
    disposeUserInfoDomain?.()
    uikitClient = createClient({
      ...cfg,
      // 场景包版本日志注入：provider options 优先（覆盖两条初始化路径）
      clientName: options.clientName ?? cfg.clientName,
      clientVersion: options.clientVersion ?? cfg.clientVersion,
    })
    currentAppKey = cfg.appKey
    stores.client.setAppKey(cfg.appKey)
    domains.userInfo.listen()
    disposeUserInfoDomain = () => domains.userInfo.dispose()
    // 场景层挂钩（如 uikit-im 注册场景事件），返回的 dispose 随客户端生命周期清理
    disposeClientSetup = options.onClientSetup?.(uikitClient, stores) || null
    return uikitClient
  }

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey
  if (options.autoInit !== false && config.appKey) {
    setupClient(config)
  }

  function init(cfg: ClientConfig): UIKitClient {
    return setupClient(cfg)
  }

  async function login(params: CoreUIKitLoginParams): Promise<void> {
    const instance = requireClient()
    await instance.login(params.user, params.accessToken ?? params.password ?? '')
    stores.client.setCurrentUser(params.user)
    stores.client.setAppKey(currentAppKey)
  }

  async function logout(): Promise<void> {
    if (uikitClient) {
      await uikitClient.logout()
    }
    disposeClientSetup?.()
    disposeClientSetup = null
    disposeUserInfoDomain?.()
    disposeUserInfoDomain = null
    stores.client.clearClient()
    stores.presence.clearPresence()
    stores.userInfo.clearUserInfos()
  }

  const ctx: CoreUIKitContext = {
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

  provide(CORE_UIKIT_CONTEXT_KEY, ctx)

  onScopeDispose(() => {
    disposeClientSetup?.()
    disposeClientSetup = null
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
 * 获取 core UIKit Context。
 * 必须在 <UIKitProvider> 内部使用。
 */
export function useCoreUIKit() {
  const ctx = inject(CORE_UIKIT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useCoreUIKit() must be used within <UIKitProvider>')
  }
  return ctx
}
