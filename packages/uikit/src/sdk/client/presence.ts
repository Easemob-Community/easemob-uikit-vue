import type { ClientCore } from './index'

/**
 * 在线状态相关 API 服务
 */
export class PresenceService {
  constructor(private core: ClientCore) {}

  /** 订阅在线状态变更 */
  async subscribePresence(userIds: string[], expiry = 7 * 24 * 60 * 60) {
    return this.core.presenceManager.subscribePresence({
      userIds,
      expiry,
    })
  }

  /** 取消订阅在线状态 */
  async unsubscribePresence(userIds: string[]) {
    return this.core.presenceManager.unsubscribePresence({ userIds })
  }

  /** 主动获取在线状态 */
  async getPresenceStatus(userIds: string[]) {
    return this.core.presenceManager.getPresenceStatus({ userIds })
  }

  /** 发布自定义在线状态 */
  async publishPresence(description: string) {
    /**
     * @see SDK_DEFICIENCY: PublishPresenceParams 类型未从 easemob-websdk 主入口导出，
     * 此处使用内联对象字面量。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.core.presenceManager.publishPresence({ customStatus: description } as any)
  }
}
