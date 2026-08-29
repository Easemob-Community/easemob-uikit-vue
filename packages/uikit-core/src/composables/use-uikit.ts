import { type ComputedRef, type InjectionKey, type Ref, inject, isRef, onScopeDispose, provide, shallowRef } from 'vue'
import type { SdkAdapter, SdkConfig, SdkPresenceDomain, SdkUserInfoDomain } from '@easemob/uikit-sdk-contract'
import { type NoticeConfig, getNoticeConfigResolver, setNoticeConfigResolver } from '../sdk/event/notice-utils'
import { buildAnnouncementNoticeText, insertChatNotice, resolveNoticeUserName } from '../sdk/event/notice-utils'
import { t } from '../locale/messages'
import { useClientStore } from '../store/client'
import { usePresenceStore } from '../store/presence'
import { useUserInfoStore } from '../store/user-info'
import { useThemeStore } from '../store/theme'
import type { UIKitDataSource, UIKitFeatures } from './types'
import { type H5AdaptationConfig, useH5Adaptation } from './use-h5-adaptation'
import { emitNotificationDelivered, useNotification } from './use-notification'
import { resetSyncState, setSyncState } from './use-sync-status'

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

/**
 * 延迟初始化配置：兼容旧 ClientConfig 平铺字段（apiUrl / enableSyncData / deviceId 等），
 * 未知字段统一下沉 adapterConfig 透传给 adapter。
 */
export type CoreUIKitInitConfig = SdkConfig & Record<string, unknown>

/** 连接级事件回调（token 即将过期 / 已过期） */
export interface CoreConnectionCallbacks {
  onTokenWillExpire?: () => void
  onTokenExpired?: () => void
}

export interface CoreUIKitContext {
  /** 中立 SDK 适配器实例 */
  client: Ref<SdkAdapter>
  domains: {
    presence: SdkPresenceDomain
    userInfo: SdkUserInfoDomain
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
  /** 手动初始化 SDK（延迟初始化场景，auto-init=false 时使用） */
  init: (config: CoreUIKitInitConfig) => Promise<void>
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
  filterBlockedContacts: true,
}

export interface CoreUIKitProviderOptions {
  autoInit?: boolean
  /**
   * 注入的中立 SDK 适配器（注入模式：业务全权管理生命周期）。
   * 未传时由 `createDefaultAdapter` 创建内置适配器（内置模式：UIKit 全权）。
   */
  adapter?: SdkAdapter
  /** 内置模式下的默认适配器工厂（由场景包/core 容器注入，避免 core 静态依赖具体 adapter） */
  createDefaultAdapter?: () => SdkAdapter
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
  connectionCallbacks?: CoreConnectionCallbacks
  /**
   * 场景包名称（如 'UIKit-IM'），透传给 adapter 用于客户端版本日志展示；默认 'UIKit'。
   */
  clientName?: string
  /** 场景包版本号（如 '2.0.0'），透传给 adapter 用于客户端版本日志展示 */
  clientVersion?: string
  /**
   * 场景层 store 注入：场景包（uikit-im）把场景 Pinia stores（message/conversation/contact/group）
   * 经 adapterConfig.stores 传给 adapter，事件与 Domain 直接写业务 store（结构兼容即可）。
   * core 自身的 client/presence/userInfo store 由 core 自动注入。
   */
  sceneStores?: Record<string, unknown>
  /**
   * 场景层挂钩：core 在 adapter.init + stores.client.setAppKey 之后调用，
   * 用于注册场景级 SDK 事件（如 chatroom 房间事件）等；返回的 dispose 函数在
   * 重新初始化 / logout / scope dispose 时调用。
   */
  onAdapterReady?: (adapter: SdkAdapter) => (() => void) | void
  /**
   * 场景层 SdkConfig 解析钩子：在 adapter.init 前对配置做场景化补齐
   * （如 IM 场景注入 enableSyncData 默认值）。auto-init 与延迟初始化路径统一经过该钩子。
   */
  resolveSdkConfig?: (config: CoreUIKitInitConfig) => CoreUIKitInitConfig
}

/**
 * 组装事件层依赖（i18n / 通知 / 系统通知插入），经 adapterConfig.eventDeps 注入 adapter。
 * 这些能力都属于 core UI 层；adapter 零依赖 core，靠注入解耦。
 */
function buildEventHandlerDeps(): Record<string, unknown> {
  return {
    t,
    insertChatNotice,
    buildAnnouncementNoticeText,
    resolveNoticeUserName,
    useNotification,
    emitNotificationDelivered,
  }
}

/**
 * 把兼容旧 ClientConfig 的平铺初始化配置归一化为 SdkConfig：
 * 标准字段（appKey/debug/userId/token/adapterConfig）保留，其余平铺字段下沉 adapterConfig。
 */
function normalizeInitConfig(config: CoreUIKitInitConfig): CoreUIKitInitConfig {
  const { appKey, debug, userId, token, adapterConfig, ...rest } = config
  return {
    appKey,
    debug,
    userId,
    token,
    adapterConfig: { ...rest, ...adapterConfig },
  }
}

/**
 * 初始化 core 侧 UIKit Provider（SDK 适配器生命周期 + core stores）。
 * 场景包（uikit-im 等）的 Provider 在此基础上注入场景 stores 与场景配置钩子。
 *
 * 架构（D122）：core 只面向 `SdkAdapter` 中立接口（init/login/logout/subscribe/domains），
 * 不再直接 createClient / 构造 Domain / registerEventHandlers——这些都封进 adapter。
 * 事件流：adapter 事件层直接写注入的 Pinia stores（adapterConfig.stores），
 * 中立事件（adapter.subscribe）仅承担 token 回调与同步状态桥接。
 *
 * 支持延迟初始化：当 `autoInit === false`（或未提供 appKey）时，setup 阶段不初始化 SDK，
 * 待业务通过 `init(config)` 传入 appKey 后再初始化。Domain 访问在初始化前调用会抛错，
 * 初始化后正常工作（与旧 ManagerHost 代理语义一致）。
 */
export function useCoreUIKitProvider(
  config: CoreUIKitInitConfig,
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

  // 适配器实例：注入模式用业务传入的，内置模式用 createDefaultAdapter 工厂创建
  const adapterMaybe = options.adapter ?? options.createDefaultAdapter?.()
  if (!adapterMaybe) {
    throw new Error(
      '[UIKit] 缺少 SDK 适配器：请传入 adapter prop，或由 Provider 注入 createDefaultAdapter',
    )
  }
  const adapter: SdkAdapter = adapterMaybe

  // 使用 shallowRef 避免深层 UnwrapRef 丢失适配器/Domain 的私有字段导致类型不兼容
  const client: Ref<SdkAdapter> = shallowRef(adapter)

  let currentAppKey = config.appKey || ''
  let initialized = false
  /** 进行中的初始化 Promise：允许业务 init() 后不 await 直接 login（login 内部会等待） */
  let initPromise: Promise<void> | null = null
  let disposeSubscription: (() => void) | null = null
  /** 场景层挂钩（onAdapterReady）返回的清理函数，随初始化/登出/卸载生命周期清理 */
  let disposeAdapterReady: (() => void) | null = null

  /**
   * core 域面：惰性委托 adapter.domains，未初始化时访问即抛错（同旧 ManagerHost 语义）。
   * 用 getter 延迟到调用点取值，保证 auto-init=false 场景下 context 构建不炸。
   */
  const domains = {
    get presence(): SdkPresenceDomain {
      return adapter.domains.presence
    },
    get userInfo(): SdkUserInfoDomain {
      return adapter.domains.userInfo
    },
  }

  /**
   * 订阅中立事件：token 过期回调 + 同步状态桥接（useSyncStatus 数据源）。
   * 幂等：重复初始化先取消旧订阅再重建。
   */
  function subscribeAdapterEvents(): void {
    disposeSubscription?.()
    disposeSubscription = adapter.subscribe({
      onTokenWillExpire: () => options.connectionCallbacks?.onTokenWillExpire?.(),
      onTokenExpired: () => options.connectionCallbacks?.onTokenExpired?.(),
      onSyncStatus: payload => setSyncState(payload),
    })
  }

  /** 初始化 SDK（首次或重新初始化） */
  async function setupAdapter(cfg: CoreUIKitInitConfig): Promise<void> {
    // 场景化配置补齐（enableSyncData 等场景默认值），两条初始化路径统一经过；
    // 先归一化（平铺字段下沉 adapterConfig）再走场景钩子，场景钩子只见中立形态
    const normalized = normalizeInitConfig(cfg)
    const resolved = options.resolveSdkConfig?.(normalized) ?? normalized
    await adapter.init({
      ...resolved,
      adapterConfig: {
        ...resolved.adapterConfig,
        // 场景包版本日志注入：provider options 优先（覆盖两条初始化路径）
        clientName: options.clientName ?? (resolved.adapterConfig?.clientName as string | undefined),
        clientVersion: options.clientVersion ?? (resolved.adapterConfig?.clientVersion as string | undefined),
        // live 对象引用：事件层运行时读取最新开关
        features,
        // 业务数据源接管（惰性代理）
        dataSource,
        // store 注入：core stores + 场景 stores（事件层/Domain 直写）
        stores: {
          client: stores.client,
          presence: stores.presence,
          userInfo: stores.userInfo,
          ...options.sceneStores,
        },
        eventDeps: buildEventHandlerDeps(),
        onUserInfoSubscriptionPermissionError: options.onUserInfoSubscriptionPermissionError,
      },
    })
    initialized = true
    currentAppKey = resolved.appKey
    stores.client.setAppKey(resolved.appKey)
    // 连接配置快照：事件层（群解散删会话等）读取 deleteConversationOnGroupDestroyed
    const rawClient = adapter.client as { deleteConversationOnGroupDestroyed?: boolean } | null | undefined
    stores.client.setClient({
      deleteConversationOnGroupDestroyed: rawClient?.deleteConversationOnGroupDestroyed ?? true,
    })
    subscribeAdapterEvents()
    // 场景层挂钩（如 chatroom 注册场景事件），返回的 dispose 随生命周期清理
    disposeAdapterReady?.()
    disposeAdapterReady = options.onAdapterReady?.(adapter) || null
  }

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey
  if (options.autoInit !== false && config.appKey) {
    initPromise = setupAdapter(config)
  }

  async function init(cfg: CoreUIKitInitConfig): Promise<void> {
    initPromise = setupAdapter(cfg)
    await initPromise
  }

  async function login(params: CoreUIKitLoginParams): Promise<void> {
    // 兼容「init() 后不 await 直接 login」的旧调用时序：等待进行中的初始化完成
    if (!initialized && initPromise) {
      await initPromise
    }
    if (!initialized) {
      throw new Error(
        '[UIKit] SDK 尚未初始化：请先调用 init(config)，或在 Provider 上提供 appKey 且保持 auto-init 开启',
      )
    }
    await adapter.login(params.user, params.accessToken ?? params.password ?? '')
    // 登出后再登录：场景层挂钩已在登出时 dispose，需重新执行（同旧 registerClientSetup 语义）
    if (!disposeAdapterReady) {
      disposeAdapterReady = options.onAdapterReady?.(adapter) || null
    }
    stores.client.setCurrentUser(params.user)
    stores.client.setAppKey(currentAppKey)
  }

  async function logout(): Promise<void> {
    await adapter.logout()
    disposeAdapterReady?.()
    disposeAdapterReady = null
    // 同步状态随登出归零，防止跨登录会话残留
    resetSyncState()
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
    disposeSubscription?.()
    disposeSubscription = null
    disposeAdapterReady?.()
    disposeAdapterReady = null
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
