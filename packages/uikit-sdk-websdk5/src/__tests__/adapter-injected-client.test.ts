import type { SdkConfig } from '@easemob/uikit-sdk-contract'
import { SDK_CONTRACT_VERSION } from '@easemob/uikit-sdk-contract'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WEBSDK5_MANAGERS, Websdk5Adapter } from '../adapter'
import type { UIKitClient } from '../client'
import { createClient } from '../client'

// easemob-websdk 是浏览器 SDK，node 测试环境只保留 adapter 静态引用的 manager 类
// 与 utils/sdk-error 的 isSDKError 占位，避免加载真实 SDK
vi.mock('easemob-websdk', () => ({
  ChatManager: class ChatManager {},
  ChatRoomManager: class ChatRoomManager {},
  ContactManager: class ContactManager {},
  GroupManager: class GroupManager {},
  PresenceManager: class PresenceManager {},
  PushManager: class PushManager {},
  UserInfoManager: class UserInfoManager {},
  isSDKError: (err: unknown) => err instanceof Error,
}))

// createClient 替换为 spy：注入模式下断言「未被调用」即可证明 adapter 未自建 ChatClient
vi.mock('../client', () => ({
  createClient: vi.fn(),
}))

const mockedCreateClient = vi.mocked(createClient)

/** 构造 SDK manager mock：事件层注册只用到 add/removeEventHandler */
function makeManager() {
  return {
    addEventHandler: vi.fn(),
    removeEventHandler: vi.fn(),
  }
}

/** 构造注入用 client mock（UIKitClient 结构形状），login/logout 等全部为 vi.fn 以便断言委托 */
function makeSdkClient() {
  return {
    chatManager: makeManager(),
    chatRoomManager: makeManager(),
    contactManager: makeManager(),
    groupManager: makeManager(),
    presenceManager: makeManager(),
    pushManager: makeManager(),
    userInfoManager: makeManager(),
    currentUserId: null as string | null,
    isConnected: true,
    deleteConversationOnGroupDestroyed: true,
    addEventHandler: vi.fn(),
    removeEventHandler: vi.fn(),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

const INIT_CONFIG: SdkConfig = { appKey: 'easemob#test' }

/** 构造注入模式 adapter 并完成 init，返回 adapter 与注入实例 mock */
async function setupInjectedAdapter() {
  const injected = makeSdkClient()
  const adapter = new Websdk5Adapter(injected as unknown as UIKitClient)
  await adapter.init(INIT_CONFIG)
  return { adapter, injected }
}

describe('websdk5Adapter 注入 client 模式（决策 17/18）', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset()
  })

  it('init 不再自行创建 ChatClient，直接使用注入实例', async () => {
    const { adapter, injected } = await setupInjectedAdapter()

    expect(mockedCreateClient).not.toHaveBeenCalled()
    expect(adapter.client).toBe(injected)
  })

  it('init 在注入实例上注册 IM 事件套件（连接级 + 各 manager + 用户资料监听）', async () => {
    const { injected } = await setupInjectedAdapter()

    expect(injected.addEventHandler).toHaveBeenCalledWith('uikit-conn', expect.any(Object))
    expect(injected.chatManager.addEventHandler).toHaveBeenCalledWith('uikit-chat', expect.any(Object))
    expect(injected.contactManager.addEventHandler).toHaveBeenCalledWith('uikit-contact', expect.any(Object))
    expect(injected.groupManager.addEventHandler).toHaveBeenCalledWith('uikit-group', expect.any(Object))
    expect(injected.presenceManager.addEventHandler).toHaveBeenCalledWith('uikit-presence', expect.any(Object))
    // UserInfoDomain.listen 注册用户资料变更监听
    expect(injected.userInfoManager.addEventHandler).toHaveBeenCalledTimes(1)
  })

  it('login 委托到注入实例的 login，透传 user 与 token', async () => {
    const { adapter, injected } = await setupInjectedAdapter()

    await adapter.login('user-a', 'token-a')

    expect(injected.login).toHaveBeenCalledTimes(1)
    expect(injected.login).toHaveBeenCalledWith('user-a', 'token-a')
  })

  it('logout 委托注入实例 logout 并反注册事件，但不销毁注入实例', async () => {
    const { adapter, injected } = await setupInjectedAdapter()

    await adapter.logout()

    expect(injected.logout).toHaveBeenCalledTimes(1)
    // 事件处理器 / 同步状态监听 / 用户资料监听随 logout 清理
    expect(injected.removeEventHandler).toHaveBeenCalledWith('uikit-conn')
    expect(injected.chatManager.removeEventHandler).toHaveBeenCalledWith('uikit-chat')
    expect(injected.contactManager.removeEventHandler).toHaveBeenCalledWith('uikit-contact')
    expect(injected.groupManager.removeEventHandler).toHaveBeenCalledWith('uikit-group')
    expect(injected.presenceManager.removeEventHandler).toHaveBeenCalledWith('uikit-presence')
    expect(injected.userInfoManager.removeEventHandler).toHaveBeenCalledTimes(1)
    // 注入实例所有权归业务：adapter 不置空、不销毁，仍可继续借用
    expect(adapter.client).toBe(injected)
  })

  it('logout 后重新 login 会在注入实例上重建事件注册', async () => {
    const { adapter, injected } = await setupInjectedAdapter()
    await adapter.logout()

    await adapter.login('user-a', 'token-a')

    // init 一次 + 重新 login 一次，连接级事件共注册两次
    const connRegistrations = injected.addEventHandler.mock.calls.filter(([id]) => id === 'uikit-conn')
    expect(connRegistrations).toHaveLength(2)
    expect(injected.chatManager.addEventHandler.mock.calls.filter(([id]) => id === 'uikit-chat')).toHaveLength(2)
    // 用户资料监听同样重建
    expect(injected.userInfoManager.addEventHandler).toHaveBeenCalledTimes(2)
  })

  it('capabilities 正常上报，含 contractVersion', async () => {
    const { adapter } = await setupInjectedAdapter()

    expect(adapter.capabilities).toMatchObject({
      combineMessage: true,
      pinnedMessage: true,
      streamingMessage: true,
      groupReadReceipt: true,
    })
    expect(adapter.capabilities.contractVersion).toBe(SDK_CONTRACT_VERSION)
  })

  it('对照：未注入时 init 经 createClient 自建内置 client', async () => {
    const builtin = makeSdkClient()
    mockedCreateClient.mockReturnValue(builtin as unknown as UIKitClient)
    const adapter = new Websdk5Adapter()

    await adapter.init(INIT_CONFIG)

    expect(mockedCreateClient).toHaveBeenCalledTimes(1)
    // 内置模式默认使用 IM manager 注册列表
    expect(mockedCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ appKey: INIT_CONFIG.appKey, managers: WEBSDK5_MANAGERS }),
    )
    expect(adapter.client).toBe(builtin)
  })
})
