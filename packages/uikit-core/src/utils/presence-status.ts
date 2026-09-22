import { PRESENCE_STATUS } from '@easemob-community/uikit-sdk-contract'

type PresenceDisplayStatus = 'online' | 'offline' | 'away' | 'busy' | 'doNotDisturb' | 'custom'

/**
 * 将在线状态原始描述解析为 UIKit 展示状态。
 * 与 adapter 侧逻辑保持一致，下沉到 core 供 usePresence 等通用层消费。
 */
export function parsePresenceStatus(isOnline: boolean, ext: string): PresenceDisplayStatus {
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
