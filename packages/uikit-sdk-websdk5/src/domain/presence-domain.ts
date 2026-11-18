import type { PresenceInfo, PresenceRepository, UiPresence } from '@easemob-community/uikit-sdk-contract'
import { PRESENCE_STATUS, createLogger } from '@easemob-community/uikit-sdk-contract'
import type { ManagerHost } from '../client'

const logger = createLogger('UIKit:PresenceDomain')

/**
 * 服务端 presence 单次请求的 userIds 上限。
 * 与会话列表规模无关：千级会话订阅/查询必须分片，否则整批 400 illegal_argument。
 */
export const PRESENCE_REQUEST_BATCH_SIZE = 100

/** 按固定大小切分 userIds，保持原顺序 */
function chunkUserIds(userIds: string[], size: number): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < userIds.length; index += size)
    chunks.push(userIds.slice(index, index + size))
  return chunks
}

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
 *
 * 大型会话列表（千级单聊）会把全量 userIds 交给订阅/查询，服务端对单次请求有
 * 数量上限（实测 >700 直接 400 illegal_argument），因此三个批量方法统一按
 * {@link PRESENCE_REQUEST_BATCH_SIZE} 分片；单片失败不再让整批失败。
 */
export class PresenceDomain {
  constructor(
    private client: ManagerHost,
    private store: PresenceStoreLike,
    private options: PresenceDomainOptions = {},
  ) {}

  /** 订阅用户在线状态（>100 人自动分片；任一分片失败会在其余分片完成后抛出首个错误） */
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
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0)
      return []

    const collected: UiPresence[] = []
    let firstError: unknown
    const chunks = chunkUserIds(uniqueIds, PRESENCE_REQUEST_BATCH_SIZE)
    for (const chunk of chunks) {
      try {
        const result = await this.client.presenceManager.subscribePresence({
          userIds: chunk,
          expiry,
        })
        this.store.setSubscribed(chunk)
        const mapped = result
          .map(toUiPresence)
          .filter((p): p is UiPresence => p !== null)
        this.store.updateBatch(mapped)
        collected.push(...mapped)
      }
      catch (err) {
        if (firstError === undefined) {
          firstError = err
          logger.warn('[PresenceDomain] subscribePresence chunk failed:', {
            chunkSize: chunk.length,
            chunks: chunks.length,
          })
        }
        // 继续后续分片：不让一个异常分片阻断其余用户的状态
      }
    }
    if (firstError !== undefined)
      throw firstError
    return collected
  }

  /** 取消订阅（>100 人分片；清理语义，分片失败仅告警不抛出，避免调用方 void 时产生未处理拒绝） */
  async unsubscribe(userIds: string[]) {
    const repo = this.options.presenceRepository?.unsubscribe
    if (repo) {
      await repo(userIds)
      return
    }
    if (!this.client.isConnected) {
      return
    }
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    for (const chunk of chunkUserIds(uniqueIds, PRESENCE_REQUEST_BATCH_SIZE)) {
      try {
        await this.client.presenceManager.unsubscribePresence({ userIds: chunk })
      }
      catch (err) {
        logger.warn('[PresenceDomain] unsubscribePresence chunk failed:', {
          chunkSize: chunk.length,
          err,
        })
      }
    }
  }

  /** 主动查询在线状态（>100 人分片；任一分片失败会在其余分片完成后抛出首个错误） */
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
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0)
      return []

    const collected: UiPresence[] = []
    let firstError: unknown
    const chunks = chunkUserIds(uniqueIds, PRESENCE_REQUEST_BATCH_SIZE)
    for (const chunk of chunks) {
      try {
        const result = await this.client.presenceManager.getPresenceStatus({ userIds: chunk })
        const mapped = result
          .map(toUiPresence)
          .filter((p): p is UiPresence => p !== null)
        this.store.updateBatch(mapped)
        collected.push(...mapped)
      }
      catch (err) {
        if (firstError === undefined) {
          firstError = err
          logger.warn('[PresenceDomain] getPresenceStatus chunk failed:', {
            chunkSize: chunk.length,
            chunks: chunks.length,
          })
        }
      }
    }
    if (firstError !== undefined)
      throw firstError
    return collected
  }

  /** 发布自定义在线状态 */
  async publish(description: string) {
    if (!this.client.isConnected) {
      return
    }
    await this.client.presenceManager.publishPresence({ customStatus: description })
  }
}
