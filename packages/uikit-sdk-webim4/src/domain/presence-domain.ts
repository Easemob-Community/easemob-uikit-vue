import type { EasemobChat } from 'easemob-websdk'
import type { PresenceRepository, UiPresence } from '@easemob/uikit-sdk-contract'
import { PRESENCE_STATUS, createLogger } from '@easemob/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import type { PresenceStoreLike } from '../event/types'

const presenceDomainLog = createLogger('UIKit:Webim4PresenceDomain')

/** 解包 4.x AsyncResult（data/entities 二选一承载） */
function unwrap<T>(res: EasemobChat.AsyncResult<T>): T {
  return (res?.data ?? res?.entities) as T
}

/**
 * 根据是否在线与 ext 扩展字段解析 UIKit 展示状态。
 * 复刻 websdk5 presence-domain / core parsePresenceStatus 语义（禁跨包 import，本包内复刻）：
 * 当 isOnline 为 false 时，无论 ext 为何值均返回 offline；
 * 在线时优先匹配多端统一常量，未命中则视为自定义状态。
 */
export function parsePresenceStatus(isOnline: boolean, ext: string): UiPresence['status'] {
  if (!isOnline)
    return 'offline'
  if (!ext)
    return 'online'
  const lower = ext.toLowerCase()
  if (lower === PRESENCE_STATUS.ONLINE.toLowerCase())
    return 'online'
  if (lower === PRESENCE_STATUS.AWAY.toLowerCase())
    return 'away'
  if (lower === PRESENCE_STATUS.BUSY.toLowerCase())
    return 'busy'
  if (lower === PRESENCE_STATUS.DO_NOT_DISTURB.toLowerCase())
    return 'doNotDisturb'
  if (lower === PRESENCE_STATUS.OFFLINE.toLowerCase())
    return 'offline'
  return 'custom'
}

/**
 * 将 4.x SubscribePresence（subscribePresence/getPresenceStatus 返回项）映射为 UIKit 展示对象。
 * 4.x 字段：`uid` 发布者、`status` 设备→状态值映射（1 在线）、`ext` 扩展、`last_time` 更新时间。
 */
function toUiPresence(item: EasemobChat.SubscribePresence): UiPresence | null {
  const userId = item?.uid || ''
  if (!userId)
    return null
  const statusMap = (item.status ?? {}) as Record<string, number>
  const isOnline = Object.values(statusMap).some(status => Number(status) === 1)
  const ext = item.ext || ''
  return {
    userId,
    status: parsePresenceStatus(isOnline, ext),
    ext,
    lastTime: item.last_time || Date.now(),
  }
}

function toUiPresenceList(result?: EasemobChat.SubscribePresenceResult): UiPresence[] {
  return (result?.result ?? [])
    .map(toUiPresence)
    .filter((p): p is UiPresence => p !== null)
}

/** PresenceDomain 装配选项 */
export interface PresenceDomainOptions {
  /**
   * 在线状态数据入口接管注入（与 websdk5 同构）：消费 `subscribe` / `unsubscribe` /
   * `fetchStatus` 三个读/订阅方法（业务源可能不依赖 SDK 连接，委托先于 isConnected
   * 守卫）；`publish` 保持 SDK 直连。未注入时全部走 SDK 默认路径（行为零变化）。
   */
  presenceRepository?: Partial<PresenceRepository>
}

/**
 * 在线状态业务域（4.x）：presence API 挂单一 `connection`（无 PresenceManager 拆分）。
 */
export class PresenceDomain {
  constructor(
    private client: Webim4Client,
    private store: PresenceStoreLike,
    private options: PresenceDomainOptions = {},
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4PresenceDomain] connection 尚未初始化')
    return conn
  }

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
    const res = await this.connection.subscribePresence({
      usernames: userIds,
      expiry,
    })
    this.store.setSubscribed(userIds)
    const mapped = toUiPresenceList(unwrap(res))
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
    await this.connection.unsubscribePresence({ usernames: userIds })
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
    const res = await this.connection.getPresenceStatus({ usernames: userIds })
    const mapped = toUiPresenceList(unwrap(res))
    this.store.updateBatch(mapped)
    return mapped
  }

  /** 发布自定义在线状态（4.x publishPresence 参数为 description） */
  async publish(description: string) {
    if (!this.client.isConnected) {
      return
    }
    presenceDomainLog.info('publish', { description })
    await this.connection.publishPresence({ description })
  }
}

export type { PresenceStoreLike }
