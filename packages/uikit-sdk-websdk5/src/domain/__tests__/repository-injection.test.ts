import type {
  SdkMessage,
  UiContact,
  UiConversation,
  UiGroup,
  UiPresence,
  UserInfo,
} from '@easemob/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import type { ConversationStoreLike } from '../conversation-domain'
import { ConversationDomain } from '../conversation-domain'
import type { MessageStoreLike } from '../message-domain'
import { MessageDomain } from '../message-domain'
import type { ContactStoreLike } from '../contact-domain'
import { ContactDomain } from '../contact-domain'
import type { GroupStoreLike } from '../group-domain'
import { GroupDomain } from '../group-domain'
import type { PresenceStoreLike } from '../presence-domain'
import { PresenceDomain } from '../presence-domain'
import { UserInfoDomain } from '../user-info-domain'
import type { UserInfoStoreLike } from '../../event/types'

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
    chatManager: {
      getHistoryMessages: vi.fn(),
    },
  } as unknown as ManagerHost
}

function makeMessageStore() {
  return {
    prependMessages: vi.fn(),
    getMessages: vi.fn(() => []),
    updateMessageById: vi.fn(),
  } as unknown as MessageStoreLike & { prependMessages: ReturnType<typeof vi.fn> }
}

function makeConversationClient() {
  return {
    currentUserId: SELF,
    chatManager: {
      refreshSessionList: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as ManagerHost
}

function makeConversationStore() {
  return {
    setList: vi.fn(),
    setCurrentConversationId: vi.fn(),
    setSyncing: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    setHasMoreConversations: vi.fn(),
    conversationList: [] as UiConversation[],
  } as unknown as ConversationStoreLike & {
    setList: ReturnType<typeof vi.fn>
    setHasMoreConversations: ReturnType<typeof vi.fn>
  }
}

describe('messageDomain 数据入口注入（repositories）', () => {
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

    expect(loadMessages).toHaveBeenCalledWith('c1', CONVERSATION_TYPE.SINGLECHAT, undefined, 20)
    expect(client.chatManager.getHistoryMessages).not.toHaveBeenCalled()
    // CMD 透传消息被过滤；中立消息补齐 UI 派生字段后写入 store
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    const written = store.prependMessages.mock.calls[0][1]
    expect(written).toHaveLength(1)
    expect(written[0].msgServerId).toBe('srv-in')
    expect(written[0].isSelf).toBe(true)
    expect(written[0].status).toBe(MESSAGE_STATUS.SENT)
    expect(result).toEqual({ list: written, cursor: 'cur-injected', hasMore: false })
  })

  it('未注入时 fetchHistory 走 SDK 默认路径', async () => {
    const client = makeMessageClient()
    const sdkMsg = makeNeutralMsg({ msgServerId: 'srv-sdk' })
    ;(client.chatManager.getHistoryMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [sdkMsg],
      cursor: 'cur-sdk',
      hasMore: true,
    })
    const store = makeMessageStore()
    const domain = new MessageDomain(client, store)

    const result = await domain.fetchHistory('c1', CONVERSATION_TYPE.SINGLECHAT)

    expect(client.chatManager.getHistoryMessages).toHaveBeenCalledWith({
      conversationId: 'c1',
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
      pageSize: 20,
      cursor: undefined,
      searchDirection: 'up',
    })
    expect(store.prependMessages).toHaveBeenCalledTimes(1)
    expect(result.cursor).toBe('cur-sdk')
    expect(result.hasMore).toBe(true)
  })
})

describe('conversationDomain 数据入口注入（repositories）', () => {
  it('注入 fetchConversations 时 refresh 只拉首页并回写 hasMore（大会话量懒加载）', async () => {
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

    expect(client.chatManager.refreshSessionList).not.toHaveBeenCalled()
    // 首页语义：只拉第一页，不循环灌全量（1 万会话场景的核心回归点）
    expect(fetchConversations).toHaveBeenCalledTimes(1)
    expect(fetchConversations).toHaveBeenNthCalledWith(1, undefined, 50, undefined)
    expect(store.setHasMoreConversations).toHaveBeenCalledWith(true)
    // 首页排序后写入 store
    expect(store.setList).toHaveBeenCalledTimes(1)
    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id)).toEqual(['cvs-old'])

    // 续页：loadMore 按游标推进并追加（去重 + 重排序 + hasMore 回写）
    store.conversationList = list
    await domain.loadMore()

    expect(fetchConversations).toHaveBeenCalledTimes(2)
    expect(fetchConversations).toHaveBeenNthCalledWith(2, 'p2', 50, undefined)
    expect(store.setHasMoreConversations).toHaveBeenLastCalledWith(false)
    const appended = store.setList.mock.calls[1][0] as UiConversation[]
    expect(appended.map(c => c.id)).toEqual(['cvs-new', 'cvs-old'])

    // 到底后 loadMore 短路，不再请求
    await domain.loadMore()
    expect(fetchConversations).toHaveBeenCalledTimes(2)
  })

  it('注入路径 loadMore 续页与现有列表同 id 去重', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const first = makeConversation('cvs-1', { lastMessageTime: 300 })
    const dupNewer = makeConversation('cvs-1', { lastMessageTime: 400, name: '已更新名称' })
    const other = makeConversation('cvs-2', { lastMessageTime: 200 })
    const fetchConversations = vi.fn()
      .mockResolvedValueOnce({ list: [first], cursor: 'p2', hasMore: true })
      .mockResolvedValueOnce({ list: [dupNewer, other], cursor: undefined, hasMore: false })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh()
    store.conversationList = store.setList.mock.calls[0][0] as UiConversation[]
    await domain.loadMore()

    const appended = store.setList.mock.calls[1][0] as UiConversation[]
    // 同 id 会话不被续页重复追加（保留首页已补全资料的那条）
    expect(appended.map(c => c.id)).toEqual(['cvs-1', 'cvs-2'])
  })

  it('未注入时 refresh 走 SDK 默认路径', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const domain = new ConversationDomain(client, store)

    await domain.refresh(true)

    expect(client.chatManager.refreshSessionList).toHaveBeenCalledWith({ includeEmpty: true })
    expect(store.setList).not.toHaveBeenCalled()
  })

  it('注入路径 refresh 收到 hasMore=true 但 cursor 缺失的页时按到底处理（防触底空转）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const fetchConversations = vi.fn()
      // 契约违例页：hasMore=true 但不带 cursor
      .mockResolvedValue({ list: [makeConversation('cvs-1')], cursor: undefined, hasMore: true })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh()

    // 违例页被归一化为到底（否则 UI 触底后 loadMore 原地空转假加载）
    expect(store.setHasMoreConversations).toHaveBeenCalledWith(false)
    await domain.loadMore()
    expect(fetchConversations).toHaveBeenCalledTimes(1)
  })

  it('注入路径 loadMore 续页收到 hasMore=true 但 cursor 缺失的页时按到底处理', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const fetchConversations = vi.fn()
      .mockResolvedValueOnce({ list: [makeConversation('cvs-1')], cursor: 'p2', hasMore: true })
      // 续页契约违例：hasMore=true 但不带 cursor
      .mockResolvedValueOnce({ list: [makeConversation('cvs-2')], cursor: undefined, hasMore: true })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh()
    store.conversationList = store.setList.mock.calls[0][0] as UiConversation[]
    await domain.loadMore()

    expect(store.setHasMoreConversations).toHaveBeenLastCalledWith(false)
    // 归一化后游标被清空，再次 loadMore 短路不再请求
    await domain.loadMore()
    expect(fetchConversations).toHaveBeenCalledTimes(2)
  })

  it('dispose 重置注入分页游标（登出后 loadMore 不按旧游标续页）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const fetchConversations = vi.fn()
      .mockResolvedValue({ list: [makeConversation('cvs-1')], cursor: 'p2', hasMore: true })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh()
    domain.dispose()
    await domain.loadMore()

    // 游标已随 dispose 清空，loadMore 短路不再请求
    expect(fetchConversations).toHaveBeenCalledTimes(1)
  })

  it('注入 searchConversations 时 domain 委托且不写 store；未注入返回 null', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const hit = makeConversation('cvs-hit', { name: '李四 06' })
    const searchConversations = vi.fn().mockResolvedValue({ list: [hit], cursor: undefined, hasMore: false })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { searchConversations },
    })

    const page = await domain.searchConversations({ keyword: '李四06' })

    expect(searchConversations).toHaveBeenCalledWith({ keyword: '李四06' })
    expect(page?.list.map(c => c.id)).toEqual(['cvs-hit'])
    // 搜索结果不写入会话 store（渲染态由调用方本地持有）
    expect(store.setList).not.toHaveBeenCalled()

    // 未注入：返回 null，UI 回落内存过滤
    const plain = new ConversationDomain(client, store)
    await expect(plain.searchConversations({ keyword: '李四06' })).resolves.toBeNull()
  })

  it('domain 方法依赖 this（防回归钉：UI 层禁止解构调用，2026-09-07 this 绑定丢失事故）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const searchConversations = vi.fn().mockResolvedValue({ list: [], hasMore: false })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { searchConversations },
    })

    // 解构后调用丢 this → this.hooks 抛 TypeError。若未来改为不依赖 this 的实现，
    // 本用例需同步删除（并通知 UI 层解除「禁止解构」约定）
    const detached = domain.searchConversations
    await expect(detached({ keyword: 'x' })).rejects.toThrow()
    // 保留接收者的调用正常
    await expect(domain.searchConversations({ keyword: 'x' })).resolves.toEqual({ list: [], hasMore: false })
  })

  it('refresh 透传 filter，loadMore 续页沿用同 filter（游标按 filter 维度隔离）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const fetchConversations = vi.fn()
      .mockResolvedValue({ list: [makeConversation('cvs-1')], cursor: 'p2', hasMore: true })
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations },
    })

    await domain.refresh(false, { unreadOnly: true })
    expect(fetchConversations).toHaveBeenNthCalledWith(1, undefined, 50, { unreadOnly: true })

    // 续页沿用 refresh 登记的 filter
    await domain.loadMore()
    expect(fetchConversations).toHaveBeenNthCalledWith(2, 'p2', 50, { unreadOnly: true })

    // 切 filter：refresh 重新拉首页（游标重置，filter 更换）
    await domain.refresh(false, { type: CONVERSATION_TYPE.GROUPCHAT })
    expect(fetchConversations).toHaveBeenNthCalledWith(3, undefined, 50, { type: CONVERSATION_TYPE.GROUPCHAT })
  })

  it('supportsConversationListFilter 探测：注入为 true，未注入为 false', () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const injected = new ConversationDomain(client, store, {
      conversationRepository: { fetchConversations: vi.fn() },
    })
    expect(injected.supportsConversationListFilter).toBe(true)
    expect(new ConversationDomain(client, store).supportsConversationListFilter).toBe(false)
  })

  it('未注入时 refresh 带 filter 仍走 SDK 默认路径（忽略 filter）', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const domain = new ConversationDomain(client, store)

    await domain.refresh(false, { unreadOnly: true })

    expect(client.chatManager.refreshSessionList).toHaveBeenCalledWith({ includeEmpty: false })
  })

  it('getTotalUnreadCount：注入时委托聚合查询，未注入返回 null', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const getTotalUnreadCount = vi.fn().mockResolvedValue(42)
    const domain = new ConversationDomain(client, store, {
      conversationRepository: { getTotalUnreadCount },
    })

    await expect(domain.getTotalUnreadCount()).resolves.toBe(42)
    expect(getTotalUnreadCount).toHaveBeenCalledTimes(1)

    const plain = new ConversationDomain(client, store)
    await expect(plain.getTotalUnreadCount()).resolves.toBeNull()
  })
})

// ===== 四域（contact / group / presence / userInfo）注入 =====

function makeContactClient() {
  return {
    currentUserId: SELF,
    contactManager: {
      getContacts: vi.fn(() => []),
      getBlocklist: vi.fn().mockResolvedValue([]),
      addContact: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as ManagerHost
}

function makeContactStore() {
  return {
    setList: vi.fn(),
    setBlocklist: vi.fn(),
    updateRemark: vi.fn(),
  } as unknown as ContactStoreLike & {
    setList: ReturnType<typeof vi.fn>
    setBlocklist: ReturnType<typeof vi.fn>
  }
}

function makeGroupClient() {
  return {
    currentUserId: SELF,
    groupManager: {
      getJoinedGroupList: vi.fn(() => []),
      createGroup: vi.fn().mockResolvedValue({ groupId: 'g-sdk' }),
      getGroupInfo: vi.fn().mockResolvedValue({}),
    },
  } as unknown as ManagerHost
}

function makeGroupStore() {
  return {
    setList: vi.fn(),
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    getGroupById: vi.fn(),
  } as unknown as GroupStoreLike & {
    setList: ReturnType<typeof vi.fn>
    addGroup: ReturnType<typeof vi.fn>
    getGroupById: ReturnType<typeof vi.fn>
  }
}

function makePresenceClient(connected: boolean) {
  return {
    currentUserId: SELF,
    isConnected: connected,
    presenceManager: {
      subscribePresence: vi.fn().mockResolvedValue([]),
      unsubscribePresence: vi.fn().mockResolvedValue(undefined),
      getPresenceStatus: vi.fn().mockResolvedValue([]),
    },
  } as unknown as ManagerHost
}

function makePresenceStore() {
  return {
    updateBatch: vi.fn(),
    setSubscribed: vi.fn(),
  } as unknown as PresenceStoreLike & {
    updateBatch: ReturnType<typeof vi.fn>
    setSubscribed: ReturnType<typeof vi.fn>
  }
}

function makeUserInfoClient() {
  return {
    currentUserId: SELF,
    isConnected: true,
    userInfoManager: {
      getUserInfoByAttribute: vi.fn().mockResolvedValue([]),
      addEventHandler: vi.fn(),
      removeEventHandler: vi.fn(),
    },
  } as unknown as ManagerHost
}

function makeUserInfoStore() {
  const infos = new Map<string, UserInfo>()
  return {
    getUserInfo: (userId: string) => infos.get(userId),
    setUserInfo: vi.fn((info: UserInfo) => infos.set(info.userId, info)),
    setUserInfos: vi.fn((list: UserInfo[]) => {
      for (const info of list)
        infos.set(info.userId, info)
    }),
    areAttributesFetched: () => false,
    markFetchedAttributes: vi.fn(),
    markLoading: vi.fn(),
    markLoaded: vi.fn(),
    markFetchFailed: vi.fn(),
    isFetchFailed: () => false,
    isLoading: () => false,
  } as unknown as UserInfoStoreLike & {
    setUserInfos: ReturnType<typeof vi.fn>
  }
}

describe('contactDomain 数据入口注入（repositories）', () => {
  it('注入 fetchContacts 时 fetchContacts 走注入实现且不触 SDK', async () => {
    const client = makeContactClient()
    const store = makeContactStore()
    const fetchContacts = vi.fn().mockResolvedValue({
      list: [{ userId: 'biz-1', name: '业务联系人' } satisfies UiContact],
      cursor: 'p2',
      hasMore: true,
    })
    const domain = new ContactDomain(client, store, {
      contactRepository: { fetchContacts },
    })

    const page = await domain.fetchContacts(undefined, 20)

    expect(fetchContacts).toHaveBeenCalledWith(undefined, 20)
    expect(client.contactManager.getContacts).not.toHaveBeenCalled()
    expect(page).toEqual({ list: [{ userId: 'biz-1', name: '业务联系人' }], cursor: 'p2', hasMore: true })
    // 分页读路径不写 store（由消费方按分页语义写入）
    expect(store.setList).not.toHaveBeenCalled()
  })

  it('未注入时 fetchContacts 回落 SDK 本地全量', async () => {
    const client = makeContactClient()
    const store = makeContactStore()
    const domain = new ContactDomain(client, store)

    const page = await domain.fetchContacts()

    expect(client.contactManager.getContacts).toHaveBeenCalledTimes(1)
    expect(page).toEqual({ list: [], cursor: undefined, hasMore: false })
  })

  it('注入 fetchBlocklist 时 syncBlocklist 走注入实现并写 store', async () => {
    const client = makeContactClient()
    const store = makeContactStore()
    const blocked: UiContact[] = [{ userId: 'blk-1' }]
    const domain = new ContactDomain(client, store, {
      contactRepository: { fetchBlocklist: vi.fn().mockResolvedValue(blocked) },
    })

    const list = await domain.syncBlocklist()

    expect(client.contactManager.getBlocklist).not.toHaveBeenCalled()
    expect(list).toEqual(blocked)
    expect(store.setBlocklist).toHaveBeenCalledWith(blocked)
  })

  it('未注入时 syncBlocklist 走 SDK 默认路径', async () => {
    const client = makeContactClient()
    const store = makeContactStore()
    const domain = new ContactDomain(client, store)

    await domain.syncBlocklist()

    expect(client.contactManager.getBlocklist).toHaveBeenCalledTimes(1)
  })

  it('注入 addContact 时添加好友动作整体委托（不触 SDK）', async () => {
    const client = makeContactClient()
    const store = makeContactStore()
    const addContact = vi.fn().mockResolvedValue(undefined)
    const domain = new ContactDomain(client, store, {
      contactRepository: { addContact },
    })

    await domain.addContact('u1', 'hello')

    expect(addContact).toHaveBeenCalledWith('u1', 'hello')
    expect(client.contactManager.addContact).not.toHaveBeenCalled()
  })
})

describe('groupDomain 数据入口注入（repositories）', () => {
  it('注入 fetchGroups 时 fetchGroups 走注入实现且不触 SDK', async () => {
    const client = makeGroupClient()
    const store = makeGroupStore()
    const groups: UiGroup[] = [{ groupId: 'g-biz', groupName: '业务群' } as UiGroup]
    const fetchGroups = vi.fn().mockResolvedValue({ list: groups, cursor: undefined, hasMore: false })
    const domain = new GroupDomain(client, store, {
      groupRepository: { fetchGroups },
    })

    const page = await domain.fetchGroups()

    expect(fetchGroups).toHaveBeenCalledTimes(1)
    expect(client.groupManager.getJoinedGroupList).not.toHaveBeenCalled()
    expect(page.list).toEqual(groups)
    expect(store.setList).not.toHaveBeenCalled()
  })

  it('未注入时 fetchGroups 回落 SDK 本地全量', async () => {
    const client = makeGroupClient()
    const store = makeGroupStore()
    const domain = new GroupDomain(client, store)

    const page = await domain.fetchGroups()

    expect(client.groupManager.getJoinedGroupList).toHaveBeenCalledTimes(1)
    expect(page).toEqual({ list: [], cursor: undefined, hasMore: false })
  })

  it('注入 createGroup 时创建群组整体委托（不调 SDK、不写本地缓存）', async () => {
    const client = makeGroupClient()
    const store = makeGroupStore()
    const createGroup = vi.fn().mockResolvedValue({ groupId: 'g-biz' })
    const domain = new GroupDomain(client, store, {
      groupRepository: { createGroup },
    })

    const result = await domain.createGroup({ name: '业务群', memberIds: ['u1'] })

    expect(createGroup).toHaveBeenCalledWith({ name: '业务群', memberIds: ['u1'] })
    expect(client.groupManager.createGroup).not.toHaveBeenCalled()
    expect(store.addGroup).not.toHaveBeenCalled()
    expect(result.groupId).toBe('g-biz')
  })

  it('未注入时 createGroup 走 SDK 默认路径（创建后写本地缓存）', async () => {
    const client = makeGroupClient()
    const store = makeGroupStore()
    const domain = new GroupDomain(client, store)

    const result = await domain.createGroup({ name: 'SDK 群', memberIds: [] })

    expect(client.groupManager.createGroup).toHaveBeenCalledTimes(1)
    expect(store.addGroup).toHaveBeenCalledTimes(1)
    expect(result.groupId).toBe('g-sdk')
  })
})

describe('presenceDomain 数据入口注入（repositories）', () => {
  it('注入时 subscribe/unsubscribe/fetchStatus 整体委托（先于 isConnected 守卫）', async () => {
    const client = makePresenceClient(false)
    const store = makePresenceStore()
    const list: UiPresence[] = [{ userId: PEER, status: 'online', ext: '', lastTime: 1 }]
    const subscribe = vi.fn().mockResolvedValue(undefined)
    const unsubscribe = vi.fn().mockResolvedValue(undefined)
    const fetchStatus = vi.fn().mockResolvedValue(list)
    const domain = new PresenceDomain(client, store, {
      presenceRepository: { subscribe, unsubscribe, fetchStatus },
    })

    await domain.subscribe([PEER])
    const queried = await domain.fetchStatus([PEER])
    await domain.unsubscribe([PEER])

    expect(subscribe).toHaveBeenCalledWith([PEER], expect.any(Number))
    expect(fetchStatus).toHaveBeenCalledWith([PEER])
    expect(unsubscribe).toHaveBeenCalledWith([PEER])
    // 未连接触达注入实现；SDK presenceManager 全程不触
    expect(client.presenceManager.subscribePresence).not.toHaveBeenCalled()
    expect(client.presenceManager.getPresenceStatus).not.toHaveBeenCalled()
    expect(client.presenceManager.unsubscribePresence).not.toHaveBeenCalled()
    // fetchStatus 注入结果仍写 store
    expect(store.updateBatch).toHaveBeenCalledWith(list)
    expect(queried).toEqual(list)
  })

  it('未注入时走 SDK 默认路径', async () => {
    const client = makePresenceClient(true)
    const store = makePresenceStore()
    const domain = new PresenceDomain(client, store)

    await domain.subscribe([PEER])
    await domain.fetchStatus([PEER])
    await domain.unsubscribe([PEER])

    expect(client.presenceManager.subscribePresence).toHaveBeenCalledTimes(1)
    expect(client.presenceManager.getPresenceStatus).toHaveBeenCalledTimes(1)
    expect(client.presenceManager.unsubscribePresence).toHaveBeenCalledTimes(1)
  })
})

describe('userInfoDomain 数据入口注入（repositories）', () => {
  it('注入 fetchUserInfos 时 fetchUserInfos 走注入实现且不触 SDK', async () => {
    const client = makeUserInfoClient()
    const store = makeUserInfoStore()
    const fetchUserInfos = vi.fn().mockResolvedValue([
      { userId: PEER, nickname: '注入昵称', avatarUrl: 'a.png', extra: '被收敛' },
    ])
    const domain = new UserInfoDomain(client, store, { fetchUserInfos })

    const result = await domain.fetchUserInfos([PEER])

    expect(fetchUserInfos).toHaveBeenCalledWith([PEER])
    expect(client.userInfoManager.getUserInfoByAttribute).not.toHaveBeenCalled()
    // 字段收敛：只保留契约九属性
    expect(store.setUserInfos).toHaveBeenCalledWith([
      expect.objectContaining({ userId: PEER, nickname: '注入昵称', avatarUrl: 'a.png' }),
    ])
    expect((store.setUserInfos.mock.calls[0][0] as UserInfo[])[0]).not.toHaveProperty('extra')
    expect(result[0]?.nickname).toBe('注入昵称')
  })

  it('未注入时 fetchUserInfos 走 SDK 默认路径', async () => {
    const client = makeUserInfoClient()
    ;(client.userInfoManager.getUserInfoByAttribute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: PEER, nickname: 'SDK 昵称' },
    ])
    const store = makeUserInfoStore()
    const domain = new UserInfoDomain(client, store)

    const result = await domain.fetchUserInfos([PEER])

    expect(client.userInfoManager.getUserInfoByAttribute).toHaveBeenCalledTimes(1)
    expect(result[0]?.nickname).toBe('SDK 昵称')
  })
})
