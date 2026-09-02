/** UIKit 在线状态展示类型 */
export interface UiPresence {
  userId: string
  status: 'online' | 'offline' | 'away' | 'busy' | 'doNotDisturb' | 'custom'
  ext?: string
  lastTime?: number
}

/** 中立在线状态业务对象（替代 SDK `PresenceInfo`） */
export interface PresenceInfo {
  /** 状态发布者（用户 ID） */
  readonly publisher: string
  /** 设备状态映射（key 为设备，value 为状态值） */
  readonly statusList: Readonly<Record<string, number>>
  /** 扩展描述字段 */
  readonly ext: string
  /** 最新更新时间（毫秒时间戳） */
  readonly latestTime: number
  /** 状态到期时间（毫秒时间戳） */
  readonly expiryTime: number
}
