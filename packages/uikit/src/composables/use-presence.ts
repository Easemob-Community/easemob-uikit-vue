import { computed, onScopeDispose, ref, toValue, watch as vueWatch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { UiPresence } from '../sdk/types'
import { formatSdkError } from '../utils/sdk-error'
import { useUIKit } from './use-uikit'

export function usePresence() {
  const { domains, stores, dataSource } = useUIKit()
  const presenceStore = stores.presence

  const presenceMap = computed(() => presenceStore.presenceMap)
  const onlineUserIds = computed(() => presenceStore.onlineUserIds)
  const currentUserId = computed(() => stores.client.currentUser)

  const loading = ref(false)

  function isSelf(userId: string): boolean {
    return !!currentUserId.value && userId === currentUserId.value
  }

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
    const ids = userIds.filter(id => !isSelf(id))
    if (ids.length === 0)
      return []
    if (dataSource.fetchPresence) {
      const list = await dataSource.fetchPresence(ids)
      presenceStore.updateBatch(list)
      return list
    }
    await domains.presence.fetchStatus(ids)
    return ids
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
   * Presence 服务不支持订阅自己，因此当前登录用户 ID 会被自动排除，
   * 自身在线状态依赖 SDK 派发事件写入 store。
   */
  function watch(source: MaybeRefOrGetter<string[]>): void {
    let current: string[] = []
    const stop = vueWatch(
      () => ({ ids: toValue(source), self: currentUserId.value }),
      ({ ids, self }) => {
        const next = (ids || []).filter(id => id !== self)
        const toAdd = next.filter(id => !current.includes(id))
        const toRemove = current.filter(id => !next.includes(id))
        current = [...next]
        if (toAdd.length) {
          void subscribePresence(toAdd).catch((err: unknown) => {
            console.warn('[usePresence] subscribePresence failed:', formatSdkError(err))
            // 订阅失败的 id 从“已订阅”集合移除，后续列表变化时可重新补订
            current = current.filter(id => !toAdd.includes(id))
          })
        }
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
