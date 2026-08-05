import {
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  ChatClient as SdkChatClient,
  UserInfoManager,
} from 'easemob-websdk'
import type { ConnectionEventHandlerMap, EventHandlerMap, InitConfig } from 'easemob-websdk'
import { log } from '../utils/logger'

declare const __EASEMOB_SDK_VERSION__: string
declare const __EASEMOB_UIKIT_VERSION__: string

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
  /** SDK PushManager（免打扰等推送设置） */
  readonly pushManager: PushManager
  /** SDK UserInfoManager */
  readonly userInfoManager: UserInfoManager
  /** 当前登录用户 ID（未登录时为 null） */
  readonly currentUserId: string | null
  /** 注册连接级事件处理器（委托到底层 ChatClient） */
  addEventHandler: (id: string, handlers: ConnectionEventHandlerMap) => void
  /** 注销连接级事件处理器 */
  removeEventHandler: (id: string) => void
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
  pushManager: PushManager
  userInfoManager: UserInfoManager
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
  private _deleteConversationOnGroupDestroyed: boolean

  constructor(config: ClientConfig) {
    const { debug, ...sdkConfig } = config
    // 与 SDK 默认值保持一致：群组解散时自动删除本地群会话
    this._deleteConversationOnGroupDestroyed = sdkConfig.deleteConversationOnGroupDestroyed ?? true
    this._client = SdkChatClient.init({
      ...sdkConfig,
      // 登录后自动同步的数据类型；默认同步会话/联系人/群（SDK 默认仅 conversation）。
      // 'contact' 依赖 UserInfoManager 的 userInfo:read 能力，'group' 依赖 GroupManager。
      enableSyncData: sdkConfig.enableSyncData ?? ['conversation', 'contact', 'group'],
      // 启用用户资料同步增强：SDK 在消息链路中补齐发送者资料，
      // 并结合联系人备注、用户资料和群名片更新 ConversationItem.conversationName /
      // SessionMessageSnippet.sender，减少上层 patchConversationNames 的手动补全调用。
      enableUserInfoSync: sdkConfig.enableUserInfoSync ?? true,
      managers: [ChatManager, ContactManager, GroupManager, PresenceManager, PushManager, UserInfoManager],
    }) as SdkChatClient & ManagerRegistry

    if (debug) {
      import('easemob-websdk').then(({ setLogLevel }) => {
        setLogLevel('DEBUG')
      })
    }

    log(
      '%c[Easemob] SDK version: %s, UIKit version: %s',
      'color: green; font-weight: bold;',
      __EASEMOB_SDK_VERSION__,
      __EASEMOB_UIKIT_VERSION__,
    )
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

  /** SDK PushManager */
  get pushManager() {
    return this._client.pushManager
  }

  /** SDK UserInfoManager */
  get userInfoManager() {
    return this._client.userInfoManager
  }

  /** 当前连接状态 */
  get connectionState() {
    return this._client.getConnectionState()
  }

  /**
   * 群组解散时是否自动删除对应的本地群会话。
   * 与 SDK `InitConfig.deleteConversationOnGroupDestroyed` 保持一致，
   * UIKit 事件层据此决定是否清理本地会话/消息，避免覆盖 SDK 行为。
   */
  get deleteConversationOnGroupDestroyed() {
    return this._deleteConversationOnGroupDestroyed
  }

  /** 当前登录用户 ID */
  get currentUserId() {
    return this._client.getCurrentUserId()
  }

  /** 注册连接级事件处理器（委托到底层 ChatClient） */
  addEventHandler(id: string, handlers: ConnectionEventHandlerMap) {
    this._client.addEventHandler(id, handlers as EventHandlerMap)
  }

  /** 注销连接级事件处理器 */
  removeEventHandler(id: string) {
    this._client.removeEventHandler(id)
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
