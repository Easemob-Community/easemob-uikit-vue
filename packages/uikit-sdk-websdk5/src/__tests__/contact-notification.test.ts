// @vitest-environment jsdom
// 依赖链经 adapter/message-adapter 引入 SDK 入口（模块加载时访问 `self`），需在 jsdom 下运行
import { CONVERSATION_TYPE } from '@easemob/uikit-sdk-contract'
import type { UserInfo } from '@easemob/uikit-sdk-contract'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyContactEvent } from '../notification-engine'
import { setEventHandlerDeps } from '../event/deps'
import type { EventHandlerDeps, NotificationApis, NotificationItemInput, NotificationStateSnapshot } from '../event/deps'
import type { EventStores } from '../event/types'

const PEER = 'peer1'

/** 注入事件层依赖，返回通知 mock 便于断言 */
function setupDeps(stateOverrides: Partial<NotificationStateSnapshot> = {}) {
  const state: NotificationStateSnapshot = {
    enabled: true,
    browserEnabled: true,
    inAppEnabled: true,
    triggerMode: 'background',
    ...stateOverrides,
  }
  const notify = vi.fn()
  const notifyBrowser = vi.fn<[NotificationItemInput], Promise<boolean>>(async () => true)
  const emitNotificationDelivered = vi.fn()
  const apis: NotificationApis = {
    state: { value: state },
    notify,
    notifyBrowser,
  }
  const deps: EventHandlerDeps = {
    t: (key: string) => key,
    insertChatNotice: vi.fn(),
    buildAnnouncementNoticeText: vi.fn(() => ''),
    resolveNoticeUserName: (user?: UserInfo | null) => user?.nickname || user?.userId || '',
    useNotification: () => apis,
    emitNotificationDelivered,
  }
  setEventHandlerDeps(deps)
  return { state, notify, notifyBrowser, emitNotificationDelivered }
}

/** 构造最小 store 集合（仅 notifyContactEvent 用到的字段/方法） */
function makeStores(userInfo?: Partial<UserInfo>): EventStores {
  return {
    userInfo: { getUserInfo: vi.fn(() => userInfo) },
    client: { currentUser: 'me' },
  } as unknown as EventStores
}

/** 切换页面可见性（jsdom 默认 visible） */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

/** 等待 notifyBrowser promise 链落定 */
async function flushMicrotasks() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('notifyContactEvent（联系人关系变更通知）', () => {
  beforeEach(() => {
    setVisibility('visible')
  })

  it('总开关关闭时不通知', () => {
    const mock = setupDeps({ enabled: false })
    notifyContactEvent(makeStores(), PEER, 'declined')
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).not.toHaveBeenCalled()
  })

  it('页面可见时仍走页内弹窗（跳过 triggerMode 判定）', () => {
    const mock = setupDeps({ triggerMode: 'background' })
    notifyContactEvent(makeStores({ nickname: '对方昵称', avatarUrl: 'a.png' }), PEER, 'declined')
    expect(mock.notify).toHaveBeenCalledTimes(1)
    const item = mock.notify.mock.calls[0][0]
    expect(item.title).toBe('对方昵称')
    expect(item.body).toBe('contact.inviteDeclinedByPeer')
    expect(item.avatar).toBe('a.png')
    expect(item.conversationId).toBe(PEER)
    expect(item.conversationType).toBe(CONVERSATION_TYPE.SINGLECHAT)
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(item, 'in-app')
  })

  it('被好友删除使用 contactDeleted 文案', () => {
    const mock = setupDeps()
    notifyContactEvent(makeStores(), PEER, 'deleted')
    const item = mock.notify.mock.calls[0][0]
    expect(item.body).toBe('chat.notice.contactDeleted')
    // 无用户资料时标题回落用户 ID
    expect(item.title).toBe(PEER)
  })

  it('页面隐藏走浏览器通知，送达回调 channel 为 browser', async () => {
    const mock = setupDeps()
    setVisibility('hidden')
    notifyContactEvent(makeStores(), PEER, 'declined')
    await flushMicrotasks()
    expect(mock.notifyBrowser).toHaveBeenCalledTimes(1)
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(expect.objectContaining({ conversationId: PEER }), 'browser')
  })

  it('页面隐藏且浏览器通知失败时降级页内弹窗', async () => {
    const mock = setupDeps()
    mock.notifyBrowser.mockResolvedValue(false)
    setVisibility('hidden')
    notifyContactEvent(makeStores(), PEER, 'deleted')
    await flushMicrotasks()
    expect(mock.notify).toHaveBeenCalledTimes(1)
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(expect.objectContaining({ conversationId: PEER }), 'in-app')
  })

  it('页内开关关闭且浏览器通知不可用时完全不投递', async () => {
    const mock = setupDeps({ browserEnabled: false, inAppEnabled: false })
    setVisibility('hidden')
    notifyContactEvent(makeStores(), PEER, 'declined')
    await flushMicrotasks()
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).not.toHaveBeenCalled()
  })
})
