import type { SdkConfig } from '@easemob-community/uikit-sdk-contract'
import { setLogCollector } from '@easemob-community/uikit-sdk-contract'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Webim4Adapter } from '../adapter'
import type { Webim4Client } from '../client'

vi.mock('easemob-websdk-4', () => ({
  default: {
    connection: vi.fn(),
    logger: { setLevel: vi.fn() },
  },
}))

const logEntries: Array<{ level: string, ns: string, message: string, args: unknown[] }> = []

function makeSdkClient() {
  return {
    connection: {
      addEventHandler: vi.fn(),
      removeEventHandler: vi.fn(),
    },
    currentUserId: '',
    isConnected: true,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
  }
}

function makeLoginConfig(setCurrentUser: ReturnType<typeof vi.fn>): SdkConfig {
  return {
    appKey: 'easemob#test',
    adapterConfig: {
      prefetchOnLogin: false,
      stores: { client: { setCurrentUser } },
    },
  }
}

async function setupInjectedAdapter(config: SdkConfig) {
  const injected = makeSdkClient()
  const adapter = new Webim4Adapter(injected as unknown as Webim4Client)
  await adapter.init(config)
  return { adapter, injected }
}

function getUserIdWarnings() {
  return logEntries.filter(entry => entry.level === 'warn' && entry.message.includes('userId'))
}

describe('webim4Adapter 登录用户 ID 归一化', () => {
  beforeEach(() => {
    logEntries.length = 0
    setLogCollector(entry => logEntries.push(entry))
  })

  afterEach(() => {
    setLogCollector(null)
  })

  it('纯小写用户原样登录并记账，不输出转换警告', async () => {
    const setCurrentUser = vi.fn()
    const { adapter, injected } = await setupInjectedAdapter(makeLoginConfig(setCurrentUser))

    await adapter.login('user-a', 'token-a')

    expect(injected.login).toHaveBeenCalledWith('user-a', 'token-a')
    expect(setCurrentUser).toHaveBeenCalledWith('user-a')
    expect(getUserIdWarnings()).toHaveLength(0)
  })

  it.each([
    ['User-A', 'user-a'],
    ['USER-A', 'user-a'],
  ])('混写或全大写用户 %s 转为小写后登录并记账', async (input, expected) => {
    const setCurrentUser = vi.fn()
    const { adapter, injected } = await setupInjectedAdapter(makeLoginConfig(setCurrentUser))

    await adapter.login(input, 'token-a')

    expect(injected.login).toHaveBeenCalledWith(expected, 'token-a')
    expect(setCurrentUser).toHaveBeenCalledWith(expected)
    expect(getUserIdWarnings()).toHaveLength(1)
    expect(getUserIdWarnings()[0]?.args[0]).toEqual({
      originalUserId: input,
      normalizedUserId: expected,
    })
  })

  it('混写用户登录失败后清空已提前记账的当前用户', async () => {
    const setCurrentUser = vi.fn()
    const { adapter, injected } = await setupInjectedAdapter(makeLoginConfig(setCurrentUser))
    injected.login.mockRejectedValueOnce(new Error('login failed'))

    await expect(adapter.login('User-A', 'token-a')).rejects.toThrow('login failed')

    expect(setCurrentUser).toHaveBeenNthCalledWith(1, 'user-a')
    expect(setCurrentUser).toHaveBeenNthCalledWith(2, '')
  })

})
