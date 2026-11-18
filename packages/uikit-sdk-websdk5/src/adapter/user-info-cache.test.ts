import { describe, expect, it, vi } from 'vitest'
import type { UIKitClient } from '../client'
import { readSdkCachedUserInfos } from './user-info-cache'

describe('sdk 用户资料缓存读取', () => {
  it('runtime 资料优先，summary 兜底并保持输入顺序', () => {
    const client = {
      getCacheManager: () => ({
        getRuntimeUserInfo: (userId: string) => userId === 'u1'
          ? { userId, nickname: '运行时昵称', avatarUrl: 'runtime-avatar' }
          : null,
        getUserInfoSummaries: vi.fn((userIds: string[]) => userIds.map(userId => ({
          userId,
          nickname: userId === 'u2' ? '摘要昵称' : undefined,
          sign: '签名',
          lastAccess: 1,
          lastUpdate: 1,
        }))),
      }),
    } as unknown as UIKitClient

    const result = readSdkCachedUserInfos(client, ['u1', 'u2'])

    expect(result).toEqual([
      { userId: 'u1', nickname: '运行时昵称', avatarUrl: 'runtime-avatar' },
      { userId: 'u2', nickname: '摘要昵称', sign: '签名' },
    ])
  })

  it('getCacheManager 缺失或抛错时返回空数组', () => {
    const missing = { getCacheManager: () => null } as unknown as UIKitClient
    const throwing = {
      getCacheManager: () => { throw new Error('internal changed') },
    } as unknown as UIKitClient

    expect(readSdkCachedUserInfos(missing, ['u1'])).toEqual([])
    expect(readSdkCachedUserInfos(throwing, ['u1'])).toEqual([])
  })
})
