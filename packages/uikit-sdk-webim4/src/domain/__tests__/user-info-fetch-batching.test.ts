// @vitest-environment jsdom
// 4.x SDK（easemob-websdk@4.x）入口在模块加载时访问 `self`，node 环境需在 jsdom 下运行
import type { UserInfo } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { Webim4Client } from '../../client'
import type { UserInfoStoreLike } from '../../event/types'
import { UserInfoDomain } from '../user-info-domain'

function makeClient(connected = true) {
  return {
    currentUserId: 'me',
    isConnected: connected,
    connection: {
      fetchUserInfoById: vi.fn().mockResolvedValue({ data: {} }),
    },
  } as unknown as Webim4Client
}

function makeStore(options: { fetchedIds?: string[], cached?: UserInfo[] } = {}) {
  const infos = new Map<string, UserInfo>()
  for (const info of options.cached ?? [])
    infos.set(info.userId, info)
  const fetched = new Set(options.fetchedIds ?? [])
  return {
    getUserInfo: (userId: string) => infos.get(userId),
    setUserInfo: vi.fn((info: UserInfo) => infos.set(info.userId, info)),
    setUserInfos: vi.fn((list: UserInfo[]) => {
      for (const info of list)
        infos.set(info.userId, info)
    }),
    areAttributesFetched: (userId: string) => fetched.has(userId),
    markFetchedAttributes: vi.fn(),
    markLoading: vi.fn(),
    markLoaded: vi.fn(),
    markFetchFailed: vi.fn(),
    isFetchFailed: () => false,
    isLoading: () => false,
  } as unknown as UserInfoStoreLike & {
    setUserInfos: ReturnType<typeof vi.fn>
    markFetchedAttributes: ReturnType<typeof vi.fn>
    markLoading: ReturnType<typeof vi.fn>
    markLoaded: ReturnType<typeof vi.fn>
    markFetchFailed: ReturnType<typeof vi.fn>
  }
}

/** 构造 4.x wire 返回（data 以 userId 为 key，头像字段为小写 avatarurl） */
function wireData(entries: Record<string, Record<string, string>>) {
  return { data: entries }
}

describe('userInfoDomain fetchUserInfos 微任务合批（4.x）', () => {
  it('同一 tick 的多次单人 fetch 合并为一次底层调用，各自 resolve 自己请求的子集', async () => {
    const client = makeClient()
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    fetchUserInfoById.mockResolvedValue(wireData({
      u1: { nickname: '昵称1' },
      u2: { nickname: '昵称2' },
      u3: { nickname: '昵称3' },
    }))
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const [r1, r2, r3] = await Promise.all([
      domain.fetchUserInfos(['u1'], ['nickname']),
      domain.fetchUserInfos(['u2'], ['avatarUrl']),
      domain.fetchUserInfos(['u3'], ['sign']),
    ])

    expect(fetchUserInfoById).toHaveBeenCalledTimes(1)
    const [userIds, properties] = fetchUserInfoById.mock.calls[0] as [string[], string[]]
    expect(userIds).toEqual(['u1', 'u2', 'u3'])
    // 各调用 attributes 取并集（4.x 头像字段映射为小写 avatarurl）
    expect(properties).toEqual(expect.arrayContaining(['nickname', 'avatarurl', 'sign']))
    expect(r1.map(i => i.userId)).toEqual(['u1'])
    expect(r2.map(i => i.userId)).toEqual(['u2'])
    expect(r3.map(i => i.userId)).toEqual(['u3'])
    expect(store.markLoading).toHaveBeenCalledWith(['u1', 'u2', 'u3'])
    expect(store.markFetchedAttributes).toHaveBeenCalledTimes(1)
    expect(store.markLoaded).toHaveBeenCalledWith(['u1', 'u2', 'u3'])
  })

  it('跨 tick 的调用不合批，各自触发一次底层请求', async () => {
    const client = makeClient()
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    fetchUserInfoById.mockImplementation((userIds: string[]) =>
      Promise.resolve(wireData(Object.fromEntries(userIds.map(userId => [userId, {}])))))
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    await domain.fetchUserInfos(['u1'])
    await domain.fetchUserInfos(['u2'])

    expect(fetchUserInfoById).toHaveBeenCalledTimes(2)
    expect(fetchUserInfoById.mock.calls[0][0]).toEqual(['u1'])
    expect(fetchUserInfoById.mock.calls[1][0]).toEqual(['u2'])
  })

  it('已缓存（属性已覆盖）的 id 不重复请求，调用方仍 resolve 缓存子集', async () => {
    const client = makeClient()
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    fetchUserInfoById.mockResolvedValue(wireData({ u2: { nickname: '新昵称' } }))
    const cached: UserInfo = { userId: 'u1', nickname: '缓存昵称' }
    const store = makeStore({ fetchedIds: ['u1'], cached: [cached] })
    const domain = new UserInfoDomain(client, store)

    const [r1, r2] = await Promise.all([
      domain.fetchUserInfos(['u1']),
      domain.fetchUserInfos(['u2']),
    ])

    expect(fetchUserInfoById).toHaveBeenCalledTimes(1)
    expect(fetchUserInfoById.mock.calls[0][0]).toEqual(['u2'])
    expect(r1).toEqual([cached])
    expect(r2[0]?.nickname).toBe('新昵称')
    expect(store.markLoading).toHaveBeenCalledWith(['u2'])
  })

  it('全部 id 均已缓存时不发底层请求', async () => {
    const client = makeClient()
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    const cached: UserInfo = { userId: 'u1', nickname: '缓存昵称' }
    const store = makeStore({ fetchedIds: ['u1'], cached: [cached] })
    const domain = new UserInfoDomain(client, store)

    const result = await domain.fetchUserInfos(['u1'])

    expect(fetchUserInfoById).not.toHaveBeenCalled()
    expect(store.markLoading).not.toHaveBeenCalled()
    expect(result).toEqual([cached])
  })

  it('底层请求失败时 markFetchFailed 语义不变，各调用 resolve 空子集', async () => {
    const client = makeClient()
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    fetchUserInfoById.mockRejectedValue(new Error('network'))
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
    const fetchUserInfoById = client.connection!.fetchUserInfoById as unknown as ReturnType<typeof vi.fn>
    fetchUserInfoById.mockResolvedValue(wireData({ u1: { nickname: '有' } }))
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

  it('未连接时直接 resolve 空结果且不入队列', async () => {
    const client = makeClient(false)
    const store = makeStore()
    const domain = new UserInfoDomain(client, store)

    const result = await domain.fetchUserInfos(['u1'])

    expect(result).toEqual([])
    expect(client.connection!.fetchUserInfoById).not.toHaveBeenCalled()
    expect(store.markLoading).not.toHaveBeenCalled()
  })
})
