import type { PresenceEventHandlerMap } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-core'
import { parsePresenceStatus } from '@easemob/uikit-core'
import type { UiPresence } from '@easemob/uikit-core'
import type { RootStores } from './types'

const presenceLog = createLogger('UIKit:PresenceEvents')

/**
 * 创建 PresenceManager 事件处理器。
 */
export function createPresenceHandlers(stores: RootStores): PresenceEventHandlerMap {
  return {
    onPresenceStatusChange: (list) => {
      presenceLog.info('onPresenceStatusChange', { count: Array.isArray(list) ? list.length : 0 })
      if (!Array.isArray(list))
        return
      const mapped: UiPresence[] = list.map((item) => {
        const userId = item.userId || ''
        const details = Array.isArray(item.statusDetails) ? item.statusDetails : []
        const isOnline = details.some((d: unknown) => Number((d as Record<string, unknown>)?.status) === 1)
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
