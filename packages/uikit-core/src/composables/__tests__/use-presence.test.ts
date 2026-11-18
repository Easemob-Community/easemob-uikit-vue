import { effectScope, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { UiPresence } from '../../sdk/types'
// vi.mock 会被 vitest 提升到 import 之前执行，这里按 lint 规则保持 import 在顶部
import { usePresence } from '../use-presence'

/**
 * usePresence().watch 健壮性测试：
 * - 未连接不订阅不记账，连接恢复自动补订
 * - 订阅失败/无数据时回退 fetchPresence 兜底首屏
 * - 订阅成功且状态齐全时零额外查询
 */

const mockCtx = vi.hoisted(() => ({
  domains: {} as any,
  stores: {} as any,
  features: {} as any,
}))

vi.mock('../use-uikit', () => ({
  useCoreUIKit: () => mockCtx,
}))

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('usePresence().watch', () => {
  let clientState: { currentUser: string, connected: boolean }
  let storeData: Map<string, UiPresence>
  let subscribeMock: Mock
  let unsubscribeMock: Mock
  let fetchStatusMock: Mock

  /** 模拟 Domain 行为：subscribe/fetchStatus 成功时把状态写入 store */
  function writeStore(ids: string[]) {
    for (const id of ids)
      storeData.set(id, { userId: id, status: 'online', ext: '', lastTime: 1 })
  }

  beforeEach(() => {
    clientState = reactive({ currentUser: 'me', connected: true })
    storeData = new Map()
    subscribeMock = vi.fn(async (ids: string[]) => {
      writeStore(ids)
      return []
    })
    unsubscribeMock = vi.fn(async () => {})
    fetchStatusMock = vi.fn(async (ids: string[]) => {
      writeStore(ids)
      return []
    })
    mockCtx.features = { enablePresence: true }
    mockCtx.stores = {
      client: clientState,
      presence: {
        presenceMap: new Map(),
        onlineUserIds: [],
        get: (id: string) => storeData.get(id),
        update: (info: UiPresence) => storeData.set(info.userId, info),
      },
    }
    mockCtx.domains = {
      presence: {
        subscribe: subscribeMock,
        unsubscribe: unsubscribeMock,
        fetchStatus: fetchStatusMock,
        publish: vi.fn(async () => {}),
      },
    }
  })

  function startWatch(ids: Ref<string[]>) {
    const scope = effectScope()
    scope.run(() => usePresence().watch(ids))
    return scope
  }

  it('已连接时立即订阅传入列表，并排除当前登录用户', async () => {
    const scope = startWatch(ref(['a', 'me', 'b']))
    await flush()
    expect(subscribeMock).toHaveBeenCalledTimes(1)
    expect(subscribeMock).toHaveBeenCalledWith(['a', 'b'], undefined)
    scope.stop()
  })

  it('未连接时不订阅不记账，连接恢复后自动补订', async () => {
    clientState.connected = false
    const ids = ref(['a', 'b'])
    const scope = startWatch(ids)
    await flush()
    expect(subscribeMock).not.toHaveBeenCalled()

    clientState.connected = true
    await flush()
    expect(subscribeMock).toHaveBeenCalledTimes(1)
    expect(subscribeMock).toHaveBeenCalledWith(['a', 'b'], undefined)
    scope.stop()
  })

  it('订阅失败时回退 fetchPresence 兜底首屏，失败 id 留在已订阅集合内避免每次列表变化全量重发', async () => {
    subscribeMock.mockRejectedValueOnce(new Error('subscribe denied'))
    const ids = ref(['a', 'b'])
    const scope = startWatch(ids)
    await flush()
    await flush()
    expect(fetchStatusMock).toHaveBeenCalledTimes(1)
    expect(fetchStatusMock).toHaveBeenCalledWith(['a', 'b'])
    // 兜底查询已写入 store，首屏有数据
    expect(storeData.has('a')).toBe(true)
    expect(storeData.has('b')).toBe(true)

    // 失败 id 仍记账：列表新增只订阅新增的 c，不再把 a/b 全量重发
    subscribeMock.mockClear()
    ids.value = ['a', 'b', 'c']
    await flush()
    await flush()
    expect(subscribeMock).toHaveBeenCalledTimes(1)
    expect(subscribeMock).toHaveBeenCalledWith(['c'], undefined)
    scope.stop()
  })

  it('订阅成功且状态齐全时不额外发起查询（零补拉）', async () => {
    const scope = startWatch(ref(['a', 'b']))
    await flush()
    await flush()
    expect(subscribeMock).toHaveBeenCalledTimes(1)
    expect(fetchStatusMock).not.toHaveBeenCalled()
    scope.stop()
  })

  it('订阅成功但服务端未返回部分用户时，仅对缺失 id 补拉', async () => {
    subscribeMock.mockImplementationOnce(async () => {
      writeStore(['a']) // 只返回 a
      return []
    })
    const scope = startWatch(ref(['a', 'b']))
    await flush()
    await flush()
    expect(fetchStatusMock).toHaveBeenCalledTimes(1)
    expect(fetchStatusMock).toHaveBeenCalledWith(['b'])
    scope.stop()
  })

  it('enablePresence 关闭时不订阅', async () => {
    mockCtx.features = { enablePresence: false }
    const scope = startWatch(ref(['a']))
    await flush()
    expect(subscribeMock).not.toHaveBeenCalled()
    scope.stop()
  })
})

describe('usePresence().watch 订阅失败退避', () => {
  let localSubscribe: Mock
  let localFetchStatus: Mock
  let clientState: { currentUser: string, connected: boolean }

  beforeEach(() => {
    clientState = reactive({ currentUser: 'me', connected: true })
    localSubscribe = vi.fn(async () => {
      throw new Error('400 illegal_argument')
    })
    localFetchStatus = vi.fn(async () => {
      throw new Error('400 illegal_argument')
    })
    mockCtx.features = { enablePresence: true }
    mockCtx.stores = {
      client: clientState,
      presence: {
        presenceMap: new Map(),
        onlineUserIds: [],
        get: () => undefined,
        update: () => {},
      },
    }
    mockCtx.domains = {
      presence: {
        subscribe: localSubscribe,
        unsubscribe: vi.fn(async () => {}),
        fetchStatus: localFetchStatus,
        publish: vi.fn(async () => {}),
      },
    }
  })

  function startWatch(ids: Ref<string[]>) {
    const scope = effectScope()
    scope.run(() => usePresence().watch(ids))
    return scope
  }

  it('失败后按 5s 退避合并重试；列表变化只订阅新增 id，不再全量重发', async () => {
    vi.useFakeTimers()
    try {
      const ids = ref(['a', 'b'])
      const scope = startWatch(ids)
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(0)
      expect(localSubscribe).toHaveBeenCalledTimes(1)
      expect(localSubscribe).toHaveBeenCalledWith(['a', 'b'], undefined)

      // 列表变化：只新增 c，失败中的 a/b 不重发
      localSubscribe.mockClear()
      ids.value = ['a', 'b', 'c']
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(0)
      expect(localSubscribe.mock.calls.map(call => call[0])).toEqual([['c']])

      // 到达退避窗口：a/b/c 合并为一次重试
      await vi.advanceTimersByTimeAsync(5_000)
      const retried = localSubscribe.mock.calls.slice(1).map(call => call[0])
      expect(retried.flat().sort()).toEqual(['a', 'b', 'c'])
      scope.stop()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('作用域销毁时清理重试定时器，不再发起订阅', async () => {
    vi.useFakeTimers()
    try {
      const scope = startWatch(ref(['a']))
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(0)
      localSubscribe.mockClear()
      scope.stop()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(localSubscribe).not.toHaveBeenCalled()
    }
    finally {
      vi.useRealTimers()
    }
  })
})
