import { describe, expect, it, vi } from 'vitest'
import { createConnectionHandlers } from '../connection-events'

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

/** 构造最小合法的 5.x ConnectionEventPayload */
function makePayload(errorCode?: number) {
  return {
    state: 'disconnected',
    reason: 'close',
    attempt: 0,
    maxAttempts: 5,
    isLoginPhase: false,
    isOnline: true,
    errorCode,
    timestamp: Date.now(),
  } as never
}

describe('connection-events 被踢识别（5.x）', () => {
  it('onDisconnected 携带被踢/账号失效错误码（206/207/214/216/217）时标记 kicked', () => {
    for (const code of [206, 207, 214, 216, 217]) {
      const stores = makeStores()
      const handlers = createConnectionHandlers(stores)
      handlers.onDisconnected?.(makePayload(code))
      expect(stores.client.setKicked).toHaveBeenCalledWith(code)
      expect(stores.client.setConnected).toHaveBeenCalledWith(false)
    }
  })

  it('普通断网（无 errorCode 或非被踢码）不标记 kicked', () => {
    const stores = makeStores()
    const handlers = createConnectionHandlers(stores)
    handlers.onDisconnected?.(makePayload(undefined))
    handlers.onDisconnected?.(makePayload(0))
    expect(stores.client.setKicked).not.toHaveBeenCalled()
    expect(stores.client.setConnected).toHaveBeenCalledTimes(2)
  })
})
