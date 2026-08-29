import type { SdkCapabilities } from './capabilities'
import type { SdkConfig } from './config'
import type { SdkDomainSet } from './domains'
import type { SdkEventHandlers } from './events'
import type {
  ContactRepository,
  ConversationRepository,
  GroupRepository,
  MessageRepository,
  PresenceRepository,
  UserInfoRepository,
} from './repository'

/**
 * 中立 SDK 适配器接口：两代 adapter（websdk5 / webim4）共同实现。
 * uikit-im 依赖本契约，不感知具体 adapter——切 SDK = 换注入的 adapter。
 *
 * 生命周期所有权（主计划决策 18，单一所有者，禁止半注入）：
 * - 内置模式：UIKit 全权（login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（UIKit 只订阅事件 + 借实例操作，绝不替业务 login/logout/dispose）。
 * 具体 adapter 实现据此选择行为，复杂度封死在适配层边界，不扩散到 UI 层。
 */
export interface SdkAdapter {
  init(config: SdkConfig): Promise<void>
  login(user: string, token: string): Promise<void>
  logout(): Promise<void>
  /** 订阅中立事件，返回取消订阅函数 */
  subscribe(handlers: SdkEventHandlers): () => void
  /** 当前登录用户 ID（未登录时为空字符串） */
  readonly currentUserId: string
  /** 当前是否已建立连接 */
  readonly isConnected: boolean
  readonly capabilities: SdkCapabilities
  readonly message: MessageRepository
  readonly conversation: ConversationRepository
  readonly contact: ContactRepository
  readonly group: GroupRepository
  readonly presence: PresenceRepository
  readonly userInfo: UserInfoRepository
  /**
   * 业务域对象（中立 Domain Port，见 domains.ts）。
   * uikit-im / uikit-core 的 UI 层经此消费既有 Domain API。
   */
  readonly domains: SdkDomainSet
  /**
   * 原生 SDK 实例（可选，`unknown` 类型）。
   * 需要强类型原生 SDK 的深度调用放 adapter 包内 helper，不让 uikit-im 公开类型带原生 SDK 类型
   * （主计划决策 19）。
   */
  readonly client?: unknown
}
