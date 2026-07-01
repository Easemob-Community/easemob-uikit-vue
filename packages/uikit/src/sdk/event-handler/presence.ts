import type { EventPayloadMap } from 'easemob-websdk'
import type { RootStores } from './index'
import type { PresenceStatus } from '../../store/presence'

/**
 * 创建在线状态事件处理器
 */
export function createPresenceHandler(stores: RootStores) {
  const handler = {
    onPresenceStatusChange: (list: EventPayloadMap['onPresenceStatusChange']) => {
      if (!Array.isArray(list)) return
      const mapped = list.map((item) => {
        const userId = item.userId || ''
        const details = Array.isArray(item.statusDetails) ? item.statusDetails : []
        const isOnline = details.some((d: unknown) => Number((d as Record<string, unknown>)?.status) === 1)
        const ext = item.ext || ''
        let status: PresenceStatus = isOnline ? 'online' : 'offline'
        if (ext) {
          const lower = ext.toLowerCase()
          if (lower.includes('away')) status = 'away'
          else if (lower.includes('busy')) status = 'busy'
          else if (isOnline) status = 'custom'
        }
        return { userId, status, ext, lastTime: Date.now() }
      }).filter((p) => !!p.userId)
      stores.presence.updateBatch(mapped)
    },
  }

  return handler
}
