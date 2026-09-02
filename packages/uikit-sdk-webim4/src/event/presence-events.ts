import type { EasemobChat } from 'easemob-websdk-4'
import type { UiPresence } from '@easemob/uikit-sdk-contract'
import { createLogger } from '@easemob/uikit-sdk-contract'
import { parsePresenceStatus } from '../domain/presence-domain'
import type { EventStores } from './types'

const presenceLog = createLogger('UIKit:Webim4PresenceEvents')

/**
 * 创建 4.x 在线状态事件处理器。
 * 4.x `onPresenceStatusChange` 载荷（PresenceType[]）与 5.x 结构一致
 * （userId / statusDetails[{device,status}] / ext / lastTime），解析逻辑直接镜像 websdk5。
 */
export function createPresenceHandlers(stores: EventStores): Partial<EasemobChat.EventHandlerType> {
  return {
    onPresenceStatusChange: (list: EasemobChat.PresenceType[]) => {
      presenceLog.info('onPresenceStatusChange', { count: Array.isArray(list) ? list.length : 0 })
      if (!Array.isArray(list))
        return
      const mapped: UiPresence[] = list.map((item) => {
        const userId = item.userId || ''
        const details = Array.isArray(item.statusDetails) ? item.statusDetails : []
        const isOnline = details.some(d => Number(d?.status) === 1)
        const ext = item.ext || ''
        return {
          userId,
          status: parsePresenceStatus(isOnline, ext),
          ext,
          lastTime: item.lastTime || Date.now(),
        }
      }).filter(p => !!p.userId)
      stores.presence.updateBatch(mapped)
    },
  }
}
