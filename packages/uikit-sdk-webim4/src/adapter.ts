import type {
  ContactRepository,
  ConversationRepository,
  GroupRepository,
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
import { CONVERSATION_TYPE, SDK_CONTRACT_VERSION, createLogger, normalizeLoginUserId } from '@easemob-community/uikit-sdk-contract'
import type { Webim4Client, Webim4ConnectionParameters } from './client'
import { createClient, setSdkLogLevel } from './client'
import { createInternalStores } from './adapter/internal-stores'
import { getDefaultFeatures, legacyDataSourceToUserInfoRepository } from './adapter/config'
import { createContactRepository } from './adapter/repositories/contact'
import { createConversationRepository } from './adapter/repositories/conversation'
import { createGroupRepository } from './adapter/repositories/group'
import { createMessageRepository } from './adapter/repositories/message'
import { createPresenceRepository } from './adapter/repositories/presence'
import { createUserInfoRepository } from './adapter/repositories/user-info'
import { MessageDomain } from './domain/message-domain'
import type { ConversationProfile, ConversationProfileTarget } from './domain/conversation-domain'
import { ConversationDomain } from './domain/conversation-domain'
import { ContactDomain } from './domain/contact-domain'
import { GroupDomain } from './domain/group-domain'
import { PresenceDomain } from './domain/presence-domain'
import { UserInfoDomain } from './domain/user-info-domain'
import { registerEventHandlers } from './event/registry'
import { ensureEventHandlerDeps, setEventHandlerDeps } from './event/deps'
import type { EventHandlerDeps } from './event/deps'
import type { EventStores } from './event/types'
import { setSyncStatus, setSyncStatusListener } from './use-sync-status'

const adapterLog = createLogger('UIKit:Webim4Adapter')

/**
 * easemob-websdk@4.x 适配器（存量 4.x）。
 *
 * 生命周期所有权（主计划决策 18，单一所有者，禁止半注入）：
 * - 内置模式：UIKit 全权（本实例内部构造 connection，login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（`new Webim4Adapter(connection)`，UIKit 只订阅事件 + 借实例操作）。
 */
export class Webim4Adapter implements SdkAdapter {
  readonly capabilities: SdkCapabilities = {
    combineMessage: true,
    multiBodyMessage: false,
    pinnedMessage: true,
    streamingMessage: true,
    groupReadReceipt: true,
    meta: {
      multiBodyMessage: { reason: 'websdk 4.x 不提供 multi_body；本 adapter 不支持复合消息' },
    },
    // 本 adapter 遵循的契约版本（协商机制见 contract capabilities.ts）
    contractVersion: SDK_CONTRACT_VERSION,
  }

  private _client: Webim4Client | null = null
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
  /** 登录成功后是否预取联系人/群列表（adapterConfig.prefetchOnLogin，默认 true） */
  private _prefetchOnLogin = true
  /** 中立事件订阅者集合（支持多方订阅，扇出派发） */
  private _handlersSet = new Set<SdkEventHandlers>()
  private _fanout?: SdkEventHandlers
  private _disposeEventHandlers?: () => void
  private _disposeSyncListener?: () => void
  /** SDK 事件处理器是否已注册（logout 后置 false，login 前重建） */
  private _eventsRegistered = false
  /** 旁路持久化钩子（init 时从 SdkConfig/adapterConfig 读取，透传 domain 与事件层） */
  private _persistence?: SdkPersistenceHooks

  constructor(private injectedClient?: Webim4Client) {}

  /** 底层 4.x 客户端包装（可选） */
  get client(): Webim4Client | null {
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
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return { ...this._domains, userInfo: this._userInfoDomain }
  }

  async init(config: SdkConfig): Promise<void> {
    const adapterCfg = (config.adapterConfig ?? {}) as Partial<Webim4ConnectionParameters> & {
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
       * 登录成功后是否按 features 主动预取联系人/群列表（默认 true）。
       * 4.x 无 5.x 的 roster 自动同步通道（无 onSyncDataFinished），由 adapter 代偿，
       * 对齐 5.x「进联系人页前 store 已填好」的体感；关闭后退回进页面懒加载。
       */
      prefetchOnLogin?: boolean
      /**
       * 数据入口接管注入（Phase 3.1 留口子）：core 归一化会把 SdkConfig.repositories
       * 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，两处都读。
       */
      repositories?: SdkRepositoryOverrides
      /**
       * 旁路持久化钩子（Electron 本地库 SQLite 留口子）：core 归一化会把
       * SdkConfig.persistence 下沉到这里；直连 adapter 时也可走 SdkConfig 顶层字段，
       * 两处都读（读取方式与 repositories 一致）。
       */
      persistence?: SdkPersistenceHooks
    }
    // 4.x 无 managers/managerPreset/registerImEvents 装配字段（能力挂单一 connection），
    // 剥离 features/dataSource/stores/eventDeps 等 adapter 装配字段后，
    // 剩余字段（clientCfg）原样透传给 `new WebIM.connection(...)`——
    // 4.x 原生 ConnectionParameters（apiUrl/url/isHttpDNS/delivery/deviceId/
    // autoReconnectNumMax/useOwnUploadFun 等，自建服务的连接配置即经此下发），adapter 不裁剪。
    const {
      features,
      dataSource,
      stores: providedStores,
      eventDeps,
      onUserInfoSubscriptionPermissionError,
      prefetchOnLogin,
      repositories: adapterRepositories,
      persistence: adapterPersistence,
      ...clientCfg
    } = adapterCfg

    this._prefetchOnLogin = prefetchOnLogin ?? true
    // 数据入口接管：SdkConfig 顶层字段优先（直连 adapter 场景），core 归一化下沉的 adapterConfig 次之
    const repositories = config.repositories ?? adapterRepositories
    // 旁路持久化：读取方式与 repositories 一致（顶层优先，adapterConfig 次之）
    this._persistence = config.persistence ?? adapterPersistence

    // 4.x 仅支持 appKey 初始化；SDK 5.1+ 的 appId 模式在 webim4 下不可用
    let appKey = config.appKey
    if (!appKey) {
      if (this.injectedClient)
        appKey = '' // 注入模式不使用该参数，仅满足类型
      else
        throw new Error('[Webim4Adapter] 缺少 SdkConfig.appKey：SDK 4.x 仅支持 appKey 初始化（appId 初始化为 SDK 5.1+ 能力，webim4 不支持）')
    }

    this._client = this.injectedClient ?? createClient({ appKey, ...clientCfg })

    // 中立 debug 字段 → 4.x 日志级别（对齐 websdk5 的 setLogLevel('DEBUG') 语义）
    if (config.debug)
      setSdkLogLevel('DEBUG')

    if (eventDeps)
      setEventHandlerDeps(eventDeps)

    this._features = features ?? getDefaultFeatures()

    // 注入的 store 域：未注入的域回落 adapter 内置 store（写入经中立事件扇出）。
    // 排查「事件在跑但 UI 不更新」时先看这里——多半是对应域的 store 没注入。
    const injectedStoreDomains = providedStores ? Object.keys(providedStores) : []
    adapterLog.info('[Webim4Adapter] init 开始', {
      mode: this.injectedClient ? 'injected-client' : 'builtin',
      injectedStores: injectedStoreDomains,
    })
    if (injectedStoreDomains.length < 7) {
      const allDomains = ['client', 'message', 'conversation', 'contact', 'group', 'presence', 'userInfo']
      adapterLog.debug(
        '[Webim4Adapter] 以下 store 域未注入，回落 adapter 内置 store：',
        allDomains.filter(d => !injectedStoreDomains.includes(d)),
      )
    }

    const handlersRef = () => this._getFanout()
    const internalStores = createInternalStores(this, handlersRef)
    // Provider 注入的 store 覆盖内置实现：事件层与 Domain 直接写业务 Pinia store，
    // 行为与旧 registerEventHandlers 直连模式一致；未注入的域仍走内置 store + 中立事件。
    const stores = { ...internalStores, ...(providedStores as EventStores) }
    this._stores = stores

    const groupDomain = new GroupDomain(this._client, stores.group, {
      groupRepository: repositories?.group,
    })

    // 用户资料域：4.x 无资料变更事件，listen() 为空实现，仅为生命周期对齐
    // 数据入口注入优先取 repositories.userInfo；旧 adapterConfig.dataSource 直连仅兼容兜底
    this._userInfoDomain = new UserInfoDomain(
      this._client,
      stores.userInfo,
      repositories?.userInfo ?? legacyDataSourceToUserInfoRepository(dataSource) ?? {},
      onUserInfoSubscriptionPermissionError
      ?? (() => adapterLog.warn('[Webim4Adapter] 用户资料订阅无权限，已自动熔断')),
    )
    const userInfoDomain = this._userInfoDomain

    /**
     * 会话资料批量补全（4.x 会话项不含名称/头像，主计划 2.8）：
     * - 单聊：收集 userId 批量 fetchUserInfos，再从 userInfo store 读昵称/头像；
     * - 群聊：优先 group store 缓存，未命中走 groupDomain.fetchGroupInfo 取群名
     *   （4.x 群资料无头像字段，avatar 留空）；
     * - 单项失败仅 warn，不阻断整批补全。
     */
    const fetchConversationProfiles = async (
      targets: ConversationProfileTarget[],
    ): Promise<ConversationProfile[]> => {
      const profiles: ConversationProfile[] = []
      const singleChatIds = targets
        .filter(t => t.type === CONVERSATION_TYPE.SINGLECHAT)
        .map(t => t.id)
      if (singleChatIds.length > 0) {
        try {
          await userInfoDomain.fetchUserInfos(singleChatIds)
        }
        catch (err) {
          adapterLog.warn('[Webim4Adapter] 会话资料补全：批量拉取用户资料失败', err)
        }
        for (const id of singleChatIds) {
          const info = stores.userInfo.getUserInfo(id)
          profiles.push({ id, name: info?.nickname, avatar: info?.avatarUrl })
        }
      }
      for (const target of targets) {
        if (target.type !== CONVERSATION_TYPE.GROUPCHAT)
          continue
        try {
          const cached = stores.group.getGroupById(target.id)
          const group = cached?.groupName ? cached : await groupDomain.fetchGroupInfo(target.id)
          profiles.push({ id: target.id, name: group?.groupName })
        }
        catch (err) {
          adapterLog.warn('[Webim4Adapter] 会话资料补全：拉取群信息失败', { groupId: target.id, error: err })
        }
      }
      return profiles
    }

    this._domains = {
      message: new MessageDomain(this._client, stores.message, {
        messageRepository: repositories?.message,
        messagePersistence: this._persistence?.message,
      }),
      conversation: new ConversationDomain(this._client, stores.conversation, {
        sendPendingReadReceipts: (conversationId, conversationType) => {
          void this._domains?.message.sendPendingReadReceipts(conversationId, conversationType)
        },
        resolveSenderName: (userId) => {
          const contact = stores.contact.getContact(userId)
          if (contact?.remark || contact?.name)
            return contact.remark || contact.name
          return stores.userInfo.getUserInfo(userId)?.nickname
        },
        fetchConversationProfiles,
        getLastMessageId: (conversationId) => {
          const list = stores.message.getMessages(conversationId)
          return list[list.length - 1]?.msgServerId
        },
        conversationRepository: repositories?.conversation,
        conversationPersistence: this._persistence?.conversation,
      }),
      contact: new ContactDomain(this._client, stores.contact, {
        contactRepository: repositories?.contact,
      }),
      group: groupDomain,
      presence: new PresenceDomain(this._client, stores.presence, {
        presenceRepository: repositories?.presence,
      }),
    }

    this._userInfoDomain.listen()

    // SDK 事件处理器随初始化注册；logout 后由 login 重建
    this._setupEventHandlers()
    adapterLog.info('[Webim4Adapter] init 完成')
  }

  async login(user: string, token: string): Promise<void> {
    if (!this._client)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    // 登出后再登录：事件处理器与用户资料监听已在登出时 dispose，需在重新建立连接前恢复注册
    if (!this._eventsRegistered) {
      adapterLog.debug('[Webim4Adapter] 登出后重新登录，恢复事件处理器与用户资料监听')
      this._userInfoDomain?.listen()
      this._setupEventHandlers()
    }
    const normalizedUser = normalizeLoginUserId(user)
    if (normalizedUser !== user) {
      adapterLog.warn('[Webim4Adapter] 检测到登录 userId 包含大写字母，已强制转换为纯小写后继续登录', {
        originalUserId: user,
        normalizedUserId: normalizedUser,
      })
    }
    adapterLog.info('[Webim4Adapter] login 开始', { user: normalizedUser })
    // 提前记账 currentUser：SDK 连接建立瞬间即可推送消息（典型：服务端 REST 下发的
    // 欢迎语在 login resolve 前经 onMessage 到达），事件层 toUiMessage / 清未读 / @我 /
    // 通知过滤均依赖 currentUser，等到 login resolve 再记账会留下空串竞态窗口；
    // 失败时在 catch 中回滚清空。内置 store 的 currentUser 派生自 adapter.currentUserId（可选方法）。
    this._stores?.client.setCurrentUser?.(normalizedUser)
    try {
      await this._client.login(normalizedUser, token)
    }
    catch (err) {
      this._stores?.client.setCurrentUser?.('')
      adapterLog.error('[Webim4Adapter] login 失败:', err)
      throw err
    }
    adapterLog.info('[Webim4Adapter] login 成功', { user: normalizedUser })
    // 4.x 无 5.x 的 roster 自动同步通道（无 onSyncDataFinished），登录后由 adapter 代偿预取
    if (this._prefetchOnLogin)
      void this._prefetchRosterAfterLogin()
  }

  /**
   * 登录后预取联系人/群列表（SDK 差异收敛在 adapter）：
   * 5.x 靠 SDK 登录后自动同步 + onSyncDataFinished 回填 store；4.x 无此通道，
   * 由 adapter 在 login 成功后按 features 开关触发既有 domain 同步（内部并发去重、
   * 失败不锁定、可重试），并补发 contact/group 中立同步状态事件，
   * 保证 useSyncStatus 两条 SDK 线行为一致。
   * fire-and-forget：不阻塞 login 返回；单域失败不影响另一域。
   */
  private async _prefetchRosterAfterLogin(): Promise<void> {
    const domains = this._domains
    const features = this._features
    if (!domains || !features)
      return
    const jobs: Promise<void>[] = []
    if (features.enableContact) {
      jobs.push((async () => {
        setSyncStatus('contact', { status: 'syncing' })
        const ok = await domains.contact.syncFromServer()
        setSyncStatus('contact', ok
          ? { status: 'success', finishedAt: Date.now() }
          : { status: 'failed', error: { stage: 'prefetch', retryable: true, message: 'getAllContacts 失败' } })
      })())
    }
    if (features.enableGroup) {
      jobs.push((async () => {
        setSyncStatus('group', { status: 'syncing' })
        try {
          await domains.group.refreshJoinedGroups()
          setSyncStatus('group', { status: 'success', finishedAt: Date.now() })
        }
        catch (err) {
          adapterLog.warn('[Webim4Adapter] 登录后预取群列表失败:', err)
          setSyncStatus('group', { status: 'failed', error: { stage: 'prefetch', retryable: true, message: String(err) } })
        }
      })())
    }
    await Promise.all(jobs)
  }

  async logout(): Promise<void> {
    adapterLog.info('[Webim4Adapter] logout')
    await this._client?.logout()
    // dispose 事件处理器 / 同步状态监听 / 用户资料监听
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
    )
    this._eventsRegistered = true
    adapterLog.debug('[Webim4Adapter] SDK 事件处理器已注册')
  }

  get message(): MessageRepository {
    if (!this._domains)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createMessageRepository({ message: this._domains.message, conversation: this._domains.conversation })
  }

  get conversation(): ConversationRepository {
    if (!this._domains)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createConversationRepository(this._domains.conversation)
  }

  get contact(): ContactRepository {
    if (!this._domains)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createContactRepository(this._domains.contact)
  }

  get group(): GroupRepository {
    if (!this._domains)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createGroupRepository(this._domains.group)
  }

  get presence(): PresenceRepository {
    if (!this._domains)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createPresenceRepository(this._domains.presence)
  }

  get userInfo(): UserInfoRepository {
    if (!this._userInfoDomain)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    return createUserInfoRepository(this._userInfoDomain)
  }
}
