import { describe, expect, it, vi } from 'vitest'
import type { Webim4Client } from '../../client'
import type { PresenceStoreLike } from '../../event/types'
import { PRESENCE_REQUEST_BATCH_SIZE, PresenceDomain } from '../presence-domain'

function presenceList(usernames: string[]) {
  return {
    data: {
      result: usernames.map(uid => ({ uid, status: { web: 1 }, ext: '', last_time: 1 })),
    },
  }
}

function makeClient() {
  const connection = {
    subscribePresence: vi.fn(async ({ usernames }: { usernames: string[] }) => presenceList(usernames)),
    unsubscribePresence: vi.fn(async () => {}),
    getPresenceStatus: vi.fn(async ({ usernames }: { usernames: string[] }) => presenceList(usernames)),
    publishPresence: vi.fn(async () => {}),
  }
  return { client: { isConnected: true, connection } as unknown as Webim4Client, connection }
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

describe('PresenceDomain 100 人分片（webim4）', () => {
  it('订阅 205 个 ID 按 100/100/5 顺序请求，并逐片记账', async () => {
    const { client, connection } = makeClient()
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    const result = await domain.subscribe(userIds)

    expect(connection.subscribePresence.mock.calls.map(call => call[0].usernames)).toEqual([
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

  it('查询 205 个 ID 同样分片；空数组与重复 ID 去重后只发一次', async () => {
    const { client, connection } = makeClient()
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await domain.fetchStatus(userIds)
    expect(connection.getPresenceStatus).toHaveBeenCalledTimes(3)

    connection.getPresenceStatus.mockClear()
    await domain.fetchStatus([])
    await domain.fetchStatus(['u1', 'u1'])
    expect(connection.getPresenceStatus).toHaveBeenCalledTimes(1)
    expect(connection.getPresenceStatus.mock.calls[0][0].usernames).toEqual(['u1'])
  })

  it('中间分片失败不阻断后续分片，全部结束后抛出首个错误', async () => {
    const { client, connection } = makeClient()
    let callIndex = 0
    connection.subscribePresence.mockImplementation(async ({ usernames }: { usernames: string[] }) => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('chunk failed')
      return presenceList(usernames)
    })
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await expect(domain.subscribe(userIds)).rejects.toThrow('chunk failed')
    expect(connection.subscribePresence).toHaveBeenCalledTimes(3)
    expect(store.setSubscribed.mock.calls.map(call => call[0])).toEqual([
      userIds.slice(0, 100),
      userIds.slice(200),
    ])
  })

  it('退订 205 个 ID 按 100 分片，单片失败不抛出', async () => {
    const { client, connection } = makeClient()
    connection.unsubscribePresence.mockRejectedValueOnce(new Error('chunk failed'))
    const store = makeStore()
    const domain = new PresenceDomain(client, store)
    const userIds = Array.from({ length: 205 }, (_, index) => `u${index}`)

    await expect(domain.unsubscribe(userIds)).resolves.toBeUndefined()
    expect(connection.unsubscribePresence).toHaveBeenCalledTimes(3)
  })
})

describe('PresenceDomain 分片常量（webim4）', () => {
  it('分片大小为服务端上限 100', () => {
    expect(PRESENCE_REQUEST_BATCH_SIZE).toBe(100)
  })
})
