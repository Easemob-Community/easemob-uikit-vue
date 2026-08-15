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
import { log } from '../utils/logger'
import { setSdkDebugGuard } from '../utils/sdk-log-capture'

declare const __EASEMOB_SDK_VERSION__: string
declare const __EASEMOB_UIKIT_CORE_VERSION__: string

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
  /**
   * SDK manager 注册列表（继承 InitConfig.managers）。
   * **由场景包注入**：core 不静态 import 任何 manager 类——websdk 5.x 是 sideEffects:false 且按
   * manager 分 subpath 的 ESM，场景包只传自己需要的 manager，消费者 bundler 才能摇掉无关
   * manager 代码（如聊天室场景不传 Contact/Group/PushManager）。
   * 未注入时构造抛错，不做静默默认。
   */
  managers?: InitConfig['managers']
  /**
   * 场景包名称（如 'UIKit-IM' / 'UIKit-Chatroom'），仅用于客户端版本日志展示，默认 'UIKit'。
   * 由场景包 Provider 注入，业务方无需关心。
   */
  clientName?: string
  /**
   * 场景包版本号（如 '2.0.0'），仅用于客户端版本日志展示；未提供时日志只输出 SDK + Core 版本。
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
    // clientName / clientVersion 是场景包注入的日志展示字段，不传给 SDK InitConfig
    const { debug, clientName = 'UIKit', clientVersion, ...sdkConfig } = config
    // manager 列表必须由场景包注入（见 ClientConfig.managers 注释）：
    // core 若静态 import manager 类，所有场景的消费者都无法 tree-shake 无关 manager。
    if (!sdkConfig.managers?.length) {
      throw new Error(
        '[UIKit] ClientConfig.managers 未注入：SDK manager 列表由场景包 Provider 负责传入'
        + '（如 IM 场景传 ChatManager/ContactManager/GroupManager/PresenceManager/PushManager/UserInfoManager，'
        + '聊天室场景传 ChatManager/ChatRoomManager/UserInfoManager）。',
      )
    }
    // 与 SDK 默认值保持一致：群组解散时自动删除本地群会话
    this._deleteConversationOnGroupDestroyed = sdkConfig.deleteConversationOnGroupDestroyed ?? true
    this._client = SdkChatClient.init({
      ...sdkConfig,
      // 登录后自动同步的数据类型由场景包决定（IM 场景注入 conversation/contact/group；
      // 聊天室场景无需任何同步），core 不做场景化默认值。
      // enableSyncData: 见场景包注入
      // 启用用户资料同步增强：SDK 在消息链路中补齐发送者资料，
      // 并结合联系人备注、用户资料和群名片更新 ConversationItem.conversationName /
      // SessionMessageSnippet.sender，减少上层 patchConversationNames 的手动补全调用。
      enableUserInfoSync: sdkConfig.enableUserInfoSync ?? true,
      managers: sdkConfig.managers,
      // managers 为场景注入的宽类型（ReadonlyArray<ManagerRegistration<unknown>>），
      // SDK 无法据此推断出具体 manager 映射，经 unknown 断言为完整 ManagerRegistry；
      // 运行时字段存在性由场景包的注入列表保证（未注册的 manager 访问即 undefined，场景代码不使用）。
    }) as unknown as SdkChatClient & ManagerRegistry

    if (debug) {
      _sdkDebugEnabled = true
      import('easemob-websdk').then(({ setLogLevel }) => {
        setLogLevel('DEBUG')
      })
    }

    // 版本日志：场景包注入 clientName/clientVersion 时输出三版本（SDK + 场景包 + Core），
    // 否则输出 SDK + Core（core 独立使用场景）
    if (clientVersion) {
      log(
        '%c[Easemob] SDK version: %s, %s version: %s, Core version: %s',
        'color: green; font-weight: bold;',
        __EASEMOB_SDK_VERSION__,
        clientName,
        clientVersion,
        __EASEMOB_UIKIT_CORE_VERSION__,
      )
    }
    else {
      log(
        '%c[Easemob] SDK version: %s, Core version: %s',
        'color: green; font-weight: bold;',
        __EASEMOB_SDK_VERSION__,
        __EASEMOB_UIKIT_CORE_VERSION__,
      )
    }
  }

  /** SDK ChatManager */
  get chatManager() {
    return this._client.chatManager
  }

  /** SDK ChatRoomManager（聊天室场景；core 统一注册，单群聊场景不使用） */
  get chatRoomManager() {
    return this._client.chatRoomManager
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
