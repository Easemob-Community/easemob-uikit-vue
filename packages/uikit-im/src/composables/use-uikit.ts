import { type ComputedRef, type InjectionKey, type Ref, computed, inject, provide } from 'vue'
import { ChatManager, ContactManager, GroupManager, PresenceManager, PushManager, UserInfoManager } from 'easemob-websdk'
import type { ClientConfig, ConnectionEventCallbacks, H5AdaptationConfig, ManagerHost, NoticeConfig, UIKitClient, UIKitDataSource, UIKitFeatures, useH5Adaptation, useThemeStore } from '@easemob/uikit-core'
import { useCoreUIKitProvider } from '@easemob/uikit-core'
import type {
  PresenceDomain,
  UserInfoDomain,
} from '../sdk/domain'
import {
  ContactDomain,
  ConversationDomain,
  GroupDomain,
  MessageDomain,
} from '../sdk/domain'
import { registerEventHandlers } from '../sdk/event/registry'
import { useMessageStore } from '../store/message'
import { useConversationStore } from '../store/conversation'
import { useContactStore } from '../store/contact'
import { useGroupStore } from '../store/group'
import type { RootStores } from '../sdk/event/types'
import { resolveUserDisplayName } from '../utils/resolve-last-message-text'
import { clearAllDrafts } from './use-conversation'
import { resetMultiSelectState } from './use-message-actions'
import { useInvitePersistenceInternal } from './use-invite-persistence'

// 构建期注入：@easemob/uikit-im 包版本（vite define，见 vite.config.ts）
declare const __EASEMOB_UIKIT_VERSION__: string

export type { UIKitDataSource, UIKitFeatures, ContactFetchMode } from '@easemob/uikit-core'
export type { H5AdaptationConfig } from '@easemob/uikit-core'

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

/**
 * IM 场景的 SDK manager 注册列表。
 * core 不静态 import manager 类（tree-shaking 约束），由场景包在此注入；
 * 不含 ChatRoomManager——IM 场景不使用聊天室能力，不注入可让消费者摇掉
 * websdk 的 chatroom manager 代码（websdk 5.x 按 manager 分 subpath、sideEffects:false）。
 */
const IM_SDK_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
]

/**
 * 注入 IM 场景默认 ClientConfig：全量 managers + 登录同步会话/联系人/群。
 * 业务方经 sdkConfig 显式传入时以业务配置为准（覆盖默认）。
 */
function resolveClientConfig(config: ClientConfig): ClientConfig {
  return {
    ...config,
    managers: config.managers ?? IM_SDK_MANAGERS,
    // 登录后自动同步的数据类型；默认同步会话/联系人/群（SDK 默认仅 conversation）。
    // 'contact' 依赖 UserInfoManager 的 userInfo:read 能力，'group' 依赖 GroupManager。
    enableSyncData: config.enableSyncData ?? ['conversation', 'contact', 'group'],
  }
}

/**
 * 初始化 UIKit Provider。
 * 在 <UIKitProvider> 组件的 setup 中调用。
 *
 * 客户端生命周期 / core stores / presence & userInfo domain 由
 * `@easemob/uikit-core` 的 useCoreUIKitProvider 承接；本层只组合
 * 场景 stores/domains、场景事件注册与场景级登出清理。
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
  // 场景 stores（message / conversation / contact / group）；
  // core stores（client / presence / userInfo）由 core provider 创建
  const sceneStores = {
    message: useMessageStore(),
    conversation: useConversationStore(),
    contact: useContactStore(),
    group: useGroupStore(),
  }

  // core provider：承接 client 生命周期、core stores/domains、features/dataSource/noticeConfig/h5/theme。
  // autoInit 一律置 false，立即初始化改在下方显式触发——
  // 确保 onClientSetup 闭包在首次执行时已能拿到 coreCtx（features 代理）。
  // clientName/clientVersion：场景包版本注入，客户端版本日志输出 SDK + UIKit-IM + Core 三版本。
  // resolveClientConfig：IM 默认 managers/enableSyncData 注入下沉到 core setupClient，
  // auto-init 与 useClient().init() 延迟初始化路径统一生效。
  const coreCtx = useCoreUIKitProvider(config, {
    ...options,
    autoInit: false,
    clientName: 'UIKit-IM',
    clientVersion: __EASEMOB_UIKIT_VERSION__,
    resolveClientConfig,
    onClientSetup: (client, coreStores) =>
      registerEventHandlers(client, { ...sceneStores, ...coreStores }, options.connectionCallbacks, coreCtx.features),
  })

  const stores: RootStores = {
    ...sceneStores,
    presence: coreCtx.stores.presence,
    client: coreCtx.stores.client,
    userInfo: coreCtx.stores.userInfo,
  }

  const host = coreCtx.client.value

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
    presence: coreCtx.domains.presence,
    userInfo: coreCtx.domains.userInfo,
  }

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey（语义同 core 的 auto-init）。
  // IM 默认 managers/enableSyncData 由 core setupClient 内的 resolveClientConfig 钩子补齐，
  // 此处与延迟初始化（ctx.init）均传原始 config 即可。
  if (options.autoInit !== false && config.appKey) {
    coreCtx.init(config)
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
