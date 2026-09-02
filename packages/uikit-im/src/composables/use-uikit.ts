import { type ComputedRef, type InjectionKey, type Ref, computed, inject, provide } from 'vue'
import type {
  SdkAdapter,
  SdkCapabilities,
  SdkContactDomain,
  SdkConversationDomain,
  SdkGroupDomain,
  SdkMessageDomain,
  SdkPresenceDomain,
  SdkUserInfoDomain,
} from '@easemob/uikit-sdk-contract'
import type { CoreConnectionCallbacks, CoreUIKitInitConfig, H5AdaptationConfig, NoticeConfig, UIKitDataSource, UIKitFeatures, useH5Adaptation, useThemeStore } from '@easemob/uikit-core'
import {
  useCoreUIKitProvider,
} from '@easemob/uikit-core'
import { useMessageStore } from '../store/message'
import { useConversationStore } from '../store/conversation'
import { useContactStore } from '../store/contact'
import { useGroupStore } from '../store/group'
import type { RootStores } from '../sdk/types'
import { clearAllDrafts } from './use-conversation'
import { resetMultiSelectState } from './use-message-actions'
import { useInvitePersistenceInternal } from './use-invite-persistence'

// 构建期注入：@easemob/uikit-im 包版本（vite define，见 vite.config.ts）
declare const __EASEMOB_UIKIT_VERSION__: string

export type { UIKitDataSource, UIKitFeatures, ContactFetchMode } from '@easemob/uikit-core'
export type { SdkCapabilities, SdkCapabilityFlags, SdkRepositoryOverrides, ContactPage, GroupPage } from '@easemob/uikit-core'
export type { H5AdaptationConfig } from '@easemob/uikit-core'

/** UIKit 登录参数：支持 accessToken 或密码登录 */
export interface UIKitLoginParams {
  user: string
  accessToken?: string
  password?: string
}

export interface UIKitContext {
  /** 中立 SDK 适配器实例（SdkAdapter） */
  client: Ref<SdkAdapter>
  domains: {
    message: SdkMessageDomain
    conversation: SdkConversationDomain
    contact: SdkContactDomain
    group: SdkGroupDomain
    presence: SdkPresenceDomain
    userInfo: SdkUserInfoDomain
  }
  stores: RootStores
  features: UIKitFeatures
  /**
   * 业务数据源接管（@deprecated 薄别名）：core 装配时已翻译为 repositories 注入
   * adapter Domain；本字段仅保留 searchUsers（无 repository 对应项）与
   * 「是否配置自定义数据源」判定读取，uikit-im 3.0.0 移除。
   */
  dataSource: UIKitDataSource
  /**
   * SDK 客观能力矩阵（adapter 上报，缺省全 true）：与 features（业务开关）
   * 取交集决定能力入口展示，见 message-interactive / multi-select-bar / 群已读回执。
   */
  capabilities: SdkCapabilities
  /** 系统通知自定义配置（惰性读取，支持运行时变更） */
  noticeConfig: NoticeConfig
  /** H5 适配状态（viewport / 安全区 / 键盘高度 / 下拉刷新开关） */
  h5: ReturnType<typeof useH5Adaptation>
  /** 主题 store（provider 与消费方共享同一实例） */
  theme: ReturnType<typeof useThemeStore>
  /** 手动初始化 SDK（延迟初始化场景，auto-init=false 时使用） */
  init: (config: CoreUIKitInitConfig) => Promise<void>
  /** 登录（支持 accessToken 或密码） */
  login: (params: UIKitLoginParams) => Promise<void>
  /**
   * UIKit 层完整退出：SDK 断开 + core stores（client/presence/userInfo）
   * + 场景 stores（conversation/message/contact/group）+ 模块级单例
   * （多选状态/草稿缓存）全部重置；下次登录自动重建 SDK 事件处理器。
   * 与 useClient().logout（仅断开 SDK 连接）区分：业务侧「退出登录」应调用本方法。
   */
  logout: () => Promise<void>
}

export const UIKIT_CONTEXT_KEY: InjectionKey<UIKitContext> = Symbol('uikit')

/**
 * 注入 IM 场景默认配置：登录后自动同步会话/联系人/群。
 * 业务方经 sdkConfig/adapterConfig 显式传入时以业务配置为准（覆盖默认）。
 * managers 默认值由 adapter 内置（WEBSDK5_MANAGERS，不含 ChatRoomManager），此处不再注入。
 */
function resolveSdkConfig(config: CoreUIKitInitConfig): CoreUIKitInitConfig {
  return {
    ...config,
    adapterConfig: {
      // 登录后自动同步的数据类型；默认同步会话/联系人/群（SDK 默认仅 conversation）。
      // 'contact' 依赖 UserInfoManager 的 userInfo:read 能力，'group' 依赖 GroupManager。
      enableSyncData: ['conversation', 'contact', 'group'],
      ...config.adapterConfig,
    },
  }
}

/**
 * 初始化 UIKit Provider。
 * 在 <UIKitProvider> 组件的 setup 中调用。
 *
 * 架构（D122）：客户端生命周期 / core stores / presence & userInfo 域由
 * `@easemob/uikit-core` 的 useCoreUIKitProvider 承接；SDK 访问统一走中立
 * `SdkAdapter` 接口（init/login/logout/subscribe/domains），场景 stores
 * （message/conversation/contact/group）经 adapterConfig.stores 注入 adapter，
 * 事件层直写 Pinia store（行为与旧 registerEventHandlers 直连一致）。
 *
 * 支持延迟初始化：当 `autoInit === false`（或未提供 appKey）时，setup 阶段不初始化 SDK，
 * 待业务通过 `useClient().init(config)` 传入 appKey 后再初始化。Domain 在初始化前调用
 * 会抛错，初始化后正常工作（与旧 ManagerHost 代理语义一致）。
 */
export function useUIKitProvider(
  config: CoreUIKitInitConfig,
  options: {
    /**
     * 注入的中立 SDK 适配器（注入模式：业务全权管理其生命周期，决策 18）。
     * 未传时走 core 注册表默认适配器（由 `@easemob/uikit-im/websdk5` 子路径入口
     * import 时自注册，决策 22；未注册会在 Provider 装配时抛出明确错误）。
     */
    adapter?: SdkAdapter
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
    connectionCallbacks?: CoreConnectionCallbacks
  } = {},
) {
  // 场景 stores（message / conversation / contact / group）；
  // core stores（client / presence / userInfo）由 core provider 创建
  const sceneStores = {
    message: useMessageStore(),
    conversation: useConversationStore(),
    contact: useContactStore(),
    group: useGroupStore(),
  }

  // core provider：承接 adapter 生命周期、core stores/domains、features/dataSource/noticeConfig/h5/theme。
  // autoInit 一律置 false，立即初始化改在下方显式触发。
  // 默认适配器由 core 注册表解析（子路径入口 @easemob/uikit-im/websdk5 自注册，决策 22）。
  // clientName/clientVersion：场景包版本注入，客户端版本日志输出 SDK + UIKit-IM + Core 三版本。
  // resolveSdkConfig：IM 默认 enableSyncData 注入下沉到 core setupAdapter，
  // auto-init 与 useClient().init() 延迟初始化路径统一生效。
  // sceneStores：场景 Pinia stores 注入 adapter（事件层/Domain 直写）。
  const coreCtx = useCoreUIKitProvider(config, {
    ...options,
    autoInit: false,
    clientName: 'UIKit-IM',
    clientVersion: __EASEMOB_UIKIT_VERSION__,
    resolveSdkConfig,
    sceneStores,
  })

  const stores: RootStores = {
    ...sceneStores,
    presence: coreCtx.stores.presence,
    client: coreCtx.stores.client,
    userInfo: coreCtx.stores.userInfo,
  }

  const adapter = coreCtx.client.value

  // 场景域面：惰性委托 adapter.domains（getter 延迟到调用点取值，
  // 未初始化时抛错，与旧 ManagerHost 代理语义一致）
  const domains = {
    get message(): SdkMessageDomain {
      return adapter.domains.message
    },
    get conversation(): SdkConversationDomain {
      return adapter.domains.conversation
    },
    get contact(): SdkContactDomain {
      return adapter.domains.contact
    },
    get group(): SdkGroupDomain {
      return adapter.domains.group
    },
    get presence(): SdkPresenceDomain {
      return coreCtx.domains.presence
    },
    get userInfo(): SdkUserInfoDomain {
      return coreCtx.domains.userInfo
    },
  }

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey（语义同 core 的 auto-init）。
  // IM 默认 enableSyncData 由 core setupAdapter 内的 resolveSdkConfig 钩子补齐，
  // 此处与延迟初始化（ctx.init）均传原始 config 即可。
  if (options.autoInit !== false && config.appKey) {
    void coreCtx.init(config)
  }

  async function logout(): Promise<void> {
    // core 侧：SDK 登出 + 事件 dispose + client/presence/userInfo store 清理
    await coreCtx.logout()
    // 场景侧：会话/消息/联系人/群组 store 清理
    stores.conversation.clearConversations()
    stores.message.clearMessages()
    stores.contact.clearContacts()
    stores.group.clearGroups()
    // 清理模块级单例：多选状态与草稿缓存（跨登录会话不应残留）
    resetMultiSelectState()
    clearAllDrafts()
  }

  const ctx: UIKitContext = {
    client: coreCtx.client,
    domains,
    stores,
    features: coreCtx.features,
    dataSource: coreCtx.dataSource,
    capabilities: coreCtx.capabilities,
    noticeConfig: coreCtx.noticeConfig,
    h5: coreCtx.h5,
    theme: coreCtx.theme,
    init: coreCtx.init,
    login: coreCtx.login,
    logout,
  }

  provide(UIKIT_CONTEXT_KEY, ctx)

  // 好友申请/群邀请本地持久化：按登录用户 + appKey 隔离，仅保留 pending 状态
  // 与 address-book-container / contact-notice-list 中显式调用的 useInvitePersistence 共用同一 storage key，
  // 避免 provider 级与组件级两套独立机制导致数据不一致。
  // 使用 Internal 版本直接传入 stores，避免在 Provider 自身内部调用 useUIKit()（inject 无法在当前组件命中）
  useInvitePersistenceInternal(computed(() => ctx.features.enableInvitePersistence ?? true), stores)

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
