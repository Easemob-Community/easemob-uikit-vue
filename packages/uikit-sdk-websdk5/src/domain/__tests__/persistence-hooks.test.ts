import type { MessagePersistenceHooks, SdkMessage } from '@easemob/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import type { MessageStoreLike } from '../message-domain'
import { MessageDomain } from '../message-domain'

const SELF = 'me'
const PEER = 'peer1'

/** 等待 fire-and-forget 钩子链（Promise.resolve().then）执行完毕 */
function flushPersist() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/** 构造中立消息形状（运行时同时满足 SDK Message 结构，供 toUiMessage 使用） */
function makeMsg(overrides: Partial<SdkMessage> = {}): SdkMessage {
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

function makeStore() {
  return {
    addSendingMessage: vi.fn(),
    replaceWithSent: vi.fn(),
    markFailed: vi.fn(),
    updateUploadProgress: vi.fn(),
    prependMessages: vi.fn(),
    getMessages: vi.fn(() => []),
    updateMessageById: vi.fn(),
  } as unknown as MessageStoreLike
}

/** 发送链路 client mock：createTextMessage 出草稿，sendMessage 结果可配 */
function makeSendClient(sendImpl?: () => Promise<SdkMessage>) {
  const draft = makeMsg({ msgServerId: '' })
  return {
    currentUserId: SELF,
    chatManager: {
      createTextMessage: vi.fn(() => draft),
      sendMessage: vi.fn(sendImpl ?? (() => Promise.resolve(makeMsg()))),
      getHistoryMessages: vi.fn(),
    },
  } as unknown as ManagerHost
}

function makeHistoryClient(items: SdkMessage[]) {
  return {
    currentUserId: SELF,
    chatManager: {
      getHistoryMessages: vi.fn().mockResolvedValue({
        items,
        cursor: 'cur-sdk',
        hasMore: true,
      }),
    },
  } as unknown as ManagerHost
}

function makePersistence() {
  return {
    saveMessage: vi.fn(),
    saveMessages: vi.fn(),
    updateMessageStatus: vi.fn(),
    markMessageRecalled: vi.fn(),
    updateMessageContent: vi.fn(),
    deleteMessages: vi.fn(),
  } satisfies MessagePersistenceHooks
}

describe('messageDomain 旁路持久化（persistence）', () => {
  it('_send 发送成功后 saveMessage 落库（清洗后 DTO）', async () => {
    const client = makeSendClient()
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hello')
    await flushPersist()

    expect(store.replaceWithSent).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessage).toHaveBeenCalledTimes(1)
    const record = persistence.saveMessage.mock.calls[0][0]
    expect(record.msgServerId).toBe('srv-1')
    expect(record.body).toEqual({ content: 'hi' })
  })

  it('_send 发送失败不入库', async () => {
    const client = makeSendClient(() => Promise.reject(new Error('network down')))
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await expect(domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hello')).rejects.toThrow('network down')
    await flushPersist()

    expect(store.markFailed).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessage).not.toHaveBeenCalled()
  })

  it('fetchHistory SDK 漫游路径批量 saveMessages（CMD 过滤后清洗）', async () => {
    const client = makeHistoryClient([
      makeMsg({ msgServerId: 'srv-a' }),
      makeMsg({ msgServerId: 'srv-cmd', type: MESSAGE_TYPE.CMD, body: { action: 'TypingBegin' } }),
      makeMsg({ msgServerId: 'srv-b' }),
    ])
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    await flushPersist()

    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessages).toHaveBeenCalledTimes(1)
    const batch = persistence.saveMessages.mock.calls[0][0]
    expect(batch.map((r: SdkMessage) => r.msgServerId)).toEqual(['srv-a', 'srv-b'])
  })

  it('fetchHistory 注入 loadMessages 路径不写回（数据来自 DB）', async () => {
    const client = makeSendClient()
    const store = makeStore()
    const persistence = makePersistence()
    const loadMessages = vi.fn().mockResolvedValue({
      list: [makeMsg({ msgServerId: 'srv-in' })],
      cursor: undefined,
      hasMore: false,
    })
    const domain = new MessageDomain(client, store, {
      messageRepository: { loadMessages },
      persistence,
    })

    await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    await flushPersist()

    expect(loadMessages).toHaveBeenCalledTimes(1)
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessages).not.toHaveBeenCalled()
    expect(persistence.saveMessage).not.toHaveBeenCalled()
  })

  it('钩子同步抛错 / Promise 拒绝只告警，不阻塞主流程', async () => {
    const client = makeSendClient()
    const store = makeStore()
    const persistence = makePersistence()
    persistence.saveMessage.mockImplementation(() => {
      throw new Error('db locked')
    })
    const domain = new MessageDomain(client, store, { persistence })

    // 发送链路正常完成，不被钩子异常影响
    await expect(domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hello')).resolves.toBeTruthy()
    await flushPersist()
    expect(store.replaceWithSent).toHaveBeenCalledTimes(1)
    expect(persistence.saveMessage).toHaveBeenCalledTimes(1)

    // Promise 拒绝场景（漫游批量落库）
    const historyClient = makeHistoryClient([makeMsg()])
    persistence.saveMessages.mockRejectedValue(new Error('ipc timeout'))
    const domain2 = new MessageDomain(historyClient, makeStore(), { persistence })
    const result = await domain2.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(result.list).toHaveLength(1)
    await flushPersist()
    expect(persistence.saveMessages).toHaveBeenCalledTimes(1)
  })

  it('removeMessages 调 SDK 删漫游历史，成功后落删除墓碑', async () => {
    const removeHistoryMessages = vi.fn().mockResolvedValue(undefined)
    const client = {
      currentUserId: SELF,
      chatManager: { removeHistoryMessages },
    } as unknown as ManagerHost
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await domain.removeMessages('c1', CONVERSATION_TYPE.SINGLECHAT, ['srv-1', 'srv-2'])
    await flushPersist()

    expect(removeHistoryMessages).toHaveBeenCalledTimes(1)
    expect(removeHistoryMessages).toHaveBeenCalledWith({
      conversationId: 'c1',
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
      messageIds: ['srv-1', 'srv-2'],
    })
    expect(persistence.deleteMessages).toHaveBeenCalledTimes(1)
    expect(persistence.deleteMessages).toHaveBeenCalledWith(['srv-1', 'srv-2'])
  })

  it('removeMessages SDK 删除失败：错误向上抛且不落墓碑', async () => {
    const removeHistoryMessages = vi.fn().mockRejectedValue(new Error('network down'))
    const client = {
      currentUserId: SELF,
      chatManager: { removeHistoryMessages },
    } as unknown as ManagerHost
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await expect(domain.removeMessages('c1', CONVERSATION_TYPE.SINGLECHAT, ['srv-1'])).rejects.toThrow('network down')
    await flushPersist()

    expect(persistence.deleteMessages).not.toHaveBeenCalled()
  })

  it('removeMessages 空列表直接返回，零调用', async () => {
    const removeHistoryMessages = vi.fn()
    const client = {
      currentUserId: SELF,
      chatManager: { removeHistoryMessages },
    } as unknown as ManagerHost
    const store = makeStore()
    const persistence = makePersistence()
    const domain = new MessageDomain(client, store, { persistence })

    await domain.removeMessages('c1', CONVERSATION_TYPE.SINGLECHAT, [])
    await flushPersist()

    expect(removeHistoryMessages).not.toHaveBeenCalled()
    expect(persistence.deleteMessages).not.toHaveBeenCalled()
  })

  it('未注入 persistence 时零调用零报错', async () => {
    const client = makeSendClient()
    const store = makeStore()
    const domain = new MessageDomain(client, store)

    await expect(domain.sendText('c1', CONVERSATION_TYPE.SINGLECHAT, 'hello')).resolves.toBeTruthy()
    expect(store.replaceWithSent).toHaveBeenCalledTimes(1)

    const historyClient = makeHistoryClient([makeMsg()])
    const domain2 = new MessageDomain(historyClient, makeStore())
    const result = await domain2.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(result.list).toHaveLength(1)
  })
})
