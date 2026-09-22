// @vitest-environment jsdom
// 4.x SDK（easemob-websdk@4.x）入口在模块加载时访问 `self`，node 环境需在 jsdom 下运行
import type {
  ConversationPersistenceHooks,
  MessagePersistenceHooks,
  SdkMessage,
  UiConversation,
} from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { Webim4Client } from '../../client'
import type { ConversationStoreLike } from '../conversation-domain'
import { ConversationDomain } from '../conversation-domain'
import { MessageDomain } from '../message-domain'
import type { MessageStoreLike } from '../../event/types'

const SELF = 'me'
const PEER = 'peer1'

/** 等待 fire-and-forget 钩子的 microtask 调度完成 */
function flushHooks() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/** 构造 4.x 文本消息体（SDK 默认路径用） */
function make4xTextMsg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'srv-sdk',
    chatType: 'singleChat',
    type: 'txt',
    to: SELF,
    from: PEER,
    msg: 'hello',
    time: 1700000000000,
    ...overrides,
  }
}

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
      send: vi.fn(),
      getHistoryMessages: vi.fn(),
    },
  } as unknown as Webim4Client
}

function makeMessageStore() {
  return {
    prependMessages: vi.fn(),
    getMessages: vi.fn(() => []),
    addSendingMessage: vi.fn(),
    replaceWithSent: vi.fn(),
    markFailed: vi.fn(),
    updateUploadProgress: vi.fn(),
  } as unknown as MessageStoreLike & {
    replaceWithSent: ReturnType<typeof vi.fn>
    markFailed: ReturnType<typeof vi.fn>
  }
}

function makeConversationClient() {
  return {
    currentUserId: SELF,
    connection: {
      getServerConversations: vi.fn().mockResolvedValue({ data: { conversations: [], cursor: '' } }),
      getServerPinnedConversations: vi.fn().mockResolvedValue({ data: { conversations: [], cursor: '' } }),
      getSilentModeForConversations: vi.fn().mockResolvedValue({ data: {} }),
      deleteConversation: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Webim4Client
}

function makeConversationStore(initial: UiConversation[] = []) {
  return {
    setList: vi.fn(),
    setCurrentConversationId: vi.fn(),
    setSyncing: vi.fn(),
    setConversationsLoaded: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    conversationList: initial,
  } as unknown as ConversationStoreLike & {
    setList: ReturnType<typeof vi.fn>
  }
}

/** 构造 4.x 服务端会话项（getServerConversations 返回形状） */
function make4xConversationItem(id: string, overrides: Record<string, unknown> = {}) {
  return {
    conversationId: id,
    conversationType: 'singleChat',
    isPinned: false,
    pinnedTime: 0,
    unReadCount: 0,
    lastMessage: null,
    ...overrides,
  }
}

describe('messageDomain 旁路持久化钩子（persistence）', () => {
  it('发送成功后 saveMessage 落库（record 携带服务端 ID）', async () => {
    const client = makeMessageClient()
    ;(client.connection?.send as ReturnType<typeof vi.fn>).mockResolvedValue({
      localMsgId: 'loc-1',
      serverMsgId: 'srv-1',
    })
    const store = makeMessageStore()
    const saveMessage = vi.fn()
    const domain = new MessageDomain(client, store, {
      messagePersistence: { saveMessage },
    })

    await domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hi')
    await flushHooks()

    expect(saveMessage).toHaveBeenCalledTimes(1)
    const record = saveMessage.mock.calls[0][0] as SdkMessage
    expect(record.msgServerId).toBe('srv-1')
    expect(record.msgLocalId).toBe('loc-1')
    expect(record.conversationId).toBe('c1')
  })

  it('发送失败不入库（saveMessage 零调用）', async () => {
    const client = makeMessageClient()
    ;(client.connection?.send as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    const store = makeMessageStore()
    const saveMessage = vi.fn()
    const domain = new MessageDomain(client, store, {
      messagePersistence: { saveMessage },
    })

    await expect(domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hi')).rejects.toThrow('network')
    await flushHooks()

    expect(store.markFailed).toHaveBeenCalledTimes(1)
    expect(saveMessage).not.toHaveBeenCalled()
  })

  it('漫游历史回流（SDK 路径）批量 saveMessages', async () => {
    const client = makeMessageClient()
    ;(client.connection?.getHistoryMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      messages: [make4xTextMsg(), make4xTextMsg({ id: 'srv-sdk-2' })],
      cursor: 'cur-sdk',
      isLast: true,
    })
    const store = makeMessageStore()
    const saveMessages = vi.fn()
    const domain = new MessageDomain(client, store, {
      messagePersistence: { saveMessages },
    })

    await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    await flushHooks()

    expect(saveMessages).toHaveBeenCalledTimes(1)
    const records = saveMessages.mock.calls[0][0] as SdkMessage[]
    expect(records).toHaveLength(2)
    expect(records.map(r => r.msgServerId)).toEqual(['srv-sdk', 'srv-sdk-2'])
  })

  it('注入 repository 路径（数据来自 DB）不写回', async () => {
    const client = makeMessageClient()
    const store = makeMessageStore()
    const saveMessages = vi.fn()
    const loadMessages = vi.fn().mockResolvedValue({
      list: [{
        msgServerId: 'srv-in',
        msgLocalId: 'loc-in',
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
      } satisfies SdkMessage],
      cursor: undefined,
      hasMore: false,
    })
    const domain = new MessageDomain(client, store, {
      messageRepository: { loadMessages },
      messagePersistence: { saveMessages },
    })

    await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    await flushHooks()

    expect(loadMessages).toHaveBeenCalledTimes(1)
    expect(saveMessages).not.toHaveBeenCalled()
  })

  it('未注入 persistence 时零调用零报错', async () => {
    const client = makeMessageClient()
    ;(client.connection?.getHistoryMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      messages: [make4xTextMsg()],
      cursor: '',
      isLast: true,
    })
    ;(client.connection?.send as ReturnType<typeof vi.fn>).mockResolvedValue({
      localMsgId: 'loc-1',
      serverMsgId: 'srv-1',
    })
    const store = makeMessageStore()
    const domain = new MessageDomain(client, store)

    await domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hi')
    await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    await flushHooks()

    expect(store.replaceWithSent).toHaveBeenCalledTimes(1)
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
  })

  it('钩子抛错 / reject 只告警不阻塞消息链路', async () => {
    const client = makeMessageClient()
    ;(client.connection?.send as ReturnType<typeof vi.fn>).mockResolvedValue({
      localMsgId: 'loc-1',
      serverMsgId: 'srv-1',
    })
    const store = makeMessageStore()
    const persistence: MessagePersistenceHooks = {
      // 同步抛错与异步 reject 两种形态都不应阻塞发送主流程
      saveMessage: vi.fn(() => Promise.reject(new Error('db down'))),
    }
    const domain = new MessageDomain(client, store, { messagePersistence: persistence })

    const sent = await domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hi')
    await flushHooks()

    expect(sent.msgServerId).toBe('srv-1')
    expect(store.replaceWithSent).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessage).toHaveBeenCalledTimes(1)
  })

  it('removeMessages（4.x 无服务端删除 API）仅落删除墓碑，不触碰 SDK', async () => {
    const client = makeMessageClient()
    const store = makeMessageStore()
    const deleteMessages = vi.fn()
    const domain = new MessageDomain(client, store, {
      messagePersistence: { deleteMessages },
    })

    await domain.removeMessages('c1', CONVERSATION_TYPE.SINGLECHAT, ['srv-1', 'srv-2'])
    await flushHooks()

    expect(deleteMessages).toHaveBeenCalledTimes(1)
    expect(deleteMessages).toHaveBeenCalledWith(['srv-1', 'srv-2'])
    // 4.x connection 无任何删除调用（无该方法）
    expect(client.connection?.send).not.toHaveBeenCalled()
  })

  it('removeMessages 空列表直接返回，零调用', async () => {
    const client = makeMessageClient()
    const store = makeMessageStore()
    const deleteMessages = vi.fn()
    const domain = new MessageDomain(client, store, {
      messagePersistence: { deleteMessages },
    })

    await domain.removeMessages('c1', CONVERSATION_TYPE.SINGLECHAT, [])
    await flushHooks()

    expect(deleteMessages).not.toHaveBeenCalled()
  })
})

describe('conversationDomain 旁路持久化钩子（persistence）', () => {
  it('会话列表回填（SDK 路径）后 saveConversations 整体快照落库', async () => {
    const client = makeConversationClient()
    ;(client.connection?.getServerConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { conversations: [make4xConversationItem('c1'), make4xConversationItem('c2')], cursor: '' },
    })
    const store = makeConversationStore()
    const saveConversations = vi.fn()
    const domain = new ConversationDomain(client, store, {
      conversationPersistence: { saveConversations },
    })

    await domain.refresh()
    await flushHooks()

    expect(saveConversations).toHaveBeenCalledTimes(1)
    const records = saveConversations.mock.calls[0][0] as UiConversation[]
    expect(records.map(c => c.id).sort()).toEqual(['c1', 'c2'])
    // 落库快照与写 store 的 merged 列表一致
    expect(records).toEqual(store.setList.mock.calls[0][0])
  })

  it('注入 repository 路径回填后同样 saveConversations', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const saveConversations = vi.fn()
    const fetchConversations = vi.fn().mockResolvedValue({
      list: [makeConversation('cvs-db', { name: 'DB 会话' })],
      cursor: undefined,
      hasMore: false,
    })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
      conversationPersistence: { saveConversations },
    })

    await domain.refresh()
    await flushHooks()

    expect(saveConversations).toHaveBeenCalledTimes(1)
    const records = saveConversations.mock.calls[0][0] as UiConversation[]
    expect(records.map(c => c.id)).toEqual(['cvs-db'])
  })

  it('钩子异常只告警不阻塞回填主流程', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const persistence: ConversationPersistenceHooks = {
      saveConversations: vi.fn(() => Promise.reject(new Error('db down'))),
    }
    const domain = new ConversationDomain(client, store, {
      conversationPersistence: persistence,
    })

    await domain.refresh()
    await flushHooks()

    expect(store.setList).toHaveBeenCalledTimes(1)
    expect(store.setConversationsLoaded).toHaveBeenCalledWith(true)
    expect(persistence.saveConversations).toHaveBeenCalledTimes(1)
  })

  it('未注入 persistence 时零调用零报错', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const domain = new ConversationDomain(client, store)

    await domain.refresh()
    await flushHooks()

    expect(store.setList).toHaveBeenCalledWith([])
  })
})

describe('conversationDomain 会话回填并集合并（对齐 websdk5 merge 升级）', () => {
  it('replace 回填保留本地独有会话，不被服务端快照整体覆盖', async () => {
    const client = makeConversationClient()
    ;(client.connection?.getServerConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { conversations: [make4xConversationItem('c1')], cursor: '' },
    })
    // 本地独有会话：收消息浮现但服务端会话列表尚未带回
    const localOnly = makeConversation('local-only', { name: '本地会话', lastMessageTime: 100 })
    const store = makeConversationStore([localOnly])
    const domain = new ConversationDomain(client, store)

    await domain.refresh()

    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id).sort()).toEqual(['c1', 'local-only'])
  })

  it('共有项保留本地字段（draft/draftTime/isMuted/remindType）与已补全名称', async () => {
    const client = makeConversationClient()
    ;(client.connection?.getServerConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { conversations: [make4xConversationItem('c1')], cursor: '' },
    })
    const prev = makeConversation('c1', {
      name: '已补全名称',
      draft: '草稿内容',
      draftTime: 123,
      isMuted: true,
      remindType: 'NONE',
    })
    const store = makeConversationStore([prev])
    const domain = new ConversationDomain(client, store)

    await domain.refresh()

    const list = store.setList.mock.calls[0][0] as UiConversation[]
    const merged = list.find(c => c.id === 'c1')
    expect(merged?.name).toBe('已补全名称')
    expect(merged?.draft).toBe('草稿内容')
    expect(merged?.draftTime).toBe(123)
    expect(merged?.isMuted).toBe(true) // 免打扰以本地为准，不被回填冲掉
    expect(merged?.remindType).toBe('NONE')
  })

  it('显式删除的会话不随并集合并复活', async () => {
    const client = makeConversationClient()
    ;(client.connection?.getServerConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { conversations: [], cursor: '' },
    })
    const removed = makeConversation('c1')
    const kept = makeConversation('c2')
    const store = makeConversationStore([removed, kept])
    const domain = new ConversationDomain(client, store)

    // 显式删除 c1（store mock 不真删，模拟删除后列表仍残留的边界）
    await domain.remove('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(store.delete).toHaveBeenCalledWith('c1')

    await domain.refresh()

    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id)).toEqual(['c2'])
  })

  it('服务端快照再次带回已删会话时以服务端为准（清除删除标记）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore([makeConversation('c1')])
    const domain = new ConversationDomain(client, store)

    await domain.remove('c1', CONVERSATION_TYPE.SINGLECHAT)
    ;(client.connection?.getServerConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { conversations: [make4xConversationItem('c1')], cursor: '' },
    })

    await domain.refresh()

    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id)).toEqual(['c1'])
  })
})
