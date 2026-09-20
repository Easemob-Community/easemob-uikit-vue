import { computed, onScopeDispose, ref, toValue, watch as vueWatch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { UiPresence } from '../sdk/types'
import { parsePresenceStatus } from '../utils/presence-status'
import { formatSdkError } from '../utils/sdk-error'
import { createLogger } from '../utils/logger'
import { useCoreUIKit } from './use-uikit'

const logger = createLogger('UIKit:UsePresence')

/** presence 关闭时各操作仅告警一次（warnOnce），避免刷屏 */
let warnedPresenceDisabled = false
function warnPresenceDisabledOnce(action: string): void {
  if (warnedPresenceDisabled)
    return
  warnedPresenceDisabled = true
  logger.warn(`[usePresence] enablePresence 未开启（默认开启，当前被显式关闭），${action} 已跳过；如需在线状态请移除 enablePresence=false 或显式开启`)
}

export function usePresence() {
  const { domains, stores, features } = useCoreUIKit()
  const presenceStore = stores.presence

  const presenceMap = computed(() => presenceStore.presenceMap)
  const onlineUserIds = computed(() => presenceStore.onlineUserIds)
  const currentUserId = computed(() => stores.client.currentUser)

  const loading = ref(false)

  function isSelf(userId: string): boolean {
    return !!currentUserId.value && userId === currentUserId.value
  }

  /** 订阅在线状态（dataSource.subscribePresence 已经 core 翻译为 presence.subscribe 注入，由 Domain 委托） */
  async function subscribePresence(userIds: string[], expiry?: number) {
    // 每次调用时读 features.enablePresence（响应式 getter），支持运行时切换
    if (!features.enablePresence) {
      warnPresenceDisabledOnce('subscribePresence')
      return
    }
    await domains.presence.subscribe(userIds, expiry)
  }

  /** 取消订阅 */
  async function unsubscribePresence(userIds: string[]) {
    if (!features.enablePresence) {
      warnPresenceDisabledOnce('unsubscribePresence')
      return
    }
    await domains.presence.unsubscribe(userIds)
  }

  /**
   * 查询在线状态（dataSource.fetchPresence 已翻译为 presence.fetchStatus 注入，
   * 注入路径与 SDK 路径均由 Domain 统一写入 presence store）。
   * 注意：订阅自己会被服务端拒绝（cannot_subscribe_yourself，见 watch），
   * 但主动查询（getPresenceStatus）允许查询自己，因此这里不再过滤当前用户——
   * 侧边栏等"自己的头像"正是依赖此能力拉取并展示自己的在线状态点。
   */
  async function fetchPresence(userIds: string[]): Promise<UiPresence[]> {
    if (!features.enablePresence)
      return []
    if (userIds.length === 0)
      return []
    await domains.presence.fetchStatus(userIds)
    return userIds
      .map(userId => presenceStore.get(userId))
      .filter((p): p is UiPresence => !!p)
  }

  /**
   * 发布自定义在线状态。
   * SDK 只把状态下发给订阅者、不会回推给自己，故发布成功后主动写入本地 store，
   * 确保自己的头像指示器立即更新（无需等待服务端事件回传）。
   */
  async function publishPresence(description: string) {
    if (!features.enablePresence) {
      warnPresenceDisabledOnce('publishPresence')
      return
    }
    await domains.presence.publish(description)
    const userId = currentUserId.value
    if (userId) {
      presenceStore.update({
        userId,
        status: parsePresenceStatus(true, description),
        ext: description,
        lastTime: Date.now(),
      })
    }
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
   * Presence 服务不支持订阅自己，因此当前登录用户 ID 会被自动排除；
   * 自己的状态通过 fetchPresence 主动查询或 publishPresence 发布后写入 store。
   *
   * 健壮性约定：
   * - 未连接（stores.client.connected=false）时不发起订阅也不记账——Domain 在未连接时
   *   静默返回空（不抛错），照常记账会形成“假订阅”导致永久漏订；保持待订状态，
   *   连接恢复后本 watch 自动重放补订。
   * - 订阅是首屏状态来源之一，但可能失败/返回空；settle 后对仍无状态的 id 用
   *   fetchPresence（getPresenceStatus 查询，不需要订阅关系）兜底补齐首屏。
   */
  function watch(source: MaybeRefOrGetter<string[]>): void {
    let current: string[] = []
    const stop = vueWatch(
      () => ({ ids: toValue(source), self: currentUserId.value, connected: stores.client.connected }),
      ({ ids, connected }) => {
        // 关闭期：清空内部“已订阅”集合并跳过一切订阅/退订，
        // 防止“关闭期标记已订阅、开启后漏订”的状态漂移
        if (!features.enablePresence) {
          current = []
          return
        }
        // 未连接：不订阅不记账，等 connected 变 true 后重放（见上注释）
        if (!connected) {
          current = []
          return
        }
        const next = (ids || []).filter(id => !isSelf(id))
        const toAdd = next.filter(id => !current.includes(id))
        const toRemove = current.filter(id => !next.includes(id))
        current = [...next]
        if (toAdd.length) {
          void (async () => {
            let subscribeFailed = false
            try {
              await subscribePresence(toAdd)
            }
            catch (err: unknown) {
              subscribeFailed = true
              logger.warn('[usePresence] subscribePresence failed:', formatSdkError(err), '；回退主动查询补齐首屏，后续列表变化时重新补订')
              // 订阅失败的 id 从“已订阅”集合移除，后续列表变化时可重新补订
              current = current.filter(id => !toAdd.includes(id))
            }
            // 首屏兜底：订阅 settle 后仍无状态的 id（订阅失败/服务端未返回条目），
            // 主动查询补齐；订阅成功路径 store 已写入，missing 为空，零额外请求
            const missing = toAdd.filter(id => !presenceStore.get(id))
            if (missing.length) {
              try {
                await fetchPresence(missing)
              }
              catch (err: unknown) {
                if (!subscribeFailed)
                  logger.warn('[usePresence] fetchPresence fallback failed:', formatSdkError(err))
              }
            }
          })()
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
