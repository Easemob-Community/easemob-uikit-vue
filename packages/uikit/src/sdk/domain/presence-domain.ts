import type { PresenceInfo } from 'easemob-websdk'
import type { ManagerHost } from '../client'
import type { UiPresence } from '../types'

/**
 * PresenceStore 需要暴露给 Domain 的最小接口。
 */
export interface PresenceStoreLike {
  updateBatch: (list: UiPresence[]) => void
  setSubscribed: (userIds: string[]) => void
}

/**
 * 将 SDK PresenceInfo 映射为 UIKit 展示对象。
 */
function toUiPresence(item: PresenceInfo): UiPresence | null {
  const userId = item.publisher || ''
  if (!userId)
    return null
  const statusList = item.statusList || {}
  const isOnline = Object.values(statusList).some(status => Number(status) === 1)
  const ext = item.ext || ''
  let status: UiPresence['status'] = isOnline ? 'online' : 'offline'
  if (ext) {
    const lower = ext.toLowerCase()
    if (lower.includes('away'))
      status = 'away'
    else if (lower.includes('busy'))
      status = 'busy'
    else if (isOnline)
      status = 'custom'
  }
  return {
    userId,
    status,
    ext,
    lastTime: item.latestTime || Date.now(),
  }
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
    const mapped = result
      .map(toUiPresence)
      .filter((p): p is UiPresence => p !== null)
    this.store.updateBatch(mapped)
    return result
  }

  /** 取消订阅 */
  async unsubscribe(userIds: string[]) {
    await this.client.presenceManager.unsubscribePresence({ userIds })
  }

  /** 主动查询在线状态 */
  async fetchStatus(userIds: string[]) {
    const result = await this.client.presenceManager.getPresenceStatus({ userIds })
    const mapped = result
      .map(toUiPresence)
      .filter((p): p is UiPresence => p !== null)
    this.store.updateBatch(mapped)
    return result
  }

  /** 发布自定义在线状态 */
  async publish(description: string) {
    await this.client.presenceManager.publishPresence({ customStatus: description })
  }
}
