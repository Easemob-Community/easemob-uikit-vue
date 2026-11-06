import {
  ChatManager,
  ChatRoomManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
} from 'easemob-websdk'
import type {
  ContactRepository,
  ConversationRepository,
  GroupRepository,
  LastMessageTextResolver,
  MessageRepository,
  PresenceRepository,
  SdkAdapter,
  SdkCapabilities,
  SdkConfig,
  SdkEventHandlers,
  SdkPersistenceHooks,
  SdkRepositoryOverrides,
  UIKitDataSource,
  UIKitFeatures,
  UserInfoRepository,
} from '@easemob-community/uikit-sdk-contract'
import { SDK_CONTRACT_VERSION, createLogger, normalizeLoginUserId } from '@easemob-community/uikit-sdk-contract'
import type { ClientConfig, UIKitClient } from './client'
import { createClient } from './client'
import { createInternalStores } from './adapter/internal-stores'
import { getDefaultFeatures, legacyDataSourceToUserInfoRepository } from './adapter/config'
import { createContactRepository } from './adapter/repositories/contact'
import { createConversationRepository } from './adapter/repositories/conversation'
import { createGroupRepository } from './adapter/repositories/group'
import { createMessageRepository } from './adapter/repositories/message'
import { createPresenceRepository } from './adapter/repositories/presence'
import { createUserInfoRepository } from './adapter/repositories/user-info'
import { MessageDomain } from './domain/message-domain'
import { ConversationDomain } from './domain/conversation-domain'
import { ContactDomain } from './domain/contact-domain'
import { GroupDomain } from './domain/group-domain'
import { PresenceDomain } from './domain/presence-domain'
import { UserInfoDomain } from './domain/user-info-domain'
import { registerEventHandlers } from './event/registry'
import { ensureEventHandlerDeps, setEventHandlerDeps } from './event/deps'
import type { EventHandlerDeps } from './event/deps'
import type { EventStores } from './event/types'
import { setSyncStatusListener } from './use-sync-status'
import { formatSdkError } from './utils/sdk-error'

const adapterLog = createLogger('UIKit:Websdk5Adapter')

/**
 * IM 场景默认 SDK manager 注册列表（不含 ChatRoomManager）。
 * 聊天室场景（chatroom 包）经 `SdkConfig.adapterConfig.managers` 透传注入
 * ChatManager/ChatRoomManager/UserInfoManager（见主计划决策 15）。
 */
export const WEBSDK5_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
]

/**
 * 聊天室场景 SDK manager 注册列表（只含 Chat/ChatRoom/UserInfo）。
 * 经 `SdkConfig.adapterConfig.managerPreset = 'chatroom'` 启用：
 * 场景包（uikit-chatroom）只传预设名，不直接 import SDK manager 类，
 * easemob-websdk 的 import 保持封在本包内。
 */
export const WEBSDK5_CHATROOM_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ChatRoomManager,
  UserInfoManager,
]

/** manager 预设名（adapterConfig.managerPreset） */
export type Websdk5ManagerPreset = 'im' | 'chatroom'

/**
 * easemob-websdk@5.x 适配器。
 *
 * 生命周期所有权（主计划决策 18，单一所有者，禁止半注入）：
 * - 内置模式：UIKit 全权（本实例内部创建 client，login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（`new Websdk5Adapter(connection)`，UIKit 只订阅事件 + 借实例操作）。
 */
export class Websdk5Adapter implements SdkAdapter {
  readonly capabilities: SdkCapabilities = {
    combineMessage: true,
    multiBodyMessage: true,
    pinnedMessage: true,
    streamingMessage: true,
    groupReadReceipt: true,
    // 本 adapter 遵循的契约版本（协商机制见 contract capabilities.ts）
    contractVersion: SDK_CONTRACT_VERSION,
  }

  private _client: UIKitClient | null = null
  private _domains?: {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
  }

  private _userInfoDomain?: UserInfoDomain
  private _stores?: EventStores
  private _features?: UIKitFeatures
  /** 中立事件订阅者集合（支持多方订阅，扇出派发） */
  private _handlersSet = new Set<SdkEventHandlers>()
  private _fanout?: SdkEventHandlers
  private _disposeEventHandlers?: () => void
  private _disposeSyncListener?: () => void
  /** SDK 事件处理器是否已注册（logout 后置 false，login 前重建） */
  private _eventsRegistered = false
  /** 是否注册 IM 事件套件（聊天室场景关闭，见 adapterConfig.registerImEvents） */
  private _registerImEvents = true
  /** 旁路持久化钩子（init 记账，事件处理器登出重建时仍需透传） */
  private _persistence?: SdkPersistenceHooks
  /** 业务消息摘要解析器（init 记账，本地会话与事件重建共用） */
  private _lastMessageTextResolver?: LastMessageTextResolver
  /** 登录超时（毫秒，init 记账；SDK 5.1.2+ login 参数，缺省走 SDK 默认 30s） */
  private _loginTimeoutMs?: number

  constructor(private injectedClient?: UIKitClient) {}

  /** 原生 SDK 客户端实例（UIKitClient 包装，可选） */
  get client(): UIKitClient | null {
    return this._client
  }

  /** 当前登录用户 ID（未登录时为空字符串） */
  get currentUserId(): string {
    return this._client?.currentUserId ?? ''
  }

  /** 当前连接是否就绪（Domain 层短路守卫用） */
  get isConnected(): boolean {
    return this._client?.isConnected ?? false
  }

  /** 业务域对象集合：供 uikit-im / uikit-core 直接消费既有 Domain API */
  get domains(): {
    message: MessageDomain
    conversation: ConversationDomain
    contact: ContactDomain
    group: GroupDomain
    presence: PresenceDomain
    userInfo: UserInfoDomain
  } {
    if (!this._domains || !this._userInfoDomain)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return { ...this._domains, userInfo: this._userInfoDomain }
  }

  async init(config: SdkConfig): Promise<void> {
    const adapterCfg = (config.adapterConfig ?? {}) as Partial<ClientConfig> & {
      /** UIKit 功能开关（live 对象引用，事件层运行时读取最新值） */
      features?: UIKitFeatures
      /**
       * 旧版业务数据源接管（@deprecated，仅兼容直连 adapter 的旧调用方，
       * 且仅消费 fetchUserInfos）：core 装配已改为把 dataSource 翻译成
       * `SdkConfig.repositories` 注入；新接入请直接用 repositories。
       */
      dataSource?: UIKitDataSource
      /**
       * 事件层 store 注入：Provider 模式传入 Pinia stores（结构兼容 EventStores），
       * 事件与 Domain 直接写入业务 store；未提供的域回落到 adapter 内置 store
       *（内置 store 会把写入翻译成 SdkEventHandlers 中立事件扇出）。
       */
      stores?: Partial<EventStores>
      /** 事件层依赖（i18n / 通知 / 系统通知插入），由 core/im 在 init 时注入 */
      eventDeps?: EventHandlerDeps
      /** 用户资料订阅无权限/服务未开通回调 */
      onUserInfoSubscriptionPermissionError?: () => void
      /**
       * 是否注册 IM 事件套件（连接/消息/联系人/群/在线状态 → EventStores），默认 true。
       * 聊天室场景（无 Contact/Group/Presence/Push manager）必须显式传 false，
       * 场景事件改经 core onAdapterReady 挂钩自行注册。
       */
      registerImEvents?: boolean
      /** manager 预设：'im'（默认）| 'chatroom'；显式传 managers 数组时优先 */
      managerPreset?: Websdk5ManagerPreset
      /**
       * 数据入口接管注入（Phase 3.1 留口子）：core 归一化会把 SdkConfig.repositories
       * 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，两处都读。
       */
      repositories?: SdkRepositoryOverrides
      /**
       * 旁路持久化钩子注入（只写不读）：core 归一化会把 SdkConfig.persistence
       * 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，两处都读。
       */
      persistence?: SdkPersistenceHooks
      /** 业务消息摘要解析器，完整消息与 SessionMessageSnippet 共用 */
      lastMessageTextResolver?: LastMessageTextResolver
    }
    // clientCfg 仅保留 SDK 初始化字段，剥离 features/stores/eventDeps 等 adapter 装配字段
    const {
      features,
      dataSource,
      stores: providedStores,
      eventDeps,
      onUserInfoSubscriptionPermissionError,
      registerImEvents,
      managerPreset,
      repositories: adapterRepositories,
      persistence: adapterPersistence,
      lastMessageTextResolver,
      ...clientCfg
    } = adapterCfg
    // 数据入口接管：SdkConfig 顶层字段优先（直连 adapter 场景），core 归一化下沉的 adapterConfig 次之
    const repositories = config.repositories ?? adapterRepositories
    // 旁路持久化：同 repositories 读取方式（SdkConfig 顶层优先，adapterConfig 下沉次之）
    const persistence = config.persistence ?? adapterPersistence
    this._persistence = persistence
    this._lastMessageTextResolver = lastMessageTextResolver
    this._loginTimeoutMs = config.loginTimeoutMs

    // 应用身份：appKey / appId 二选一（SDK 5.1+ 支持 appId 初始化）；
    // 透传槽中的身份字段剥离，以契约顶层字段为准
    const { appKey: _cfgAppKey, appId: _cfgAppId, ...clientCfgRest } = clientCfg
    let identity: { appKey: string } | { appId: string }
    if (config.appKey)
      identity = { appKey: config.appKey }
    else if (config.appId)
      identity = { appId: config.appId }
    else if (this.injectedClient)
      identity = { appKey: '' } // 注入模式不使用该参数，仅满足类型
    else
      throw new Error('[Websdk5Adapter] 缺少应用身份：SdkConfig.appKey 与 SdkConfig.appId 必须提供其一')

    this._client = this.injectedClient ?? createClient({
      debug: config.debug,
      managers: clientCfg.managers ?? (managerPreset === 'chatroom' ? WEBSDK5_CHATROOM_MANAGERS : WEBSDK5_MANAGERS),
      ...clientCfgRest,
      ...identity,
    })

    if (eventDeps)
      setEventHandlerDeps(eventDeps)

    this._features = features ?? getDefaultFeatures()
    this._registerImEvents = registerImEvents !== false

    // 注入的 store 域：未注入的域回落 adapter 内置 store（写入经中立事件扇出）。
    // 排查「事件在跑但 UI 不更新」时先看这里——多半是对应域的 store 没注入。
    const injectedStoreDomains = providedStores ? Object.keys(providedStores) : []
    adapterLog.info('[Websdk5Adapter] init 开始', {
      mode: this.injectedClient ? 'injected-client' : 'builtin',
      managerPreset: managerPreset ?? 'im',
      registerImEvents: this._registerImEvents,
      injectedStores: injectedStoreDomains,
    })
    if (injectedStoreDomains.length < 7) {
      const allDomains = ['client', 'message', 'conversation', 'contact', 'group', 'presence', 'userInfo']
      adapterLog.debug(
        '[Websdk5Adapter] 以下 store 域未注入，回落 adapter 内置 store：',
        allDomains.filter(d => !injectedStoreDomains.includes(d)),
      )
    }

    const handlersRef = () => this._getFanout()
    const internalStores = createInternalStores(this, handlersRef)
    // Provider 注入的 store 覆盖内置实现：事件层与 Domain 直接写业务 Pinia store，
    // 行为与旧 registerEventHandlers 直连模式一致；未注入的域仍走内置 store + 中立事件。
    const stores = { ...internalStores, ...(providedStores as EventStores) }
    this._stores = stores

    this._domains = {
      message: new MessageDomain(this._client, stores.message, {
        messageRepository: repositories?.message,
        persistence: persistence?.message,
      }),
      conversation: new ConversationDomain(this._client, stores.conversation, {
        sendPendingReadReceipts: (conversationId, conversationType) => {
          // enableReadReceipt 关闭时不补发已读回执（Prod 集群已读回执问题临时止血开关）
          if (this._features?.enableReadReceipt === false)
            return
          void this._domains?.message.sendPendingReadReceipts(conversationId, conversationType)
        },
        resolveSenderName: (userId) => {
          const contact = stores.contact.getContact(userId)
          if (contact?.remark || contact?.name)
            return contact.remark || contact.name
          return stores.userInfo.getUserInfo(userId)?.nickname
        },
        lastMessageTextResolver: this._lastMessageTextResolver,
        conversationRepository: repositories?.conversation,
        persistence: persistence?.conversation,
      }),
      contact: new ContactDomain(this._client, stores.contact, {
        contactRepository: repositories?.contact,
      }),
      group: new GroupDomain(this._client, stores.group, {
        groupRepository: repositories?.group,
      }),
      presence: new PresenceDomain(this._client, stores.presence, {
        presenceRepository: repositories?.presence,
      }),
    }

    // 用户资料域：内部监听 SDK 用户资料变更事件，通过 userInfo store 触发 onUserInfoChanged
    // 数据入口注入优先取 repositories.userInfo；旧 adapterConfig.dataSource 直连仅兼容兜底
    this._userInfoDomain = new UserInfoDomain(
      this._client,
      stores.userInfo,
      repositories?.userInfo ?? legacyDataSourceToUserInfoRepository(dataSource) ?? {},
      onUserInfoSubscriptionPermissionError
      ?? (() => adapterLog.warn('[Websdk5Adapter] 用户资料订阅无权限，已自动熔断')),
    )
    this._userInfoDomain.listen()

    // SDK 事件处理器随初始化注册（旧 setupClient 语义）；logout 后由 login 重建
    this._setupEventHandlers()
    adapterLog.info('[Websdk5Adapter] init 完成')
  }

  async login(user: string, token: string): Promise<void> {
    if (!this._client)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    // 登出后再登录：事件处理器与用户资料监听已在登出时 dispose，需在重新建立连接前恢复注册
    if (!this._eventsRegistered) {
      adapterLog.debug('[Websdk5Adapter] 登出后重新登录，恢复事件处理器与用户资料监听')
      this._userInfoDomain?.listen()
      this._setupEventHandlers()
    }
    const normalizedUser = normalizeLoginUserId(user)
    if (normalizedUser !== user) {
      adapterLog.warn('[Websdk5Adapter] 检测到登录 userId 包含大写字母，已强制转换为纯小写后继续登录', {
        originalUserId: user,
        normalizedUserId: normalizedUser,
      })
    }
    adapterLog.info('[Websdk5Adapter] login 开始', { user: normalizedUser })
    // 提前记账 currentUser：SDK 连接建立瞬间即可推送消息（典型：服务端 REST 下发的
    // 欢迎语在 login resolve 前经 onMessage 到达），事件层 toUiMessage / 清未读 / @我 /
    // 通知过滤均依赖 currentUser，等到 login resolve 再记账会留下空串竞态窗口；
    // 失败时在 catch 中回滚清空。内置 store 的 currentUser 派生自 adapter.currentUserId（可选方法）。
    this._stores?.client.setCurrentUser?.(normalizedUser)
    try {
      await this._client.login(normalizedUser, token, this._loginTimeoutMs)
    }
    catch (err) {
      this._stores?.client.setCurrentUser?.('')
      adapterLog.error('[Websdk5Adapter] login 失败:', formatSdkError(err))
      throw err
    }
    adapterLog.info('[Websdk5Adapter] login 成功', { user: normalizedUser })
  }

  async logout(): Promise<void> {
    adapterLog.info('[Websdk5Adapter] logout')
    await this._client?.logout()
    this._domains?.message.clearMultiBodyRetryCache()
    // dispose 事件处理器 / 同步状态监听 / 用户资料监听（旧 registerClientSetup 清理链）
    this._disposeEventHandlers?.()
    this._disposeEventHandlers = undefined
    this._disposeSyncListener?.()
    this._disposeSyncListener = undefined
    this._userInfoDomain?.dispose()
    this._eventsRegistered = false
  }

  /** 订阅中立事件，返回取消订阅函数（支持多方订阅，内部扇出派发） */
  subscribe(handlers: SdkEventHandlers): () => void {
    this._handlersSet.add(handlers)
    return () => {
      this._handlersSet.delete(handlers)
    }
  }

  /** 扇出派发：把同一次内部 store 写入翻译给全部订阅者 */
  private _getFanout(): SdkEventHandlers {
    if (!this._fanout) {
      const set = this._handlersSet
      this._fanout = new Proxy({} as SdkEventHandlers, {
        get: (_target, key) => (...args: unknown[]) => {
          for (const h of set) {
            const fn = (h as Record<string, unknown>)[key as string]
            if (typeof fn === 'function')
              (fn as (...a: unknown[]) => void)(...args)
          }
        },
      })
    }
    return this._fanout
  }

  private _setupEventHandlers(): void {
    if (!this._client || !this._stores)
      return
    // 聊天室等场景可关闭 IM 事件套件（manager 未注入时注册会崩），
    // 场景事件改经 core onAdapterReady 挂钩自行注册
    if (!this._registerImEvents) {
      adapterLog.debug('[Websdk5Adapter] IM 事件套件已关闭（registerImEvents=false），场景事件由业务经 onAdapterReady 自行注册')
      return
    }

    ensureEventHandlerDeps()

    this._disposeSyncListener?.()
    this._disposeSyncListener = setSyncStatusListener((payload) => {
      this._getFanout().onSyncStatus?.(payload)
    })

    this._disposeEventHandlers?.()
    this._disposeEventHandlers = registerEventHandlers(
      this._client,
      this._stores,
      {
        onTokenWillExpire: () => this._getFanout().onTokenWillExpire?.(),
        onTokenExpired: () => this._getFanout().onTokenExpired?.(),
      },
      this._features,
      this._persistence,
      this._lastMessageTextResolver,
    )
    this._eventsRegistered = true
    adapterLog.debug('[Websdk5Adapter] SDK 事件处理器已注册')
  }

  get message(): MessageRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createMessageRepository({ message: this._domains.message, conversation: this._domains.conversation })
  }

  get conversation(): ConversationRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createConversationRepository(this._domains.conversation)
  }

  get contact(): ContactRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createContactRepository(this._domains.contact)
  }

  get group(): GroupRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createGroupRepository(this._domains.group)
  }

  get presence(): PresenceRepository {
    if (!this._domains)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createPresenceRepository(this._domains.presence)
  }

  get userInfo(): UserInfoRepository {
    if (!this._userInfoDomain)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    return createUserInfoRepository(this._userInfoDomain)
  }
}
