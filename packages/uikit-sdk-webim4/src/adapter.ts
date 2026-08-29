import type {
  SdkAdapter,
  SdkCapabilities,
  SdkConfig,
} from '@easemob/uikit-sdk-contract'
import { Webim4Client } from './client'

/**
 * easemob-websdk@4.x 适配器（私有化 / 存量 4.x）。
 *
 * 生命周期所有权（主计划决策 18，单一所有者）：
 * - 内置模式：UIKit 全权（本实例内部构造 connection，login/logout/dispose 归 UIKit）；
 * - 注入模式：业务全权（`new Webim4Adapter(connection)`，UIKit 只订阅事件 + 借实例操作）。
 */
export class Webim4Adapter implements SdkAdapter {
  readonly capabilities: SdkCapabilities = {
    combineMessage: true,
    pinnedMessage: true,
    streamingMessage: true,
    groupReadReceipt: true,
  }

  private _client: Webim4Client | null = null

  constructor(private injectedClient?: Webim4Client) {}

  /** 底层 4.x 客户端包装（可选） */
  get client(): Webim4Client | null {
    return this._client
  }

  async init(config: SdkConfig): Promise<void> {
    this._client = this.injectedClient ?? new Webim4Client(config.appKey)
  }

  async login(user: string, token: string): Promise<void> {
    if (!this._client)
      throw new Error('[Webim4Adapter] 尚未初始化，请先调用 init()')
    await this._client.login(user, token)
  }

  async logout(): Promise<void> {
    await this._client?.logout()
  }

  subscribe(): () => void {
    // TODO（事件迁移轮次落地）：connection.addEventHandler → 中立事件回调
    return () => {}
  }

  readonly message: never = undefined as never
  readonly conversation: never = undefined as never
  readonly contact: never = undefined as never
  readonly group: never = undefined as never
  readonly presence: never = undefined as never
}
