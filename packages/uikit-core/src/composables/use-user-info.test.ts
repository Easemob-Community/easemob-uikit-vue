import { effectScope, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserInfo } from './use-user-info'

const context = vi.hoisted(() => ({
  fetchUserInfos: vi.fn(),
  subscribeUserInfos: vi.fn(),
  unsubscribeUsersInfo: vi.fn(),
  getSubscribedUsers: vi.fn(),
}))

/** 真实响应式 store 替身：用于验证 clearFetchFailed 后 watchEffect 能否重新拉取 */
const holder = vi.hoisted(() => ({
  state: null as null | {
    fetched: boolean
    loading: boolean
    failed: Set<string>
  },
}))

vi.mock('./use-uikit', async () => {
  const { reactive } = await import('vue')
  const state = reactive({
    fetched: false,
    loading: false,
    failed: new Set<string>(),
  })
  holder.state = state
  return {
    useCoreUIKit: () => ({
      stores: {
        userInfo: {
          getUserInfo: vi.fn(),
          areAttributesFetched: () => state.fetched,
          isLoading: () => state.loading,
          isFetchFailed: (userId: string) => state.failed.has(userId),
          isSubscriptionDisabled: () => false,
        },
      },
      domains: { userInfo: context },
      features: {},
    }),
  }
})

describe('useUserInfo 订阅选项', () => {
  beforeEach(() => {
    context.fetchUserInfos.mockClear()
    context.subscribeUserInfos.mockClear()
    holder.state!.fetched = false
    holder.state!.loading = false
    holder.state!.failed.clear()
  })

  it('subscribe=false 时只拉取不订阅', () => {
    const scope = effectScope()
    scope.run(() => useUserInfo('u1', ['nickname'], { source: 'list', subscribe: false }))
    scope.stop()

    expect(context.fetchUserInfos).toHaveBeenCalledWith(['u1'], ['nickname'], { source: 'list' })
    expect(context.subscribeUserInfos).not.toHaveBeenCalled()
  })

  it('缺省 options 保持自动订阅', () => {
    const scope = effectScope()
    scope.run(() => useUserInfo('u1'))
    scope.stop()

    expect(context.subscribeUserInfos).toHaveBeenCalledWith(['u1'], { source: undefined })
  })
})

describe('useUserInfo 重连恢复', () => {
  beforeEach(() => {
    context.fetchUserInfos.mockClear()
    context.subscribeUserInfos.mockClear()
    holder.state!.fetched = false
    holder.state!.loading = false
    holder.state!.failed.clear()
  })

  it('失败状态被清理（重连 onConnected）后已挂载 composable 会重新拉取', async () => {
    holder.state!.failed.add('u1')
    const scope = effectScope()
    scope.run(() => useUserInfo('u1'))

    expect(context.fetchUserInfos).not.toHaveBeenCalled()

    // 等价于 clearFetchFailed(['u1'])：watchEffect 依赖 isFetchFailed，应重新求值并补拉
    holder.state!.failed.delete('u1')
    await nextTick()

    expect(context.fetchUserInfos).toHaveBeenCalledTimes(1)
    scope.stop()
  })
})
