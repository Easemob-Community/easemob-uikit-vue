import { computed, onScopeDispose, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { usePresenceStore, type PresenceInfo } from '../store/presence'
import { useUIKit } from './use-uikit'
import type { PresenceManager } from 'easemob-websdk'

/** SDK getPresenceStatus 返回的在线状态类型 */
type SdkPresenceInfo = Awaited<ReturnType<PresenceManager['getPresenceStatus']>>[number]

/**
 * Presence \u6309\u9700\u8ba2\u9605\u7ba1\u7406\u5668
 *
 * \u8bbe\u8ba1\u8981\u70b9\uff1a
 * - \u6a21\u5757\u7ea7 refCount Map\uff1a\u591a\u4e2a\u7ec4\u4ef6\u5bf9\u540c\u4e00 userId \u7684\u5173\u6ce8 +1\uff0c\u6700\u540e\u4e00\u4e2a\u91ca\u653e\u624d unsubscribe
 * - 100ms \u8282\u6d41\u7a97\u53e3\uff1a\u5feb\u901f\u6eda\u52a8\u53ef\u89c6\u533a\u95f4\u53d8\u52a8\u65f6\uff0c\u5408\u5e76\u4e3a\u4e00\u6b21\u6279\u91cf\u8ba2\u9605/\u9000\u8ba2
 * - dataSource \u4f18\u5148\uff1a\u4e1a\u52a1\u5b9e\u73b0\u4e86\u5b9a\u5236\u8ba2\u9605\u903b\u8f91\u5219\u8d70\u4e1a\u52a1\u5b9e\u73b0\uff0c\u5426\u5219\u8d70 SDK
 * - onScopeDispose \u81ea\u52a8\u6e05\u7406\uff1a\u7ec4\u4ef6\u5378\u8f7d\u65f6\u81ea\u52a8\u91ca\u653e\u5f15\u7528
 */

/** \u5168\u5c40\u5f15\u7528\u8ba1\u6570 */
const refCount = new Map<string, number>()
/** \u5f85\u8ba2\u9605\u961f\u5217 */
const pendingSubscribe = new Set<string>()
/** \u5f85\u9000\u8ba2\u961f\u5217 */
const pendingUnsubscribe = new Set<string>()

let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 100

function scheduleFlush(flushFn: () => void) {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushFn()
  }, FLUSH_INTERVAL)
}

export function usePresence() {
  const { dataSource, client, features } = useUIKit()
  const presenceStore = usePresenceStore()

  function flushPending() {
    const subList = Array.from(pendingSubscribe)
    const unsubList = Array.from(pendingUnsubscribe)
    pendingSubscribe.clear()
    pendingUnsubscribe.clear()

    if (subList.length > 0) {
      const doSubscribe = async () => {
        try {
          if (dataSource.subscribePresence) {
            await dataSource.subscribePresence(subList)
          } else if (client.value) {
            await client.value.presence.subscribePresence(subList)
          }
          // \u9996\u6b21\u8ba2\u9605\u540e\u62c9\u4e00\u6b21\u521d\u59cb\u72b6\u6001
          if (dataSource.fetchPresence) {
            const list = await dataSource.fetchPresence(subList)
            presenceStore.updateBatch(list)
          } else if (client.value) {
            const res = await client.value.presence.getPresenceStatus(subList)
            /**
             * SDK getPresenceStatus 直接返回 ReadonlyArray<SdkPresenceInfo>，
             * 无 .result/.data 包装。
             * SdkPresenceInfo 使用 publisher/statusList 字段（非 userId/statusDetails）。
             */
            const items: ReadonlyArray<SdkPresenceInfo> = res
            const mapped: PresenceInfo[] = items.map((item) => {
              const uid = item.publisher || ''
              const statusList = item.statusList || {}
              const isOnline = Object.values(statusList).some((v) => Number(v) === 1)
              return { userId: uid, status: (isOnline ? 'online' : 'offline') as PresenceInfo['status'], ext: item.ext }
            }).filter((p) => !!p.userId) as PresenceInfo[]
            presenceStore.updateBatch(mapped)
          }
        } catch (e) {
          console.warn('[UIKit] presence subscribe failed:', e)
        }
      }
      doSubscribe()
    }

    if (unsubList.length > 0) {
      const doUnsubscribe = async () => {
        try {
          if (dataSource.unsubscribePresence) {
            await dataSource.unsubscribePresence(unsubList)
          } else if (client.value) {
            await client.value.presence.unsubscribePresence(unsubList)
          }
        } catch (e) {
          console.warn('[UIKit] presence unsubscribe failed:', e)
        }
      }
      doUnsubscribe()
    }
  }

  /** \u589e\u52a0\u4e00\u7ec4 ID \u7684\u5f15\u7528\u8ba1\u6570 */
  function retain(ids: string[]) {
    if (!features.enablePresence) return
    for (const id of ids) {
      if (!id) continue
      const cur = refCount.get(id) || 0
      if (cur === 0) {
        // 首次出现 -> 入订阅队列；若原本在退订队列则撑销
        if (pendingUnsubscribe.has(id)) pendingUnsubscribe.delete(id)
        else pendingSubscribe.add(id)
      }
      refCount.set(id, cur + 1)
    }
    scheduleFlush(flushPending)
  }

  /** \u91ca\u653e\u4e00\u7ec4 ID \u7684\u5f15\u7528\u8ba1\u6570 */
  function release(ids: string[]) {
    if (!features.enablePresence) return
    for (const id of ids) {
      if (!id) continue
      const cur = refCount.get(id) || 0
      if (cur <= 1) {
        refCount.delete(id)
        // 降到 0 -> 入退订队列；若原本在订阅队列则撤销
        if (pendingSubscribe.has(id)) pendingSubscribe.delete(id)
        else pendingUnsubscribe.add(id)
      } else {
        refCount.set(id, cur - 1)
      }
    }
    scheduleFlush(flushPending)
  }

  /**
   * \u5728\u5f53\u524d\u4f5c\u7528\u57df\u8ba2\u9605\u4e00\u7ec4 userId\uff0cuserIds \u53d8\u5316\u65f6\u81ea\u52a8 diff retain/release\u3002\n   * \u5728\u5f53\u524d\u4f5c\u7528\u57df\u9500\u6bc1\u65f6\uff08\u7ec4\u4ef6\u5378\u8f7d\uff09\u81ea\u52a8 release\u3002\n   */
  function watchIds(userIds: MaybeRefOrGetter<string[]>) {
    let lastIds: string[] = []
    const stop = watch(
      () => toValue(userIds) as string[],
      (next) => {
        const nextSet = new Set(next || [])
        const lastSet = new Set(lastIds)
        const toAdd: string[] = []
        const toRemove: string[] = []
        nextSet.forEach((id) => { if (!lastSet.has(id)) toAdd.push(id) })
        lastSet.forEach((id) => { if (!nextSet.has(id)) toRemove.push(id) })
        if (toAdd.length) retain(toAdd)
        if (toRemove.length) release(toRemove)
        lastIds = Array.from(nextSet)
      },
      { immediate: true },
    )
    onScopeDispose(() => {
      stop()
      if (lastIds.length) release(lastIds)
    })
  }

  /** \u83b7\u53d6\u67d0\u4e2a\u7528\u6237\u7684\u5728\u7ebf\u72b6\u6001\uff08\u54cd\u5e94\u5f0f\uff09 */
  function get(userId: string): ComputedRef<PresenceInfo | undefined> {
    return computed(() => presenceStore.presenceMap.get(userId))
  }

  return {
    get,
    watch: watchIds,
    retain,
    release,
  }
}
