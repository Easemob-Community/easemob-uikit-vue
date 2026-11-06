import type {
  UiPresence,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef } from './types'

/** 创建在线状态 store */
export function createPresenceStore(handlersRef: HandlersRef): EventStores['presence'] {
  let presenceList: UiPresence[] = []
  const subscribed = new Set<string>()

  return {
    updateBatch(list) {
      const map = new Map(presenceList.map(p => [p.userId, p]))
      for (const p of list)
        map.set(p.userId, p)
      presenceList = Array.from(map.values())
      handlersRef()?.onPresenceChanged?.(presenceList)
    },

    setSubscribed(userIds) {
      for (const id of userIds)
        subscribed.add(id)
    },
  }
}
