import { effectScope } from 'vue'
import { ALL_USER_INFO_ATTRIBUTES } from '@easemob-community/uikit-sdk-contract'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOwnUserInfo } from './use-own-user-info'

const holder = vi.hoisted(() => ({
  hasOwnInfo: true,
  fetchOwnInfo: vi.fn(),
  fetchUserInfos: vi.fn(),
}))

vi.mock('./use-uikit', () => ({
  useCoreUIKit: () => ({
    client: { value: { currentUserId: 'me' } },
    stores: {
      client: { currentUser: 'me' },
      userInfo: {
        areAttributesFetched: () => false,
        isLoading: () => false,
        isFetchFailed: () => false,
        getUserInfo: () => undefined,
      },
    },
    domains: {
      userInfo: holder.hasOwnInfo
        ? { fetchOwnInfo: holder.fetchOwnInfo, fetchUserInfos: holder.fetchUserInfos }
        : { fetchUserInfos: holder.fetchUserInfos },
    },
    features: {},
  }),
}))

describe('useOwnUserInfo 自身资料拉取链路', () => {
  beforeEach(() => {
    holder.hasOwnInfo = true
    holder.fetchOwnInfo.mockClear()
    holder.fetchUserInfos.mockClear()
  })

  it('adapter 提供 fetchOwnInfo 时走独立链路', () => {
    const scope = effectScope()
    scope.run(() => useOwnUserInfo())
    scope.stop()

    expect(holder.fetchOwnInfo).toHaveBeenCalledWith(ALL_USER_INFO_ATTRIBUTES, { source: 'own' })
    expect(holder.fetchUserInfos).not.toHaveBeenCalled()
  })

  it('adapter 未实现 fetchOwnInfo 时回退单 ID fetchUserInfos', () => {
    holder.hasOwnInfo = false
    const scope = effectScope()
    scope.run(() => useOwnUserInfo())
    scope.stop()

    expect(holder.fetchOwnInfo).not.toHaveBeenCalled()
    expect(holder.fetchUserInfos).toHaveBeenCalledWith(['me'], ALL_USER_INFO_ATTRIBUTES, { source: 'own' })
  })
})
