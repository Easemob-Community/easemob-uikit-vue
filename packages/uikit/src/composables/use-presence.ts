import { computed, onScopeDispose, ref, toValue, watch as vueWatch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { UiPresence } from '../sdk/types'
import { useUIKit } from './use-uikit'

export function usePresence() {
  const { domains, stores, dataSource } = useUIKit()
  const presenceStore = stores.presence

  const presenceMap = computed(() => presenceStore.presenceMap)
  const onlineUserIds = computed(() => presenceStore.onlineUserIds)

  const loading = ref(false)

  /** 订阅在线状态 */
  async function subscribePresence(userIds: string[], expiry?: number) {
    if (dataSource.subscribePresence) {
      await dataSource.subscribePresence(userIds)
      return
    }
    await domains.presence.subscribe(userIds, expiry)
  }

  /** 取消订阅 */
  async function unsubscribePresence(userIds: string[]) {
    if (dataSource.unsubscribePresence) {
      await dataSource.unsubscribePresence(userIds)
      return
    }
    await domains.presence.unsubscribe(userIds)
  }

  /** 查询在线状态 */
  async function fetchPresence(userIds: string[]): Promise<UiPresence[]> {
    if (dataSource.fetchPresence) {
      const list = await dataSource.fetchPresence(userIds)
      presenceStore.updateBatch(list)
      return list
    }
    await domains.presence.fetchStatus(userIds)
    return userIds
      .map(userId => presenceStore.get(userId))
      .filter((p): p is UiPresence => !!p)
  }

  /** 发布自定义在线状态 */
  async function publishPresence(description: string) {
    await domains.presence.publish(description)
  }

  /** 获取单个用户在线状态 */
  function getPresence(userId: string): UiPresence | undefined {
    return presenceStore.get(userId)
  }

  /** 获取单个用户在线状态（响应式引用） */
  function get(userId: string): ComputedRef<UiPresence | undefined> {
    return computed(() => presenceStore.get(userId))
  }

  /**
   * 跟随传入的用户 ID 列表自动订阅/取消订阅在线状态。
   * 列表变化时增量订阅新增用户、取消已移出用户；作用域销毁时释放全部订阅。
   */
  function watch(source: MaybeRefOrGetter<string[]>): void {
    let current: string[] = []
    const stop = vueWatch(
      () => toValue(source),
      (ids) => {
        const next = ids || []
        const toAdd = next.filter(id => !current.includes(id))
        const toRemove = current.filter(id => !next.includes(id))
        current = [...next]
        if (toAdd.length)
          void subscribePresence(toAdd)
        if (toRemove.length)
          void unsubscribePresence(toRemove)
      },
      { immediate: true },
    )
    onScopeDispose(() => {
      stop()
      if (current.length)
        void unsubscribePresence(current)
    })
  }

  return {
    presenceMap,
    onlineUserIds,
    loading,
    subscribePresence,
    unsubscribePresence,
    fetchPresence,
    publishPresence,
    getPresence,
    get,
    watch,
  }
}
