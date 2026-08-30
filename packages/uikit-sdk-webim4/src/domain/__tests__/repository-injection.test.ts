// @vitest-environment jsdom
// 4.x SDK（easemob-websdk@4.x）入口在模块加载时访问 `self`，node 环境需在 jsdom 下运行
import type {
  SdkMessage,
  UiConversation,
} from '@easemob/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { Webim4Client } from '../../client'
import type { ConversationStoreLike } from '../conversation-domain'
import { ConversationDomain } from '../conversation-domain'
import { MessageDomain } from '../message-domain'
import type { MessageStoreLike } from '../../event/types'

const SELF = 'me'
const PEER = 'peer1'

/** 构造中立消息（注入 repository 返回形状） */
function makeNeutralMsg(overrides: Partial<SdkMessage> = {}): SdkMessage {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'loc-1',
    from: PEER,
    to: SELF,
    sender: { userId: PEER },
    conversationId: 'c1',
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: 1700000000000,
    body: { content: 'hi' },
    ...overrides,
  }
}

/** 构造 4.x 文本消息体（SDK 默认路径用） */
function make4xTextMsg() {
  return {
    id: 'srv-sdk',
    chatType: 'singleChat',
    type: 'txt',
    to: SELF,
    from: PEER,
    msg: 'hello',
    time: 1700000000000,
  }
}

/** 构造中立会话（注入 repository 返回形状） */
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

function makeMessageClient() {
  return {
    currentUserId: SELF,
    connection: {
      getHistoryMessages: vi.fn(),
    },
  } as unknown as Webim4Client
}

function makeMessageStore() {
  return {
    prependMessages: vi.fn(),
    getMessages: vi.fn(() => []),
  } as unknown as MessageStoreLike & { prependMessages: ReturnType<typeof vi.fn> }
}

function makeConversationClient() {
  return {
    currentUserId: SELF,
    connection: {
      getServerConversations: vi.fn().mockResolvedValue({ data: { conversations: [], cursor: '' } }),
      getServerPinnedConversations: vi.fn().mockResolvedValue({ data: { conversations: [], cursor: '' } }),
      getSilentModeForConversations: vi.fn().mockResolvedValue({ data: {} }),
    },
  } as unknown as Webim4Client
}

function makeConversationStore() {
  return {
    setList: vi.fn(),
    setCurrentConversationId: vi.fn(),
    setSyncing: vi.fn(),
    setConversationsLoaded: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    conversationList: [] as UiConversation[],
  } as unknown as ConversationStoreLike & {
    setList: ReturnType<typeof vi.fn>
    setConversationsLoaded: ReturnType<typeof vi.fn>
  }
}

type ConnectionMock = {
  getServerConversations: ReturnType<typeof vi.fn>
  getServerPinnedConversations: ReturnType<typeof vi.fn>
  getSilentModeForConversations: ReturnType<typeof vi.fn>
}

/** 取出 conversation client mock 上的 connection（断言用） */
function connectionOf(client: Webim4Client): ConnectionMock {
  return (client as unknown as { connection: ConnectionMock }).connection
}

describe('MessageDomain 数据入口注入（repositories）', () => {
  it('注入 loadMessages 时 fetchHistory 走注入实现且不触 SDK', async () => {
    const client = makeMessageClient()
    const store = makeMessageStore()
    const loadMessages = vi.fn().mockResolvedValue({
      list: [
        makeNeutralMsg({ msgServerId: 'srv-in', from: SELF }),
        makeNeutralMsg({ msgServerId: 'srv-cmd', type: MESSAGE_TYPE.CMD }),
      ],
      cursor: 'cur-injected',
      hasMore: false,
    })
    const domain = new MessageDomain(client, store, {
      messageRepository: { loadMessages },
    })

    const result = await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT, undefined, 20)

    expect(loadMessages).toHaveBeenCalledWith({
      conversationId: 'c1',
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
      cursor: undefined,
      pageSize: 20,
    })
    expect(client.connection?.getHistoryMessages).not.toHaveBeenCalled()
    // CMD 透传消息被过滤；中立消息补齐 UI 派生字段后写入 store
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    const written = store.prependMessages.mock.calls[0][1]
    expect(written).toHaveLength(1)
    expect(written[0].msgServerId).toBe('srv-in')
    expect(written[0].isSelf).toBe(true)
    expect(written[0].status).toBe(MESSAGE_STATUS.SENT)
    expect(result).toEqual({ items: written, cursor: 'cur-injected', hasMore: false })
  })

  it('未注入时 fetchHistory 走 SDK 默认路径', async () => {
    const client = makeMessageClient()
    ;(client.connection?.getHistoryMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      messages: [make4xTextMsg()],
      cursor: 'cur-sdk',
      isLast: false,
    })
    const store = makeMessageStore()
    const domain = new MessageDomain(client, store)

    const result = await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)

    expect(client.connection?.getHistoryMessages).toHaveBeenCalledWith({
      targetId: 'c1',
      chatType: CONVERSATION_TYPE.SINGLECHAT,
      pageSize: 20,
      cursor: '',
      searchDirection: 'up',
    })
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    expect(result.cursor).toBe('cur-sdk')
    expect(result.hasMore).toBe(true)
  })
})

describe('ConversationDomain 数据入口注入（repositories）', () => {
  it('注入 fetchConversations 时 refresh 游标翻页合并后写 store', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const older = makeConversation('cvs-old', { lastMessageTime: 100 })
    const newer = makeConversation('cvs-new', { lastMessageTime: 200 })
    const fetchConversations = vi.fn()
      .mockResolvedValueOnce({ list: [older], cursor: 'p2', hasMore: true })
      .mockResolvedValueOnce({ list: [newer], cursor: undefined, hasMore: false })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh()

    const connection = connectionOf(client)
    expect(connection.getServerConversations).not.toHaveBeenCalled()
    expect(connection.getServerPinnedConversations).not.toHaveBeenCalled()
    expect(fetchConversations).toHaveBeenCalledTimes(2)
    expect(fetchConversations).toHaveBeenNthCalledWith(1, { cursor: undefined, pageSize: 50 })
    expect(fetchConversations).toHaveBeenNthCalledWith(2, { cursor: 'p2', pageSize: 50 })
    // 合并后按最后一条消息时间倒序写入 store，并代偿置位「会话已加载」
    expect(store.setList).toHaveBeenCalledTimes(1)
    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id)).toEqual(['cvs-new', 'cvs-old'])
    expect(store.setConversationsLoaded).toHaveBeenCalledWith(true)
  })

  it('未注入时 refresh 走 SDK 默认路径', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const domain = new ConversationDomain(client, store)

    await domain.refresh()

    const connection = connectionOf(client)
    expect(connection.getServerPinnedConversations).toHaveBeenCalledTimes(1)
    expect(connection.getServerConversations).toHaveBeenCalledTimes(1)
    expect(store.setList).toHaveBeenCalledWith([])
    expect(store.setConversationsLoaded).toHaveBeenCalledWith(true)
  })
})
