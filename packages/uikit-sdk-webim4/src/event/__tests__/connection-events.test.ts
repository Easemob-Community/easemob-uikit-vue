import { describe, expect, it, vi } from 'vitest'
import { createConnectionHandlers } from '../connection-events'
import { createUserInfoStore } from '../../adapter/internal-stores/user-info'

function makeStores() {
  return {
    client: {
      setConnected: vi.fn(),
      setConnecting: vi.fn(),
      setHasConnectedOnce: vi.fn(),
      setKicked: vi.fn(),
    },
    conversation: { conversationsLoaded: true },
    message: { setSyncingMessages: vi.fn() },
  }
}

describe('connection-events 用户资料失败恢复（4.x）', () => {
  it('内置 store 支持按 ID 清理并保留其他失败状态', () => {
    const userInfo = createUserInfoStore(() => undefined)
    userInfo.markFetchFailed(['u1', 'u2'])

    userInfo.clearFetchFailed?.(['u1'])

    expect(userInfo.isFetchFailed('u1')).toBe(false)
    expect(userInfo.isFetchFailed('u2')).toBe(true)
  })

  it('onConnected 清理全部拉取失败状态并保留连接状态更新', () => {
    const userInfo = createUserInfoStore(() => undefined)
    userInfo.markFetchFailed(['u1', 'u2'])
    const stores = { ...makeStores(), userInfo }

    createConnectionHandlers(stores).onConnected?.()

    expect(userInfo.isFetchFailed('u1')).toBe(false)
    expect(userInfo.isFetchFailed('u2')).toBe(false)
    expect(stores.client.setConnected).toHaveBeenCalledWith(true)
    expect(stores.client.setHasConnectedOnce).toHaveBeenCalledWith(true)
  })
})

describe('connection-events 被踢识别（4.x）', () => {
  it('onDisconnected 携带被踢/账号失效错误码（error.type 206/207/214/216/217）时标记 kicked', () => {
    for (const code of [206, 207, 214, 216, 217]) {
      const stores = makeStores()
      const handlers = createConnectionHandlers(stores)
      handlers.onDisconnected?.({ type: code, message: 'kicked' } as never)
      expect(stores.client.setKicked).toHaveBeenCalledWith(code)
      expect(stores.client.setConnected).toHaveBeenCalledWith(false)
    }
  })

  it('普通断网（无 error 或非被踢码）不标记 kicked', () => {
    const stores = makeStores()
    const handlers = createConnectionHandlers(stores)
    handlers.onDisconnected?.(undefined)
    handlers.onDisconnected?.({ type: 400, message: 'other' } as never)
    expect(stores.client.setKicked).not.toHaveBeenCalled()
    expect(stores.client.setConnected).toHaveBeenCalledTimes(2)
  })
})
