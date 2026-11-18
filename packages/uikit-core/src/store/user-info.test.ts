import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserInfoStore } from './user-info'

describe('userInfo store 拉取失败恢复', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('支持按 ID 清理并保留其他失败状态', () => {
    const store = useUserInfoStore()
    store.markFetchFailed(['u1', 'u2'])

    store.clearFetchFailed(['u1'])

    expect(store.isFetchFailed('u1')).toBe(false)
    expect(store.isFetchFailed('u2')).toBe(true)
  })

  it('缺省参数清理全部失败状态', () => {
    const store = useUserInfoStore()
    store.markFetchFailed(['u1', 'u2'])

    store.clearFetchFailed()

    expect(store.isFetchFailed('u1')).toBe(false)
    expect(store.isFetchFailed('u2')).toBe(false)
  })
})
