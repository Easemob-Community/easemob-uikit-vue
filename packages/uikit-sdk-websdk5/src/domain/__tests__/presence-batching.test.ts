import { describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import type { PresenceStoreLike } from '../presence-domain'
import { PRESENCE_REQUEST_BATCH_SIZE, PresenceDomain } from '../presence-domain'

function makeClient() {
  const presenceManager = {
    subscribePresence: vi.fn(async ({ userIds }: { userIds: string[] }) =>
      userIds.map(userId => ({ publisher: userId, statusList: { web: 1 }, ext: '', latestTime: 1 }))),
    unsubscribePresence: vi.fn(async () => {}),
    getPresenceStatus: vi.fn(async ({ userIds }: { userIds: string[] }) =>
      userIds.map(userId => ({ publisher: userId, statusList: { web: 1 }, ext: '', latestTime: 1 }))),
    publishPresence: vi.fn(async () => {}),
  }
  return { client: { isConnected: true, presenceManager } as unknown as ManagerHost, presenceManager }
}

function makeStore() {
  return {
    updateBatch: vi.fn(),
    setSubscribed: vi.fn(),
  } as unknown as PresenceStoreLike & {
    updateBatch: ReturnType<typeof vi.fn>
    setSubscribed: ReturnType<typeof vi.fn>
  }
}

describe('PresenceDomain 100 人分片（websdk5）', () => {
  it('订阅 205 个 ID 按 100/100/5 顺序请求，并逐片记账', async () => {
    const { client, presenceManager } = makeClient()
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    const result = await domain.subscribe(userIds)

    expect(presenceManager.subscribePresence.mock.calls.map(call => call[0].userIds)).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(store.setSubscribed.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(100, 200),
      userIds.slice(200),
    ])
    expect(result).toHaveLength(205)
  })

  it('查询 205 个 ID 同样分片，空数组与重复 ID 不产生请求', async () => {
    const { client, presenceManager } = makeClient()
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.fetchStatus(userIds)
    expect(presenceManager.getPresenceStatus).toHaveBeenCalledTimes(3)

    presenceManager.getPresenceStatus.mockClear()
    await domain.fetchStatus([])
    await domain.fetchStatus(['u1', 'u1'])
    expect(presenceManager.getPresenceStatus).toHaveBeenCalledTimes(1)
    expect(presenceManager.getPresenceStatus.mock.calls[0][0].userIds).toEqual(['u1'])
  })

  it('中间分片失败不阻断后续分片，全部结束后抛出首个错误且只记账成功分片', async () => {
    const { client, presenceManager } = makeClient()
    let callIndex = 0
    presenceManager.subscribePresence.mockImplementation(async ({ userIds }: { userIds: string[] }) => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('chunk failed')
      return userIds.map(userId => ({ publisher: userId, statusList: { web: 1 }, ext: '', latestTime: 1 }))
    })
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await expect(domain.subscribe(userIds)).rejects.toThrow('chunk failed')

    expect(presenceManager.subscribePresence).toHaveBeenCalledTimes(3)
    expect(store.setSubscribed.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(200),
    ])
  })

  it('退订 205 个 ID 按 100 分片，单片失败不抛出', async () => {
    const { client, presenceManager } = makeClient()
    presenceManager.unsubscribePresence.mockRejectedValueOnce(new Error('chunk failed'))
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await expect(domain.unsubscribe(userIds)).resolves.toBeUndefined()
    expect(presenceManager.unsubscribePresence).toHaveBeenCalledTimes(3)
  })
})

describe('PresenceDomain 分片常量', () => {
  it('分片大小为服务端上限 100', () => {
    expect(PRESENCE_REQUEST_BATCH_SIZE).toBe(100)
  })
})
