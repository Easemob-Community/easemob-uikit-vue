import type { UserInfo } from '@easemob-community/uikit-sdk-contract'
import { setLogCollector } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import type { UserInfoStoreLike } from '../../event/types'
import { UserInfoDomain } from '../user-info-domain'

function makeClient(connected = true) {
  return {
    currentUserId: 'me',
    isConnected: connected,
    userInfoManager: {
      getUserInfoByAttribute: vi.fn().mockResolvedValue([]),
      subscribeUsersInfo: vi.fn().mockResolvedValue(undefined),
      unsubscribeUsersInfo: vi.fn().mockResolvedValue(undefined),
      addEventHandler: vi.fn(),
      removeEventHandler: vi.fn(),
    },
  } as unknown as ManagerHost
}

function makeStore(options: { fetchedIds?: string[], cached?: UserInfo[] } = {}) {
  const infos = new Map<string, UserInfo>()
  for (const info of options.cached ?? [])
    infos.set(info.userId, info)
  const fetched = new Map<string, Set<string>>()
  for (const userId of options.fetchedIds ?? []) {
    fetched.set(userId, new Set(['nickname', 'avatarUrl', 'mail', 'phone', 'gender', 'sign', 'birth', 'ext']))
  }
  return {
    getUserInfo: (userId: string) => infos.get(userId),
    setUserInfo: vi.fn((info: UserInfo) => infos.set(info.userId, info)),
    setUserInfos: vi.fn((list: UserInfo[]) => {
      for (const info of list)
        infos.set(info.userId, info)
    }),
    areAttributesFetched: (userId: string, attributes: string[]) =>
      attributes.every(attribute => fetched.get(userId)?.has(attribute)),
    markFetchedAttributes: vi.fn((userIds: string[], attributes: string[]) => {
      for (const userId of userIds) {
        const current = fetched.get(userId) ?? new Set<string>()
        for (const attribute of attributes)
          current.add(attribute)
        fetched.set(userId, current)
      }
    }),
    markLoading: vi.fn(),
    markLoaded: vi.fn(),
    markFetchFailed: vi.fn(),
    isFetchFailed: () => false,
    isLoading: () => false,
    isSubscriptionDisabled: () => false,
    isSubscribed: () => false,
    isSubscribeFailed: () => false,
    markSubscribed: vi.fn(),
    markUnsubscribed: vi.fn(),
    markSubscribeFailed: vi.fn(),
    disableSubscription: vi.fn(),
  } as unknown as UserInfoStoreLike & {
    setUserInfos: ReturnType<typeof vi.fn>
    markFetchedAttributes: ReturnType<typeof vi.fn>
    markLoading: ReturnType<typeof vi.fn>
    markLoaded: ReturnType<typeof vi.fn>
    markFetchFailed: ReturnType<typeof vi.fn>
    markSubscribed: ReturnType<typeof vi.fn>
    markUnsubscribed: ReturnType<typeof vi.fn>
    markSubscribeFailed: ReturnType<typeof vi.fn>
    disableSubscription: ReturnType<typeof vi.fn>
  }
}

describe('userInfoDomain fetchUserInfos 微任务合批', () => {
  it('同一 tick 的多次单人 fetch 合并为一次底层调用，各自 resolve 自己请求的子集', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockResolvedValue([
      { userId: 'u1', nickname: '昵称1' },
      { userId: 'u2', nickname: '昵称2' },
      { userId: 'u3', nickname: '昵称3' },
    ])
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const [r1, r2, r3] = await Promise.all([
      domain.fetchUserInfos(['u1'], ['nickname']),
      domain.fetchUserInfos(['u2'], ['avatarUrl']),
      domain.fetchUserInfos(['u3'], ['sign']),
    ])

    expect(getUserInfoByAttribute).toHaveBeenCalledTimes(1)
    const call = getUserInfoByAttribute.mock.calls[0][0] as { userIds: string[], attributes: string[] }
    expect(call.userIds).toEqual(['u1', 'u2', 'u3'])
    // 各调用 attributes 取并集
    expect(call.attributes).toEqual(expect.arrayContaining(['nickname', 'avatarUrl', 'sign']))
    expect(r1.map(i => i.userId)).toEqual(['u1'])
    expect(r2.map(i => i.userId)).toEqual(['u2'])
    expect(r3.map(i => i.userId)).toEqual(['u3'])
    expect(store.markLoading).toHaveBeenCalledWith(['u1', 'u2', 'u3'])
    expect(store.markFetchedAttributes).toHaveBeenCalledTimes(1)
    expect(store.markLoaded).toHaveBeenCalledWith(['u1', 'u2', 'u3'])
  })

  it('跨 tick 的调用不合批，各自触发一次底层请求', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockImplementation(
      ({ userIds }: { userIds: string[] }) => Promise.resolve(userIds.map(userId => ({ userId }))),
    )
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    await domain.fetchUserInfos(['u1'])
    await domain.fetchUserInfos(['u2'])

    expect(getUserInfoByAttribute).toHaveBeenCalledTimes(2)
    expect(getUserInfoByAttribute.mock.calls[0][0]).toMatchObject({ userIds: ['u1'] })
    expect(getUserInfoByAttribute.mock.calls[1][0]).toMatchObject({ userIds: ['u2'] })
  })

  it('已缓存（属性已覆盖）的 id 不重复请求，调用方仍 resolve 缓存子集', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockResolvedValue([{ userId: 'u2', nickname: '新昵称' }])
    const cached: UserInfo = { userId: 'u1', nickname: '缓存昵称' }
    const store = makeStore({ fetchedIds: ['u1'], cached: [cached] })
    const domain = new UserInfoDomain(client, store)

    const [r1, r2] = await Promise.all([
      domain.fetchUserInfos(['u1']),
      domain.fetchUserInfos(['u2']),
    ])

    expect(getUserInfoByAttribute).toHaveBeenCalledTimes(1)
    expect((getUserInfoByAttribute.mock.calls[0][0] as { userIds: string[] }).userIds).toEqual(['u2'])
    expect(r1).toEqual([cached])
    expect(r2[0]?.nickname).toBe('新昵称')
    expect(store.markLoading).toHaveBeenCalledWith(['u2'])
  })

  it('全部 id 均已缓存时不发底层请求', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    const cached: UserInfo = { userId: 'u1', nickname: '缓存昵称' }
    const store = makeStore({ fetchedIds: ['u1'], cached: [cached] })
    const domain = new UserInfoDomain(client, store)

    const result = await domain.fetchUserInfos(['u1'])

    expect(getUserInfoByAttribute).not.toHaveBeenCalled()
    expect(store.markLoading).not.toHaveBeenCalled()
    expect(result).toEqual([cached])
  })

  it('底层请求失败时 markFetchFailed 语义不变，各调用 resolve 空子集', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockRejectedValue(new Error('network'))
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const [r1, r2] = await Promise.all([
      domain.fetchUserInfos(['u1']),
      domain.fetchUserInfos(['u2']),
    ])

    expect(store.markFetchFailed).toHaveBeenCalledWith(['u1', 'u2'])
    expect(store.markLoaded).toHaveBeenCalledWith(['u1', 'u2'])
    expect(r1).toEqual([])
    expect(r2).toEqual([])
  })

  it('底层未返回的 id 标记 fetch 失败，防止空结果无限重试', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockResolvedValue([{ userId: 'u1', nickname: '有' }])
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const [r1, r2] = await Promise.all([
      domain.fetchUserInfos(['u1']),
      domain.fetchUserInfos(['u2']),
    ])

    expect(store.markFetchFailed).toHaveBeenCalledWith(['u2'])
    expect(r1[0]?.nickname).toBe('有')
    expect(r2).toEqual([])
  })

  it('部分返回时只标记已返回 ID 的属性，缺失 ID 可在失败清理后重试', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockResolvedValue([{ userId: 'u1', nickname: '有' }])
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    await domain.fetchUserInfos(['u1', 'u2'], ['nickname'])

    expect(store.markFetchFailed).toHaveBeenCalledWith(['u2'])
    expect(store.markFetchedAttributes).toHaveBeenCalledWith(['u1'], ['nickname'])
  })

  it('未连接时直接 resolve 空结果且不入队列', async () => {
    const client = makeClient(false)
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const result = await domain.fetchUserInfos(['u1'])

    expect(result).toEqual([])
    expect(client.userInfoManager.getUserInfoByAttribute).not.toHaveBeenCalled()
    expect(store.markLoading).not.toHaveBeenCalled()
    // 离线丢弃必须留下可恢复状态，否则重连后无人重拉
    expect(store.markFetchFailed).toHaveBeenCalledWith(['u1'])
  })
})

describe('userInfoDomain fetchUserInfos 100 人分片', () => {
  it('205 个 ID 按 100/100/5 顺序请求', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    let active = 0
    let maxActive = 0
    getUserInfoByAttribute.mockImplementation(async ({ userIds }: { userIds: string[] }) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
      return userIds.map(userId => ({ userId }))
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.fetchUserInfos(userIds, ['nickname'])

    expect(getUserInfoByAttribute.mock.calls.map(call => call[0].userIds)).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(maxActive).toBe(1)
  })

  it('repository 注入路径也按 100 人分片', async () => {
    const client = makeClient()
    const store = makeStore()
    const fetchUserInfos = vi.fn(async (userIds: string[]) => userIds.map(userId => ({ userId })))
    const domain = new UserInfoDomain(client, store, { fetchUserInfos })
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.fetchUserInfos(userIds)

    expect(fetchUserInfos.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(client.userInfoManager.getUserInfoByAttribute).not.toHaveBeenCalled()
  })

  it('中间分片失败不影响其他分片入库和属性标记', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    let callIndex = 0
    getUserInfoByAttribute.mockImplementation(async ({ userIds }: { userIds: string[] }) => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('chunk failed')
      return userIds.map(userId => ({ userId }))
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    const result = await domain.fetchUserInfos(userIds, ['nickname'])

    expect(result).toHaveLength(105)
    expect(store.markFetchFailed).toHaveBeenCalledTimes(1)
    expect(store.markFetchFailed).toHaveBeenCalledWith(userIds.slice(100, 200))
    expect(store.markFetchedAttributes.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(200),
    ])
  })
})

describe('userInfoDomain SDK 缓存预填', () => {
  it('205 人命中 150 个缓存时只请求剩余 55 人', async () => {
    const client = makeClient()
    const store = makeStore()
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)
    const readCachedUserInfos = vi.fn(() => userIds.slice(0, 150).map(userId => ({ userId, nickname: `缓存${userId}` })))
    const fetchUserInfos = vi.fn(async (ids: string[]) => ids.map(userId => ({ userId, nickname: `远程${userId}` })))
    const domain = new UserInfoDomain(client, store, { readCachedUserInfos, fetchUserInfos })

    await domain.fetchUserInfos(userIds, ['nickname'])

    expect(readCachedUserInfos).toHaveBeenCalledWith(userIds)
    expect(fetchUserInfos).toHaveBeenCalledTimes(1)
    expect(fetchUserInfos.mock.calls[0][0]).toEqual(userIds.slice(150))
  })

  it('缓存全空时仍按 100/100/5 请求', async () => {
    const client = makeClient()
    const store = makeStore()
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)
    const fetchUserInfos = vi.fn(async (ids: string[]) => ids.map(userId => ({ userId })))
    const domain = new UserInfoDomain(client, store, {
      readCachedUserInfos: () => [],
      fetchUserInfos,
    })

    await domain.fetchUserInfos(userIds, ['nickname'])

    expect(fetchUserInfos.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
  })

  it('缓存只有 nickname 时只标记该字段并继续补拉 avatarUrl', async () => {
    const client = makeClient()
    const store = makeStore()
    const fetchUserInfos = vi.fn(async (ids: string[]) => ids.map(userId => ({ userId, avatarUrl: 'avatar' })))
    const domain = new UserInfoDomain(client, store, {
      readCachedUserInfos: () => [{ userId: 'u1', nickname: '缓存昵称' }],
      fetchUserInfos,
    })

    await domain.fetchUserInfos(['u1'], ['nickname', 'avatarUrl'])

    expect(store.markFetchedAttributes).toHaveBeenCalledWith(['u1'], ['nickname'])
    expect(fetchUserInfos).toHaveBeenCalledWith(['u1'])
  })
})

describe('userInfoDomain 来源日志', () => {
  it('聚合同批 sources 并只输出数量统计', async () => {
    const entries: { message: string, args: unknown[] }[] = []
    setLogCollector(entry => entries.push(entry))
    try {
      const client = makeClient()
      const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
      getUserInfoByAttribute.mockImplementation(async ({ userIds }: { userIds: string[] }) =>
        userIds.map(userId => ({ userId })))
      const domain = new UserInfoDomain(client, makeStore())

      await Promise.all([
        domain.fetchUserInfos(['u1'], ['nickname'], { source: 'conversation-item' }),
        domain.fetchUserInfos(['u2'], ['nickname'], { source: 'contact-list' }),
      ])

      const summary = entries.find(entry => entry.message === '[UserInfoDomain] fetch')
      expect(summary?.args[0]).toEqual({
        sources: ['conversation-item', 'contact-list'],
        prefilled: 0,
        requested: 2,
        missing: 2,
        chunks: 1,
        failedChunks: 0,
      })
      expect(JSON.stringify(summary?.args)).not.toContain('u1')
    }
    finally {
      setLogCollector(null)
    }
  })

  it('分片失败日志带 source、code 与 httpStatus', async () => {
    const entries: { message: string, args: unknown[] }[] = []
    setLogCollector(entry => entries.push(entry))
    try {
      const client = makeClient()
      const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
      getUserInfoByAttribute.mockRejectedValue({ code: 900, details: { httpStatus: 400 } })
      const domain = new UserInfoDomain(client, makeStore())

      await domain.fetchUserInfos(['u1'], ['nickname'], { source: 'conversation-item' })

      const failure = entries.find(entry => entry.message === '[UserInfoDomain] chunk failed')
      expect(failure?.args[0]).toEqual({
        source: 'conversation-item',
        chunkSize: 1,
        code: 900,
        httpStatus: 400,
        reason: undefined,
        message: undefined,
      })
    }
    finally {
      setLogCollector(null)
    }
  })
})

describe('userInfoDomain 拉取失败重试', () => {
  it('http 500 首次失败后退避重试一次，成功后不标 failed', async () => {
    vi.useFakeTimers()
    try {
      const client = makeClient()
      const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
      getUserInfoByAttribute
        .mockRejectedValueOnce({ details: { httpStatus: 500 } })
        .mockResolvedValueOnce([{ userId: 'u1', nickname: '恢复' }])
      const store = makeStore()
      const domain = new UserInfoDomain(client, store)

      const promise = domain.fetchUserInfos(['u1'], ['nickname'])
      await vi.advanceTimersByTimeAsync(300)
      const result = await promise

      expect(getUserInfoByAttribute).toHaveBeenCalledTimes(2)
      expect(result[0]?.nickname).toBe('恢复')
      expect(store.markFetchFailed).not.toHaveBeenCalled()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('无 httpStatus 的网络错误（code 2）也退避重试一次', async () => {
    vi.useFakeTimers()
    try {
      const client = makeClient()
      const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
      getUserInfoByAttribute
        .mockRejectedValueOnce({ code: 2, message: 'network error' })
        .mockResolvedValueOnce([{ userId: 'u1', nickname: '恢复' }])
      const store = makeStore()
      const domain = new UserInfoDomain(client, store)

      const promise = domain.fetchUserInfos(['u1'], ['nickname'])
      await vi.advanceTimersByTimeAsync(300)
      const result = await promise

      expect(getUserInfoByAttribute).toHaveBeenCalledTimes(2)
      expect(result[0]?.nickname).toBe('恢复')
      expect(store.markFetchFailed).not.toHaveBeenCalled()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it.each([
    { name: 'HTTP 400', error: { details: { httpStatus: 400 } } },
    { name: '本地参数错误 110', error: { code: 110 } },
  ])('$name 不重试', async ({ error }) => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockRejectedValue(error)
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    await domain.fetchUserInfos(['u1'], ['nickname'])

    expect(getUserInfoByAttribute).toHaveBeenCalledTimes(1)
    expect(store.markFetchFailed).toHaveBeenCalledWith(['u1'])
  })
})

describe('userInfoDomain 自身资料独立拉取', () => {
  it('own 与 205 个普通 ID 同 tick 时产生 1+3 次独立请求', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockImplementation(async ({ userIds }: { userIds: string[] }) =>
      userIds.map(userId => ({ userId })))
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    const [own] = await Promise.all([
      domain.fetchOwnInfo(),
      domain.fetchUserInfos(userIds, ['nickname']),
    ])

    expect(own?.userId).toBe('me')
    expect(getUserInfoByAttribute).toHaveBeenCalledTimes(4)
    expect(getUserInfoByAttribute.mock.calls.map(call => call[0].userIds)).toEqual([
      ['me'],
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
  })

  it('own 请求失败只标记自己，不影响同 tick 普通请求', async () => {
    const client = makeClient()
    const getUserInfoByAttribute = client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>
    getUserInfoByAttribute.mockImplementation(async ({ userIds }: { userIds: string[] }) => {
      if (userIds.length === 1 && userIds[0] === 'me')
        throw new Error('own failed')
      return userIds.map(userId => ({ userId }))
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const [own, ordinary] = await Promise.all([
      domain.fetchOwnInfo(),
      domain.fetchUserInfos(['u1'], ['nickname']),
    ])

    expect(own).toBeUndefined()
    expect(ordinary.map(info => info.userId)).toEqual(['u1'])
    expect(store.markFetchFailed).toHaveBeenCalledTimes(1)
    expect(store.markFetchFailed).toHaveBeenCalledWith(['me'])
  })
})

describe('userInfoDomain 资料订阅 100 人分片', () => {
  it('订阅 205 个 ID 按 100/100/5 顺序请求', async () => {
    const client = makeClient()
    const subscribeUsersInfo = client.userInfoManager.subscribeUsersInfo as ReturnType<typeof vi.fn>
    let active = 0
    let maxActive = 0
    subscribeUsersInfo.mockImplementation(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.subscribeUserInfos(userIds)

    expect(subscribeUsersInfo.mock.calls.map(call => call[0].userIds)).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(maxActive).toBe(1)
  })

  it('普通错误只影响当前订阅分片并继续后续分片', async () => {
    const client = makeClient()
    const subscribeUsersInfo = client.userInfoManager.subscribeUsersInfo as ReturnType<typeof vi.fn>
    let callIndex = 0
    subscribeUsersInfo.mockImplementation(async () => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('chunk failed')
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.subscribeUserInfos(userIds)

    expect(subscribeUsersInfo).toHaveBeenCalledTimes(3)
    expect(store.markSubscribeFailed).toHaveBeenCalledWith(userIds.slice(100, 200))
    expect(store.markSubscribed.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(200),
    ])
  })

  it('订阅配额 1600 熔断并停止剩余分片', async () => {
    const client = makeClient()
    const subscribeUsersInfo = client.userInfoManager.subscribeUsersInfo as ReturnType<typeof vi.fn>
    subscribeUsersInfo.mockRejectedValue({ code: 1600, details: { httpStatus: 400 } })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.subscribeUserInfos(userIds)

    expect(subscribeUsersInfo).toHaveBeenCalledTimes(1)
    expect(store.disableSubscription).toHaveBeenCalledTimes(1)
  })

  it('目标配额 1601 仅标记当前分片并继续，不全局熔断', async () => {
    const client = makeClient()
    const subscribeUsersInfo = client.userInfoManager.subscribeUsersInfo as ReturnType<typeof vi.fn>
    subscribeUsersInfo.mockRejectedValue({ code: 1601, details: { httpStatus: 400 } })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.subscribeUserInfos(userIds)

    expect(subscribeUsersInfo).toHaveBeenCalledTimes(3)
    expect(store.markSubscribeFailed).toHaveBeenCalledTimes(3)
    expect(store.disableSubscription).not.toHaveBeenCalled()
  })

  it('权限错误熔断并停止剩余订阅分片', async () => {
    const client = makeClient()
    const subscribeUsersInfo = client.userInfoManager.subscribeUsersInfo as ReturnType<typeof vi.fn>
    subscribeUsersInfo.mockRejectedValue({ code: 210 })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.subscribeUserInfos(userIds)

    expect(subscribeUsersInfo).toHaveBeenCalledTimes(1)
    expect(store.markSubscribeFailed).toHaveBeenCalledWith(userIds.slice(0, 100))
    expect(store.disableSubscription).toHaveBeenCalledTimes(1)
  })

  it('退订 205 个 ID 按 100/100/5 请求并只更新成功分片', async () => {
    const client = makeClient()
    const unsubscribeUsersInfo = client.userInfoManager.unsubscribeUsersInfo as ReturnType<typeof vi.fn>
    let callIndex = 0
    unsubscribeUsersInfo.mockImplementation(async () => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('chunk failed')
    })
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.unsubscribeUsersInfo(userIds)

    expect(unsubscribeUsersInfo.mock.calls.map(call => call[0].userIds)).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(store.markUnsubscribed.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(200),
    ])
  })
})
