import {
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  PushManager,
  UserInfoManager,
} from 'easemob-websdk'
import type {
  SdkAdapter,
  SdkCapabilities,
  SdkConfig,
} from '@easemob/uikit-sdk-contract'
import type { ClientConfig, UIKitClient } from './client'
import { createClient } from './client'

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
 * easemob-websdk@5.x 适配器。
 *
 * 生命周期所有权（主计划决策 18，单一所有者，禁止半注入）：
 * - 内置模式：UIKit 全权（本实例内部创建 client，login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（`new Websdk5Adapter(connection)`，UIKit 只订阅事件 + 借实例操作）。
 */
export class Websdk5Adapter implements SdkAdapter {
  readonly capabilities: SdkCapabilities = {
    combineMessage: true,
    pinnedMessage: true,
    streamingMessage: true,
    groupReadReceipt: true,
  }

  private _client: UIKitClient | null = null

  constructor(private injectedClient?: UIKitClient) {}

  /** 原生 SDK 客户端实例（UIKitClient 包装，可选） */
  get client(): UIKitClient | null {
    return this._client
  }

  /** 当前连接是否就绪（Domain 层短路守卫用） */
  get isConnected(): boolean {
    return this._client?.isConnected ?? false
  }

  async init(config: SdkConfig): Promise<void> {
    const adapterCfg = (config.adapterConfig ?? {}) as Partial<ClientConfig>
    this._client = this.injectedClient ?? createClient({
      appKey: config.appKey,
      debug: config.debug,
      managers: adapterCfg.managers ?? WEBSDK5_MANAGERS,
      ...adapterCfg,
    })
  }

  async login(user: string, token: string): Promise<void> {
    if (!this._client)
      throw new Error('[Websdk5Adapter] 尚未初始化，请先调用 init()')
    await this._client.login(user, token)
  }

  async logout(): Promise<void> {
    await this._client?.logout()
  }

  subscribe(): () => void {
    // TODO（事件迁移轮次落地）：注册连接级 + 各 manager 事件并翻译为中立事件回调
    return () => {}
  }

  readonly message: never = undefined as never
  readonly conversation: never = undefined as never
  readonly contact: never = undefined as never
  readonly group: never = undefined as never
  readonly presence: never = undefined as never
}
