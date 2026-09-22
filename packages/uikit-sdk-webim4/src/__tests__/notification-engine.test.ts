// @vitest-environment jsdom
// 依赖链经 adapter/conversation-adapter 引入 4.x SDK 入口（模块加载时访问 `self`），需在 jsdom 下运行
import type { UiConversation, UiMessage } from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-sdk-contract'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyContactEvent, notifyOnNewMessage } from '../notification-engine'
import { setEventHandlerDeps } from '../event/deps'
import type { EventHandlerDeps, NotificationApis, NotificationItemInput, NotificationStateSnapshot } from '../event/deps'
import type { EventStores } from '../event/types'

const SELF = 'me'
const PEER = 'peer1'

/** 构造中立 UiMessage（单聊文本消息） */
function makeUiMsg(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'srv-1',
    from: PEER,
    to: SELF,
    sender: { userId: PEER },
    conversationId: PEER,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    status: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: 1700000000000,
    body: { content: 'hello' },
    ...overrides,
  } as UiMessage
}

/** 构造中立会话 */
function makeConversation(id: string, overrides: Partial<UiConversation> = {}): UiConversation {
  return {
    id,
    name: id,
    type: CONVERSATION_TYPE.SINGLECHAT,
    unreadCount: 0,
    lastMessageText: '',
    isPinned: false,
    isMuted: false,
    marks: [],
    ...overrides,
  }
}

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
    resolveNoticeUserName: vi.fn(() => ''),
    useNotification: () => apis,
    emitNotificationDelivered,
  }
  setEventHandlerDeps(deps)
  return { apis, state, notify, notifyBrowser, emitNotificationDelivered }
}

/** 构造最小 store 集合（仅通知判定链用到的字段/方法） */
function makeStores(overrides: {
  currentConversationId?: string | null
  conversationList?: UiConversation[]
} = {}): EventStores {
  return {
    conversation: {
      conversationList: overrides.conversationList ?? [makeConversation(PEER)],
      currentConversationId: overrides.currentConversationId ?? null,
    },
    contact: { getContact: vi.fn(() => undefined) },
    userInfo: { getUserInfo: vi.fn(() => undefined) },
    client: { currentUser: SELF },
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

describe('notifyOnNewMessage 判定链', () => {
  beforeEach(() => {
    setVisibility('visible')
  })

  it('总开关关闭时不通知', () => {
    const mock = setupDeps({ enabled: false })
    notifyOnNewMessage(makeStores(), makeUiMsg())
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
  })

  it('自己发送的消息不通知', () => {
    const mock = setupDeps()
    notifyOnNewMessage(makeStores(), makeUiMsg({ from: SELF }))
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
  })

  it('当前打开的会话不通知', () => {
    const mock = setupDeps()
    setVisibility('hidden')
    notifyOnNewMessage(makeStores({ currentConversationId: PEER }), makeUiMsg())
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
  })

  it('免打扰会话不通知', () => {
    const mock = setupDeps()
    setVisibility('hidden')
    const stores = makeStores({ conversationList: [makeConversation(PEER, { isMuted: true })] })
    notifyOnNewMessage(stores, makeUiMsg())
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
  })

  it('background 模式下页面可见不通知', () => {
    const mock = setupDeps({ triggerMode: 'background' })
    notifyOnNewMessage(makeStores(), makeUiMsg())
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
  })

  it('background 模式 + 页面隐藏：浏览器通知优先并回执 browser 通道', async () => {
    const mock = setupDeps({ triggerMode: 'background' })
    setVisibility('hidden')
    notifyOnNewMessage(makeStores(), makeUiMsg())
    await flushMicrotasks()
    expect(mock.notifyBrowser).toHaveBeenCalledTimes(1)
    expect(mock.notify).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(expect.anything(), 'browser')
    // 单聊标题为发送者名（无联系人/资料时回退 userId）
    expect(mock.notifyBrowser.mock.calls[0][0].title).toBe(PEER)
  })

  it('浏览器通知失败时降级页内弹窗并回执 in-app 通道', async () => {
    const mock = setupDeps({ triggerMode: 'background' })
    mock.notifyBrowser.mockResolvedValue(false)
    setVisibility('hidden')
    notifyOnNewMessage(makeStores(), makeUiMsg())
    await flushMicrotasks()
    expect(mock.notifyBrowser).toHaveBeenCalledTimes(1)
    expect(mock.notify).toHaveBeenCalledTimes(1)
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(expect.anything(), 'in-app')
  })

  it('always 模式 + 页面可见：仅页内弹窗', () => {
    const mock = setupDeps({ triggerMode: 'always' })
    notifyOnNewMessage(makeStores(), makeUiMsg())
    expect(mock.notify).toHaveBeenCalledTimes(1)
    expect(mock.notifyBrowser).not.toHaveBeenCalled()
    expect(mock.emitNotificationDelivered).toHaveBeenCalledWith(expect.anything(), 'in-app')
  })

  it('群聊通知标题取群名，正文带发送者前缀', () => {
    const mock = setupDeps({ triggerMode: 'always' })
    const stores = makeStores({
      conversationList: [makeConversation('g1', { name: '测试群', type: CONVERSATION_TYPE.GROUPCHAT })],
    })
    const uiMsg = makeUiMsg({
      conversationId: 'g1',
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      to: 'g1',
    })
    notifyOnNewMessage(stores, uiMsg)
    expect(mock.notify).toHaveBeenCalledTimes(1)
    const item = mock.notify.mock.calls[0][0]
    expect(item.title).toBe('测试群')
    expect(item.body).toBe(`${PEER}: hello`)
  })
})

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
    notifyContactEvent(makeStores(), PEER, 'declined')
    expect(mock.notify).toHaveBeenCalledTimes(1)
    const item = mock.notify.mock.calls[0][0]
    expect(item.body).toBe('contact.inviteDeclinedByPeer')
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
})
