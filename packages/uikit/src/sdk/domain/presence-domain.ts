import type { ManagerHost } from '../client'
import type { UiPresence } from '../types'

/**
 * PresenceStore 需要暴露给 Domain 的最小接口。
 */
export interface PresenceStoreLike {
  updateBatch(list: UiPresence[]): void
  setSubscribed(userIds: string[]): void
}

/**
 * 在线状态业务域：封装 SDK PresenceManager 能力。
 */
export class PresenceDomain {
  constructor(
    private client: ManagerHost,
    private store: PresenceStoreLike,
  ) {}

  /** 订阅用户在线状态 */
  async subscribe(userIds: string[], expiry = 7 * 24 * 60 * 60) {
    const result = await this.client.presenceManager.subscribePresence({
      userIds,
      expiry,
    })
    this.store.setSubscribed(userIds)
    return result
  }

  /** 取消订阅 */
  async unsubscribe(userIds: string[]) {
    await this.client.presenceManager.unsubscribePresence({ userIds })
  }

  /** 主动查询在线状态 */
  async fetchStatus(userIds: string[]) {
    return this.client.presenceManager.getPresenceStatus({ userIds })
  }

  /** 发布自定义在线状态 */
  async publish(description: string) {
    await this.client.presenceManager.publishPresence({ customStatus: description })
  }
}
