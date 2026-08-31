import type { PresenceInfo, PresenceRepository, UiPresence } from '@easemob/uikit-sdk-contract'
import { PRESENCE_STATUS } from '@easemob/uikit-sdk-contract'
import type { ManagerHost } from '../client'

/**
 * PresenceStore 需要暴露给 Domain 的最小接口。
 */
export interface PresenceStoreLike {
  updateBatch: (list: UiPresence[]) => void
  setSubscribed: (userIds: string[]) => void
}

/**
 * 根据是否在线与 ext 扩展字段解析 UIKit 展示状态。
 * 当 isOnline 为 false 时，无论 ext 为何值均返回 offline；
 * 在线时优先匹配多端统一常量，未命中则视为自定义状态。
 */
export function parsePresenceStatus(isOnline: boolean, ext: string): UiPresence['status'] {
  if (!isOnline)
    return 'offline'
  if (!ext)
    return 'online'
  const lower = ext.toLowerCase()
  const onlineValue = PRESENCE_STATUS.ONLINE.toLowerCase()
  const awayValue = PRESENCE_STATUS.AWAY.toLowerCase()
  const busyValue = PRESENCE_STATUS.BUSY.toLowerCase()
  const dndValue = PRESENCE_STATUS.DO_NOT_DISTURB.toLowerCase()
  const offlineValue = PRESENCE_STATUS.OFFLINE.toLowerCase()
  if (lower === onlineValue)
    return 'online'
  if (lower === awayValue)
    return 'away'
  if (lower === busyValue)
    return 'busy'
  if (lower === dndValue)
    return 'doNotDisturb'
  if (lower === offlineValue)
    return 'offline'
  return 'custom'
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
  return {
    userId,
    status: parsePresenceStatus(isOnline, ext),
    ext,
    lastTime: item.latestTime || Date.now(),
  }
}

/** PresenceDomain 装配选项 */
export interface PresenceDomainOptions {
  /**
   * 在线状态数据入口接管注入：消费 `subscribe` / `unsubscribe` / `fetchStatus`
   * 三个读/订阅方法（业务源可能不依赖 SDK 连接，委托先于 isConnected 守卫）；
   * `publish` 保持 SDK 直连。未注入时全部走 SDK 默认路径（行为零变化）。
   */
  presenceRepository?: Partial<PresenceRepository>
}

/**
 * 在线状态业务域：封装 SDK PresenceManager 能力。
 */
export class PresenceDomain {
  constructor(
    private client: ManagerHost,
    private store: PresenceStoreLike,
    private options: PresenceDomainOptions = {},
  ) {}

  /** 订阅用户在线状态 */
  async subscribe(userIds: string[], expiry = 7 * 24 * 60 * 60): Promise<UiPresence[]> {
    // 数据入口接管：业务源自备订阅通道时整体委托（不触碰 SDK 与 store）
    const repo = this.options.presenceRepository?.subscribe
    if (repo) {
      await repo(userIds, expiry)
      return []
    }
    // 未连接时不发起请求（SDK 未就绪时调用会报错/空转）
    if (!this.client.isConnected) {
      return []
    }
    const result = await this.client.presenceManager.subscribePresence({
      userIds,
      expiry,
    })
    this.store.setSubscribed(userIds)
    const mapped = result
      .map(toUiPresence)
      .filter((p): p is UiPresence => p !== null)
    this.store.updateBatch(mapped)
    return mapped
  }

  /** 取消订阅 */
  async unsubscribe(userIds: string[]) {
    const repo = this.options.presenceRepository?.unsubscribe
    if (repo) {
      await repo(userIds)
      return
    }
    if (!this.client.isConnected) {
      return
    }
    await this.client.presenceManager.unsubscribePresence({ userIds })
  }

  /** 主动查询在线状态 */
  async fetchStatus(userIds: string[]): Promise<UiPresence[]> {
    // 数据入口接管：注入实现返回中立 UiPresence 列表，与 SDK 路径一样写入 store
    const repo = this.options.presenceRepository?.fetchStatus
    if (repo) {
      const list = await repo(userIds)
      this.store.updateBatch(list)
      return list
    }
    if (!this.client.isConnected) {
      return []
    }
    const result = await this.client.presenceManager.getPresenceStatus({ userIds })
    const mapped = result
      .map(toUiPresence)
      .filter((p): p is UiPresence => p !== null)
    this.store.updateBatch(mapped)
    return mapped
  }

  /** 发布自定义在线状态 */
  async publish(description: string) {
    if (!this.client.isConnected) {
      return
    }
    await this.client.presenceManager.publishPresence({ customStatus: description })
  }
}
