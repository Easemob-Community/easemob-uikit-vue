import type { PresenceEventHandlerMap } from 'easemob-websdk'
import type { RootStores } from './types'
import type { UiPresence } from '../types'

/**
 * 创建 PresenceManager 事件处理器。
 */
export function createPresenceHandlers(stores: RootStores): PresenceEventHandlerMap {
  return {
    onPresenceStatusChange: (list) => {
      if (!Array.isArray(list)) return
      const mapped: UiPresence[] = list.map((item) => {
        const userId = item.userId || ''
        const details = Array.isArray(item.statusDetails) ? item.statusDetails : []
        const isOnline = details.some((d: unknown) => Number((d as Record<string, unknown>)?.status) === 1)
        const ext = item.ext || ''
        let status: UiPresence['status'] = isOnline ? 'online' : 'offline'
        if (ext) {
          const lower = ext.toLowerCase()
          if (lower.includes('away')) status = 'away'
          else if (lower.includes('busy')) status = 'busy'
          else if (isOnline) status = 'custom'
        }
        return { userId, status, ext, lastTime: Date.now() }
      }).filter(p => !!p.userId)
      stores.presence.updateBatch(mapped)
    },
  }
}
