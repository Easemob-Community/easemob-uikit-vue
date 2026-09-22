// @vitest-environment jsdom
// 4.x SDK（easemob-websdk@4.x）入口在模块加载时访问 `self`，node 环境需在 jsdom 下运行
import type { EasemobChat } from 'easemob-websdk-4'
import type { SdkMessage, SdkPersistenceHooks, UiConversation, UiMessage } from '@easemob-community/uikit-sdk-contract'
import { MESSAGE_STATUS } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { Webim4Client } from '../../client'
import { createChatHandlers } from '../chat-events'
import { createConversationHandlers } from '../conversation-events'
import type { EventStores } from '../types'

const SELF = 'me'
const PEER = 'peer1'

/** 等待 fire-and-forget 钩子的 microtask 调度完成 */
function flushHooks() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/** 构造 4.x 文本消息体（onMessage 批量回调载荷元素） */
function make4xTextMsg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'srv-1',
    chatType: 'singleChat',
    type: 'txt',
    to: SELF,
    from: PEER,
    msg: 'hello',
    time: 1700000000000,
    ...overrides,
  }
}

/** 构造事件层 store mock（message/conversation 用 vi.fn 以便断言，其余域最小兜底） */
function makeStores(preloadedMessages: Record<string, UiMessage[]> = {}) {
  const messages = new Map<string, UiMessage[]>(Object.entries(preloadedMessages))
  const conversationList: UiConversation[] = []
  return {
    client: { currentUser: SELF },
    message: {
      getMessages: vi.fn((conversationId: string) => messages.get(conversationId) ?? []),
      addMessage: vi.fn(),
      replaceMessageById: vi.fn(),
      recallMessage: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateMessageById: vi.fn(),
      deleteMessages: vi.fn(),
      addAtMeMessage: vi.fn(),
    },
    conversation: {
      currentConversationId: null,
      conversationList,
      updateConversation: vi.fn(),
      addConversation: vi.fn(),
      setAtMe: vi.fn(),
    },
    contact: { getContact: vi.fn(() => undefined) },
    userInfo: { getUserInfo: vi.fn(() => undefined) },
  } as unknown as EventStores & {
    message: EventStores['message'] & {
      addMessage: ReturnType<typeof vi.fn>
      recallMessage: ReturnType<typeof vi.fn>
      updateMessageStatus: ReturnType<typeof vi.fn>
      deleteMessages: ReturnType<typeof vi.fn>
    }
    conversation: EventStores['conversation'] & {
      addConversation: ReturnType<typeof vi.fn>
    }
  }
}

function makeClient() {
  return {
    currentUserId: SELF,
    connection: null,
  } as unknown as Webim4Client
}

type ChatHandlers = Partial<EasemobChat.EventHandlerType>
/** onMessage 批量回调载荷（4.x 类型为窄联合，测试体按未知形状构造后断言转换） */
type OnMessagePayload = Parameters<NonNullable<ChatHandlers['onMessage']>>[0]

function makeChatHandlers(stores: EventStores, persistence?: SdkPersistenceHooks): ChatHandlers {
  return createChatHandlers(makeClient(), stores, undefined, persistence)
}

describe('chat-events 旁路持久化钩子（persistence）', () => {
  it('onMessage 收消息后 saveMessage 落库', async () => {
    const stores = makeStores()
    const saveMessage = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { saveMessage } })

    handlers.onMessage?.([make4xTextMsg()] as unknown as OnMessagePayload)
    await flushHooks()

    expect(stores.message.addMessage).toHaveBeenCalledTimes(1)
    expect(saveMessage).toHaveBeenCalledTimes(1)
    const record = saveMessage.mock.calls[0][0] as SdkMessage
    expect(record.msgServerId).toBe('srv-1')
    expect(record.conversationId).toBe(PEER)
  })

  it('onRecallMessage 撤回后 markMessageRecalled 落墓碑', async () => {
    const stores = makeStores()
    const markMessageRecalled = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { markMessageRecalled } })

    handlers.onRecallMessage?.({ mid: 'm1', from: PEER, to: SELF } as EasemobChat.RecallMsgBody)
    await flushHooks()

    expect(stores.message.recallMessage).toHaveBeenCalledWith('m1', PEER)
    expect(markMessageRecalled).toHaveBeenCalledTimes(1)
    expect(markMessageRecalled).toHaveBeenCalledWith('m1', PEER)
  })

  it('onReadMessage 单聊已读回执 updateMessageStatus(READ)', async () => {
    const stores = makeStores()
    const updateMessageStatus = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { updateMessageStatus } })

    handlers.onReadMessage?.({ mid: 'm1' } as EasemobChat.ReadMsgBody)
    await flushHooks()

    expect(updateMessageStatus).toHaveBeenCalledTimes(1)
    expect(updateMessageStatus).toHaveBeenCalledWith('m1', MESSAGE_STATUS.READ)
  })

  it('onReadMessage 群已读数为展示态，不落库', async () => {
    const stores = makeStores()
    const updateMessageStatus = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { updateMessageStatus } })

    handlers.onReadMessage?.({ mid: 'm1', groupReadCount: { m1: 3 } } as unknown as EasemobChat.ReadMsgBody)
    await flushHooks()

    expect(stores.message.updateMessageById).toHaveBeenCalledWith('m1', { groupReadCount: 3 })
    expect(updateMessageStatus).not.toHaveBeenCalled()
  })

  it('onDeliveredMessage 送达回执 updateMessageStatus(DELIVERED)', async () => {
    const stores = makeStores()
    const updateMessageStatus = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { updateMessageStatus } })

    handlers.onDeliveredMessage?.({ mid: 'm1' } as EasemobChat.DeliveryMsgBody)
    await flushHooks()

    expect(updateMessageStatus).toHaveBeenCalledTimes(1)
    expect(updateMessageStatus).toHaveBeenCalledWith('m1', MESSAGE_STATUS.DELIVERED)
  })

  it('onChannelMessage 会话级已读逐条 updateMessageStatus(READ)（仅己方未读消息）', async () => {
    const ownUnread = { msgServerId: 'm1', isSelf: true, status: MESSAGE_STATUS.DELIVERED } as UiMessage
    const ownRead = { msgServerId: 'm2', isSelf: true, status: MESSAGE_STATUS.READ } as UiMessage
    const peerMsg = { msgServerId: 'm3', isSelf: false, status: MESSAGE_STATUS.SENT } as UiMessage
    const stores = makeStores({ c1: [ownUnread, ownRead, peerMsg] })
    const updateMessageStatus = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { updateMessageStatus } })

    handlers.onChannelMessage?.({ from: 'c1' } as EasemobChat.ChannelMsgBody)
    await flushHooks()

    expect(updateMessageStatus).toHaveBeenCalledTimes(1)
    expect(updateMessageStatus).toHaveBeenCalledWith('m1', MESSAGE_STATUS.READ)
  })

  it('onModifiedMessage 消息编辑 updateMessageContent', async () => {
    const stores = makeStores()
    const updateMessageContent = vi.fn()
    const handlers = makeChatHandlers(stores, { message: { updateMessageContent } })
    const modifiedInfo = { operationCount: 1, operatorId: PEER, operationTime: 1700000001000 }

    handlers.onModifiedMessage?.(make4xTextMsg({
      id: 'm1',
      msg: 'edited',
      modifiedInfo,
    }) as unknown as EasemobChat.ModifiedEventMessage)
    await flushHooks()

    expect(updateMessageContent).toHaveBeenCalledTimes(1)
    const [msgId, body, ext, info] = updateMessageContent.mock.calls[0]
    expect(msgId).toBe('m1')
    expect((body as { content?: string }).content).toBe('edited')
    expect(ext).toEqual(expect.any(Object))
    expect(info).toEqual(expect.objectContaining({ operationCount: 1 }))
  })

  it('钩子同步抛错只告警不阻塞消息主流程', async () => {
    const stores = makeStores()
    const saveMessage = vi.fn(() => {
      throw new Error('db down')
    })
    const handlers = makeChatHandlers(stores, { message: { saveMessage } })

    handlers.onMessage?.([make4xTextMsg()] as unknown as OnMessagePayload)
    await flushHooks()

    // 主流程副作用完整执行（消息上屏 + 新会话浮现）
    expect(stores.message.addMessage).toHaveBeenCalledTimes(1)
    expect(stores.conversation.addConversation).toHaveBeenCalledTimes(1)
    expect(saveMessage).toHaveBeenCalledTimes(1)
  })

  it('未注入 persistence 时零调用零报错', async () => {
    const stores = makeStores()
    const handlers = makeChatHandlers(stores)

    handlers.onMessage?.([make4xTextMsg()] as unknown as OnMessagePayload)
    handlers.onRecallMessage?.({ mid: 'm1', from: PEER, to: SELF } as EasemobChat.RecallMsgBody)
    handlers.onReadMessage?.({ mid: 'm1' } as EasemobChat.ReadMsgBody)
    handlers.onDeliveredMessage?.({ mid: 'm1' } as EasemobChat.DeliveryMsgBody)
    await flushHooks()

    expect(stores.message.addMessage).toHaveBeenCalledTimes(1)
    expect(stores.message.recallMessage).toHaveBeenCalledTimes(1)
    expect(stores.message.updateMessageStatus).toHaveBeenCalledTimes(2)
  })
})

describe('conversation-events 旁路持久化钩子（persistence）', () => {
  it('onMultiDeviceEvent deleteRoaming：清空会话本地消息并 deleteMessages 落墓碑', async () => {
    const m1 = { msgServerId: 'm1' } as UiMessage
    const m2 = { msgServerId: 'm2' } as UiMessage
    const stores = makeStores({ g1: [m1, m2] })
    const deleteMessages = vi.fn()
    const handlers = createConversationHandlers(stores, { message: { deleteMessages } })

    handlers.onMultiDeviceEvent?.({
      operation: 'deleteRoaming',
      conversationId: 'g1',
      chatType: 'groupChat',
      resource: 'other-device',
    } as EasemobChat.RoamingDeleteMultiDeviceInfo)
    await flushHooks()

    expect(stores.message.deleteMessages).toHaveBeenCalledWith(['m1', 'm2'])
    expect(deleteMessages).toHaveBeenCalledTimes(1)
    expect(deleteMessages).toHaveBeenCalledWith(['m1', 'm2'])
  })

  it('deleteRoaming 会话无本地消息时零调用', async () => {
    const stores = makeStores()
    const deleteMessages = vi.fn()
    const handlers = createConversationHandlers(stores, { message: { deleteMessages } })

    handlers.onMultiDeviceEvent?.({
      operation: 'deleteRoaming',
      conversationId: 'g1',
      chatType: 'groupChat',
      resource: 'other-device',
    } as EasemobChat.RoamingDeleteMultiDeviceInfo)
    await flushHooks()

    expect(stores.message.deleteMessages).not.toHaveBeenCalled()
    expect(deleteMessages).not.toHaveBeenCalled()
  })

  it('未注入 persistence 时 deleteRoaming 仅清 store 不报错', async () => {
    const m1 = { msgServerId: 'm1' } as UiMessage
    const stores = makeStores({ g1: [m1] })
    const handlers = createConversationHandlers(stores)

    handlers.onMultiDeviceEvent?.({
      operation: 'deleteRoaming',
      conversationId: 'g1',
      chatType: 'groupChat',
      resource: 'other-device',
    } as EasemobChat.RoamingDeleteMultiDeviceInfo)
    await flushHooks()

    expect(stores.message.deleteMessages).toHaveBeenCalledWith(['m1'])
  })
})
