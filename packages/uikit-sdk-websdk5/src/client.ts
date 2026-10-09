import { ChatClient as SdkChatClient } from 'easemob-websdk'
import type {
  ChatManager,
  ChatRoomManager,
  ConnectionEventHandlerMap,
  ContactManager,
  EventHandlerMap,
  GroupManager,
  InitConfig,
  PresenceManager,
  PushManager,
  UserInfoManager,
} from 'easemob-websdk'
import { log } from '@easemob-community/uikit-sdk-contract'
import { setSdkDebugGuard } from './utils/sdk-log-capture'

declare const __EASEMOB_SDK_VERSION__: string
declare const __EASEMOB_UIKIT_SDK_WEBSDK5_VERSION__: string

/**
 * UIKit 需要使用的 SDK 管理器集合。
 * Domain/事件层依赖此接口，避免直接依赖 UIKitClient 类（其私有字段会导致结构类型推断问题）。
 */
export interface ManagerHost {
  /** SDK ChatManager */
  readonly chatManager: ChatManager
  /** SDK ChatRoomManager（聊天室场景；core 统一注册，单群聊场景不使用） */
  readonly chatRoomManager: ChatRoomManager
  /** SDK ContactManager */
  readonly contactManager: ContactManager
  /** SDK GroupManager */
  readonly groupManager: GroupManager
  /** SDK PresenceManager */
  readonly presenceManager: PresenceManager
  /** SDK PushManager（免打扰等推送设置） */
  readonly pushManager: PushManager
  /** SDK UserInfoManager */
  readonly userInfoManager: UserInfoManager
  /** 当前登录用户 ID（未登录时为 null） */
  readonly currentUserId: string | null
  /**
   * 当前是否已建立连接（等价于 `connectionState === 'connected'`）。
   * Domain 层据此在未连接时短路，避免对未就绪的 SDK 发起无意义的网络请求。
   */
  readonly isConnected: boolean
  /** 注册连接级事件处理器（委托到底层 ChatClient） */
  addEventHandler: (id: string, handlers: ConnectionEventHandlerMap) => void
  /** 注销连接级事件处理器 */
  removeEventHandler: (id: string) => void
}

/** 跨联合分支的 Omit（InitConfig 自 SDK 5.1 起为 appKey/appId 二选一联合，普通 Omit 会丢失分支独有键） */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * UIKitClient 初始化配置。
 * 在 SDK InitConfig（appKey / appId 二选一联合，SDK 5.1+）基础上增加 UIKit 专属开关。
 */
export type ClientConfig = InitConfig & {
  /** 是否开启 SDK 调试日志 */
  debug?: boolean
  /**
   * SDK manager 注册列表（继承 InitConfig.managers）。
   * **由 adapter 注入**：adapter 静态 import 需要的 manager 类并注入，
   * 消费者 bundler 才能摇掉无关 manager 代码。
   * 未注入时构造抛错，不做静默默认。
   */
  managers?: InitConfig['managers']
  /**
   * 场景包名称（如 'UIKit-IM' / 'UIKit-Chatroom'），仅用于客户端版本日志展示，默认 'UIKit'。
   * 由场景包 Provider 注入，业务方无需关心。
   */
  clientName?: string
  /**
   * 场景包版本号，仅用于客户端版本日志展示；未提供时日志只输出 SDK + Adapter 版本。
   * 由场景包 Provider 注入（对应各自构建期版本宏），业务方无需关心。
   */
  clientVersion?: string
}

/** 是否有 client 实例以 debug 模式初始化（供 SDK 日志捕获模块判断级别恢复策略） */
let _sdkDebugEnabled = false

/** 当前是否处于 client debug 模式（SDK 日志级别被 client 提升至 DEBUG） */
export function isSdkDebugEnabled(): boolean {
  return _sdkDebugEnabled
}

/**
 * 最近一次成功传给 SDK 的规范化配置（不含 clientName/clientVersion 日志字段）。
 */
let activeClientConfig: DistributiveOmit<ClientConfig, 'clientName' | 'clientVersion'> | null = null

function alignClientConfig(config: DistributiveOmit<ClientConfig, 'clientName' | 'clientVersion'>): DistributiveOmit<ClientConfig, 'clientName' | 'clientVersion'> {
  const active = activeClientConfig
  if (!active)
    return config
  if (config.appKey !== active.appKey || config.appId !== active.appId) {
    throw new Error(
      `[UIKit] ClientConfig 应用身份（appKey=${config.appKey ?? '-'} / appId=${config.appId ?? '-'}）与已初始化的 SDK 单例（appKey=${active.appKey ?? '-'} / appId=${active.appId ?? '-'}）不一致：`
      + '同一应用内多个 UIKit 场景包必须使用同一个 appKey/appId（SDK 连接与事件总线是全局单例）。',
    )
  }
  const { managers: incomingManagers, ...rest } = config
  const differing: string[] = []
  for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
    if (JSON.stringify(rest[key]) !== JSON.stringify(active[key]))
      differing.push(key)
  }
  if (differing.length > 0) {
    log(
      '[UIKit] SDK 已初始化，本次 init 配置以首次初始化为准（忽略字段：%s）。',
      differing.join(', '),
    )
  }
  return { ...active, managers: incomingManagers }
}

// 注入 SDK 日志捕获模块的 debug 守卫，避免 capture 反向依赖本模块
setSdkDebugGuard(() => _sdkDebugEnabled)

/** SDK 已注册管理器映射 */
interface ManagerRegistry {
  chatManager: ChatManager
  chatRoomManager: ChatRoomManager
  contactManager: ContactManager
  groupManager: GroupManager
  presenceManager: PresenceManager
  pushManager: PushManager
  userInfoManager: UserInfoManager
}

/**
 * UIKit 对 SDK ChatClient 的轻量包装。
 */
export class UIKitClient {
  private _client: SdkChatClient & ManagerRegistry
  private _deleteConversationOnGroupDestroyed: boolean

  constructor(config: ClientConfig) {
    const { debug, clientName = 'UIKit', clientVersion, ...sdkConfig } = config
    if (!sdkConfig.managers?.length) {
      throw new Error(
        '[UIKit] ClientConfig.managers 未注入：SDK manager 列表由 adapter 负责传入',
      )
    }
    const effectiveConfig = alignClientConfig({
      ...sdkConfig,
      enableUserInfoSync: sdkConfig.enableUserInfoSync ?? true,
      managers: sdkConfig.managers,
    })
    this._deleteConversationOnGroupDestroyed = effectiveConfig.deleteConversationOnGroupDestroyed ?? true
    this._client = SdkChatClient.init(effectiveConfig) as unknown as SdkChatClient & ManagerRegistry
    activeClientConfig = effectiveConfig

    if (debug) {
      _sdkDebugEnabled = true
      import('easemob-websdk').then(({ setLogLevel }) => {
        setLogLevel('DEBUG')
      })
    }

    if (clientVersion) {
      log(
        '%c[Easemob] SDK version: %s, %s version: %s, Adapter version: %s',
        'color: green; font-weight: bold;',
        __EASEMOB_SDK_VERSION__,
        clientName,
        clientVersion,
        __EASEMOB_UIKIT_SDK_WEBSDK5_VERSION__,
      )
    }
    else {
      log(
        '%c[Easemob] SDK version: %s, Adapter version: %s',
        'color: green; font-weight: bold;',
        __EASEMOB_SDK_VERSION__,
        __EASEMOB_UIKIT_SDK_WEBSDK5_VERSION__,
      )
    }
  }

  get chatManager() {
    return this._client.chatManager
  }

  get chatRoomManager() {
    return this._client.chatRoomManager
  }

  get contactManager() {
    return this._client.contactManager
  }

  get groupManager() {
    return this._client.groupManager
  }

  get presenceManager() {
    return this._client.presenceManager
  }

  get pushManager() {
    return this._client.pushManager
  }

  get userInfoManager() {
    return this._client.userInfoManager
  }

  get connectionState() {
    return this._client.getConnectionState()
  }

  get isConnected() {
    return this._client.getConnectionState() === 'connected'
  }

  get deleteConversationOnGroupDestroyed() {
    return this._deleteConversationOnGroupDestroyed
  }

  get currentUserId() {
    return this._client.getCurrentUserId()
  }

  addEventHandler(id: string, handlers: ConnectionEventHandlerMap) {
    this._client.addEventHandler(id, handlers as EventHandlerMap)
  }

  removeEventHandler(id: string) {
    this._client.removeEventHandler(id)
  }

  async login(userId: string, token: string, timeoutMs?: number) {
    return this._client.login({ userId, token, ...(timeoutMs !== undefined ? { timeoutMs } : {}) })
  }

  async logout() {
    return this._client.logout()
  }
}

/** 创建 UIKitClient 实例 */
export function createClient(config: ClientConfig): UIKitClient {
  return new UIKitClient(config)
}
