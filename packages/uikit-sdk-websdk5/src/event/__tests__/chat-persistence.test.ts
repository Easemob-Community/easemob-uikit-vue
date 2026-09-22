import type { ChatEventHandlerMap } from 'easemob-websdk'
import type {
  ConversationPersistenceHooks,
  MessagePersistenceHooks,
  SdkMessage,
  UiConversation,
  UiMessage,
} from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE, STREAM_MESSAGE_STATUS } from '@easemob-community/uikit-sdk-contract'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import { setEventHandlerDeps } from '../deps'
import { createChatHandlers } from '../chat-events'
import type { EventStores } from '../types'

const SELF = 'me'
const PEER = 'peer1'

/** 等待 fire-and-forget 钩子链（Promise.resolve().then）执行完毕 */
function flushPersist() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

type HandlerArg<K extends keyof ChatEventHandlerMap> = Parameters<NonNullable<ChatEventHandlerMap[K]>>[0]

/** 构造消息（运行时同时满足 SDK Message 结构） */
function makeMsg(overrides: Partial<SdkMessage> = {}): SdkMessage {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'loc-1',
    from: PEER,
    to: SELF,
    sender: { userId: PEER },
    conversationId: 'u1',
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: 1700000000000,
    body: { content: 'hi' },
    ...overrides,
  }
}

/** 构造 UI 会话（store 现有列表 / DB 预填形状） */
function makeCvs(id: string, overrides: Partial<UiConversation> = {}): UiConversation {
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

/** 构造 SDK 原始会话项（ConversationItem 快照形状） */
function makeRawCvs(conversationId: string, overrides: Record<string, unknown> = {}) {
  return {
    conversationId,
    conversationType: 'singleChat',
    conversationName: conversationId,
    unreadCount: 0,
    ...overrides,
  }
}

function makePersistence() {
  const message = {
    saveMessage: vi.fn(),
    saveMessages: vi.fn(),
    updateMessageStatus: vi.fn(),
    markMessageRecalled: vi.fn(),
    updateMessageContent: vi.fn(),
    deleteMessages: vi.fn(),
  } satisfies MessagePersistenceHooks
  const conversation = {
    saveConversations: vi.fn(),
  } satisfies ConversationPersistenceHooks
  return { message, conversation }
}

function makeStores(prepopulated: UiConversation[] = []) {
  const conversationList: UiConversation[] = [...prepopulated]
  const messageStore = {
    getMessages: vi.fn((): UiMessage[] => []),
    addMessage: vi.fn(),
    replaceMessageById: vi.fn(),
    recallMessage: vi.fn(),
    updateMessageStatus: vi.fn(),
    updateMessageById: vi.fn(),
    deleteMessages: vi.fn(),
    addAtMeMessage: vi.fn(),
  }
  const stores = {
    client: {
      currentUser: SELF,
      client: null,
      setConnected: vi.fn(),
      setConnecting: vi.fn(),
      setHasConnectedOnce: vi.fn(),
      setCurrentUser: vi.fn(),
    },
    message: messageStore,
    conversation: {
      conversationList,
      currentConversationId: null,
      conversationsLoaded: true,
      setConversationList: vi.fn((list: UiConversation[]) => {
        conversationList.length = 0
        conversationList.push(...list)
      }),
      addConversation: vi.fn((cvs: UiConversation) => conversationList.push(cvs)),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      setConversationsLoaded: vi.fn(),
      setSyncingConversations: vi.fn(),
      setTyping: vi.fn(),
      setAtMe: vi.fn(),
      updateUnreadCount: vi.fn(),
    },
    contact: { contactList: [], loaded: true, getContact: vi.fn(() => undefined) },
    group: { groupList: [], loaded: true, updateGroup: vi.fn() },
    userInfo: { getUserInfo: vi.fn(() => undefined) },
    presence: { updateBatch: vi.fn(), setSubscribed: vi.fn() },
  } as unknown as EventStores
  return { stores, messageStore, conversationList }
}

function makeClient(rawConversations: ReturnType<typeof makeRawCvs>[] = []) {
  return {
    currentUserId: SELF,
    chatManager: {
      getConversationList: vi.fn(() => rawConversations),
      clearConversationUnreadMessageCount: vi.fn().mockResolvedValue(undefined),
      sendMessageReadReceipts: vi.fn().mockResolvedValue(undefined),
      refreshSessionList: vi.fn().mockResolvedValue(undefined),
    },
    pushManager: {
      getConversationSilentModes: vi.fn().mockResolvedValue({ conversations: [] }),
    },
    groupManager: {
      getGroupInfoList: vi.fn().mockResolvedValue([]),
    },
  } as unknown as ManagerHost
}

function makeListUpdatePayload(
  items: ReturnType<typeof makeRawCvs>[],
  patch: { reset?: boolean, removed?: Array<{ conversationId: string, conversationType: string }> } = {},
) {
  return {
    version: 1,
    items,
    reason: 'test',
    patch: {
      reset: patch.reset ?? false,
      upserted: [],
      removed: patch.removed ?? [],
      affectedKeys: [],
      orderChanged: true,
    },
  } as unknown as HandlerArg<'onConversationListUpdate'>
}

beforeAll(() => {
  // 事件层依赖桩：通知总开关关闭，onMessage 通知链路早退
  setEventHandlerDeps({
    t: (key: string) => key,
    insertChatNotice: () => {},
    buildAnnouncementNoticeText: () => '',
    resolveNoticeUserName: () => '',
    useNotification: () => ({
      state: { value: { enabled: false, browserEnabled: false, inAppEnabled: false, triggerMode: 'background' as const } },
      notify: () => {},
      notifyBrowser: async () => false,
    }),
    emitNotificationDelivered: () => {},
  })
})

describe('chat-events 旁路持久化（persistence）', () => {
  it('onMessage → saveMessage（清洗后 DTO）；chatRoom / CMD 早退不触发', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    handlers.onMessage?.(makeMsg() as unknown as HandlerArg<'onMessage'>)
    await flushPersist()
    expect(persistence.message.saveMessage).toHaveBeenCalledTimes(1)
    const record = persistence.message.saveMessage.mock.calls[0][0]
    expect(record.msgServerId).toBe('srv-1')

    handlers.onMessage?.(makeMsg({ conversationType: 'chatRoom' }) as unknown as HandlerArg<'onMessage'>)
    handlers.onMessage?.(makeMsg({ type: MESSAGE_TYPE.CMD, body: { action: 'TypingBegin' } }) as unknown as HandlerArg<'onMessage'>)
    await flushPersist()
    expect(persistence.message.saveMessage).toHaveBeenCalledTimes(1)
  })

  it('onStreamMessage 分片不落库（完整消息走 onMessage/漫游路径，与 webim4 对齐）', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    const streamMsg = makeMsg({
      stream: {
        seq: 1,
        status: STREAM_MESSAGE_STATUS.IN_PROGRESS,
        errorType: 0,
        deltaText: 'hello',
        fullText: 'hello',
      },
    })
    handlers.onStreamMessage?.(streamMsg as unknown as HandlerArg<'onStreamMessage'>)
    await flushPersist()
    expect(persistence.message.saveMessage).not.toHaveBeenCalled()
  })

  it('onMessageRecalled → markMessageRecalled（撤回操作者为当前用户）', async () => {
    const persistence = makePersistence()
    const { stores, messageStore } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    handlers.onMessageRecalled?.({
      messageId: 'srv-9',
      conversationId: 'u1',
      conversationType: 'singleChat',
    } as unknown as HandlerArg<'onMessageRecalled'>)
    await flushPersist()
    expect(messageStore.recallMessage).toHaveBeenCalledWith('srv-9', SELF)
    expect(persistence.message.markMessageRecalled).toHaveBeenCalledWith('srv-9', SELF)
  })

  it('onMessageUpdated → updateMessageContent（body / ext / modifiedInfo 透传）', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    const body = { content: 'edited' }
    const ext = { k: 'v' }
    const modifiedInfo = { modifiedCount: 1, operatorId: SELF, modifiedTime: 1700000001000 }
    handlers.onMessageUpdated?.({
      messageId: 'srv-8',
      conversationId: 'u1',
      conversationType: 'singleChat',
      message: { type: 'text', body, ext, modifiedInfo },
    } as unknown as HandlerArg<'onMessageUpdated'>)
    await flushPersist()
    expect(persistence.message.updateMessageContent).toHaveBeenCalledWith('srv-8', body, ext, modifiedInfo)
  })

  it('onMessageDelivered / 单聊已读回执 → updateMessageStatus；群已读数不落库', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    handlers.onMessageDelivered?.({ messageId: 'srv-d' } as unknown as HandlerArg<'onMessageDelivered'>)
    handlers.onMessageReadReceipts?.([
      { conversationType: 'singleChat', messageIds: ['srv-r1', 'srv-r2'], receiptDetails: [] },
      { conversationType: 'groupChat', messageIds: [], receiptDetails: [{ messageId: 'srv-g', count: 3 }] },
    ] as unknown as HandlerArg<'onMessageReadReceipts'>)
    await flushPersist()

    expect(persistence.message.updateMessageStatus).toHaveBeenCalledTimes(3)
    expect(persistence.message.updateMessageStatus).toHaveBeenNthCalledWith(1, 'srv-d', MESSAGE_STATUS.DELIVERED)
    expect(persistence.message.updateMessageStatus).toHaveBeenNthCalledWith(2, 'srv-r1', MESSAGE_STATUS.READ)
    expect(persistence.message.updateMessageStatus).toHaveBeenNthCalledWith(3, 'srv-r2', MESSAGE_STATUS.READ)
    // 群已读数走 updateMessageById（展示态），不触发状态落库
    expect(stores.message.updateMessageById).toHaveBeenCalledWith('srv-g', { groupReadCount: 3 })
  })

  it('onMultiDeviceMessageRemoved 两个删除分支 → deleteMessages', async () => {
    const persistence = makePersistence()
    const { stores, messageStore } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    // messageIds 显式删除分支
    handlers.onMultiDeviceMessageRemoved?.({
      operation: 'MESSAGE_REMOVED',
      conversationId: 'u1',
      messageIds: ['m1', 'm2'],
    } as unknown as HandlerArg<'onMultiDeviceMessageRemoved'>)
    // beforeTimestamp 批量删除分支
    messageStore.getMessages.mockReturnValue([
      { timestamp: 1000, msgServerId: 'old-1' },
      { timestamp: 3000, msgServerId: 'new-1' },
    ] as UiMessage[])
    handlers.onMultiDeviceMessageRemoved?.({
      operation: 'MESSAGE_REMOVED',
      conversationId: 'u1',
      beforeTimestamp: 2000,
    } as unknown as HandlerArg<'onMultiDeviceMessageRemoved'>)
    await flushPersist()

    expect(persistence.message.deleteMessages).toHaveBeenCalledTimes(2)
    expect(persistence.message.deleteMessages).toHaveBeenNthCalledWith(1, ['m1', 'm2'])
    expect(persistence.message.deleteMessages).toHaveBeenNthCalledWith(2, ['old-1'])
  })

  it('onSyncDataFinished conversation 分支 → saveConversations（合并后全量）', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores()
    const client = makeClient([makeRawCvs('u1', { conversationName: 'Alice', unreadCount: 2 })])
    const handlers = createChatHandlers(client, stores, undefined, persistence)

    handlers.onSyncDataFinished?.({ dataType: 'conversation', status: 'success' } as unknown as HandlerArg<'onSyncDataFinished'>)
    await flushPersist()

    expect(persistence.conversation.saveConversations).toHaveBeenCalledTimes(1)
    const records = persistence.conversation.saveConversations.mock.calls[0][0]
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('u1')
    expect(records[0].name).toBe('Alice')
    expect(records[0].unreadCount).toBe(2)
  })

  it('onConversationListUpdate → saveConversations（合并后全量，removed 已剔除）', async () => {
    const persistence = makePersistence()
    const { stores } = makeStores([
      makeCvs('gone', { name: '已删除会话' }),
      makeCvs('db-only', { name: 'DB预填', lastMessageTime: 50 }),
    ])
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    handlers.onConversationListUpdate?.(makeListUpdatePayload(
      [makeRawCvs('u1', { conversationName: 'Alice', lastMessageAt: 100 })],
      { reset: true, removed: [{ conversationId: 'gone', conversationType: 'singleChat' }] },
    ))
    await flushPersist()

    expect(persistence.conversation.saveConversations).toHaveBeenCalledTimes(1)
    const records = persistence.conversation.saveConversations.mock.calls[0][0]
    expect(records.map((r: UiConversation) => r.id)).toEqual(['u1', 'db-only'])
  })

  it('钩子抛异常只告警不影响主流程', async () => {
    const persistence = makePersistence()
    persistence.message.saveMessage.mockImplementation(() => {
      throw new Error('db locked')
    })
    const { stores, messageStore } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores, undefined, persistence)

    expect(() => handlers.onMessage?.(makeMsg() as unknown as HandlerArg<'onMessage'>)).not.toThrow()
    await flushPersist()
    expect(messageStore.addMessage).toHaveBeenCalledTimes(1)
    expect(persistence.message.saveMessage).toHaveBeenCalledTimes(1)
  })

  it('未注入 persistence 时零调用零报错', async () => {
    const { stores, messageStore } = makeStores()
    const handlers = createChatHandlers(makeClient(), stores)

    expect(() => {
      handlers.onMessage?.(makeMsg() as unknown as HandlerArg<'onMessage'>)
      handlers.onMessageRecalled?.({
        messageId: 'srv-9',
        conversationId: 'u1',
        conversationType: 'singleChat',
      } as unknown as HandlerArg<'onMessageRecalled'>)
      handlers.onConversationListUpdate?.(makeListUpdatePayload([makeRawCvs('u1')], { reset: true }))
    }).not.toThrow()
    await flushPersist()
    expect(messageStore.addMessage).toHaveBeenCalledTimes(1)
  })
})

describe('会话并集合并（mergeWithExistingConversations）', () => {
  it('本地独有（DB 预填）会话保留，排在 SDK 快照会话之后（按 lastMessageTime 倒序）', async () => {
    const { stores, conversationList } = makeStores([
      makeCvs('db-old', { name: '旧的', lastMessageTime: 10 }),
      makeCvs('db-new', { name: '新的', lastMessageTime: 90 }),
    ])
    const handlers = createChatHandlers(makeClient(), stores)

    handlers.onConversationListUpdate?.(makeListUpdatePayload(
      [makeRawCvs('u1', { conversationName: 'Alice', lastMessageAt: 100 })],
      { reset: true },
    ))
    await flushPersist()

    expect(conversationList.map(c => c.id)).toEqual(['u1', 'db-new', 'db-old'])
  })

  it('patch.removed 显式删除的会话不保留', async () => {
    const { stores, conversationList } = makeStores([
      makeCvs('gone', { name: '已删除', lastMessageTime: 80 }),
      makeCvs('keep', { name: '保留', lastMessageTime: 60 }),
    ])
    const handlers = createChatHandlers(makeClient(), stores)

    handlers.onConversationListUpdate?.(makeListUpdatePayload(
      [makeRawCvs('u1', { conversationName: 'Alice', lastMessageAt: 100 })],
      { reset: true, removed: [{ conversationId: 'gone', conversationType: 'singleChat' }] },
    ))
    await flushPersist()

    expect(conversationList.map(c => c.id)).toEqual(['u1', 'keep'])
  })

  it('重叠会话：SDK 字段覆盖，draft / draftTime / isMuted / remindType / 已补全 name 保留', async () => {
    const { stores, conversationList } = makeStores([
      makeCvs('u1', {
        name: 'Alice',
        unreadCount: 0,
        draft: '草稿内容',
        draftTime: 123456,
        isMuted: true,
        remindType: 'NONE',
        lastMessageTime: 100,
      }),
    ])
    const handlers = createChatHandlers(makeClient(), stores)

    // SDK 快照：conversationName 缺省（回退为 id），未读数更新，不携带 draft / 免打扰（恒 DEFAULT）
    handlers.onConversationListUpdate?.(makeListUpdatePayload(
      [makeRawCvs('u1', { conversationName: undefined, unreadCount: 5, lastMessageAt: 200 })],
      { reset: true },
    ))
    await flushPersist()

    expect(conversationList).toHaveLength(1)
    const merged = conversationList[0]
    expect(merged.unreadCount).toBe(5) // SDK 字段覆盖
    expect(merged.lastMessageTime).toBe(200)
    expect(merged.name).toBe('Alice') // 已补全名称保留
    expect(merged.draft).toBe('草稿内容')
    expect(merged.draftTime).toBe(123456)
    expect(merged.isMuted).toBe(true) // 免打扰以本地为准，不被快照冲掉
    expect(merged.remindType).toBe('NONE')
  })

  it('reset=false 增量分支：本地独有会话保留、新会话追加', async () => {
    const { stores, conversationList } = makeStores([
      makeCvs('db-only', { name: 'DB预填', lastMessageTime: 50 }),
    ])
    const handlers = createChatHandlers(makeClient(), stores)

    handlers.onConversationListUpdate?.(makeListUpdatePayload(
      [makeRawCvs('u1', { conversationName: 'Alice', lastMessageAt: 100 })],
      { reset: false },
    ))
    await flushPersist()

    expect(conversationList.map(c => c.id)).toContain('db-only')
    expect(conversationList.map(c => c.id)).toContain('u1')
  })
})
