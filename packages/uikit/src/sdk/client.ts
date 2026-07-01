import {
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  ChatClient as SdkChatClient,
} from 'easemob-websdk'
import type { InitConfig } from 'easemob-websdk'

/**
 * UIKit 需要使用的 SDK 管理器集合。
 * Domain/事件层依赖此接口，避免直接依赖 UIKitClient 类（其私有字段会导致结构类型推断问题）。
 */
export interface ManagerHost {
  /** SDK ChatManager */
  readonly chatManager: ChatManager
  /** SDK ContactManager */
  readonly contactManager: ContactManager
  /** SDK GroupManager */
  readonly groupManager: GroupManager
  /** SDK PresenceManager */
  readonly presenceManager: PresenceManager
  /** 当前登录用户 ID（未登录时为 null） */
  readonly currentUserId: string | null
}

/**
 * UIKitClient 初始化配置。
 * 在 SDK InitConfig 基础上增加 UIKit 专属开关。
 */
export interface ClientConfig extends InitConfig {
  /** 是否开启 SDK 调试日志 */
  debug?: boolean
}

/** SDK 已注册管理器映射 */
interface ManagerRegistry {
  chatManager: ChatManager
  contactManager: ContactManager
  groupManager: GroupManager
  presenceManager: PresenceManager
}

/**
 * UIKit 对 SDK ChatClient 的轻量包装。
 *
 * 职责：
 * 1. 初始化 SDK 并注册必要的 managers
 * 2. 暴露 login / logout 生命周期
 * 3. 通过 getter 暴露 managers 给 Domain 层
 *
 * 不直接封装业务 API，业务语义由 Domain 层处理。
 */
export class UIKitClient {
  private _client: SdkChatClient & ManagerRegistry

  constructor(config: ClientConfig) {
    const { debug, ...sdkConfig } = config
    this._client = SdkChatClient.init({
      ...sdkConfig,
      managers: [ChatManager, ContactManager, GroupManager, PresenceManager],
    }) as SdkChatClient & ManagerRegistry

    if (debug) {
      import('easemob-websdk').then(({ setLogLevel }) => {
        setLogLevel('DEBUG')
      })
    }
  }

  /** SDK ChatManager */
  get chatManager() {
    return this._client.chatManager
  }

  /** SDK ContactManager */
  get contactManager() {
    return this._client.contactManager
  }

  /** SDK GroupManager */
  get groupManager() {
    return this._client.groupManager
  }

  /** SDK PresenceManager */
  get presenceManager() {
    return this._client.presenceManager
  }

  /** 当前连接状态 */
  get connectionState() {
    return this._client.getConnectionState()
  }

  /** 当前登录用户 ID */
  get currentUserId() {
    return this._client.getCurrentUserId()
  }

  /** 登录 SDK */
  async login(userId: string, token: string) {
    return this._client.login({ userId, token })
  }

  /** 登出 SDK */
  async logout() {
    return this._client.logout()
  }
}

/** 创建 UIKitClient 实例 */
export function createClient(config: ClientConfig): UIKitClient {
  return new UIKitClient(config)
}
