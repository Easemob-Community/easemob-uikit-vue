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
    conversationList: [] as UiConversation[],
  } as unknown as ConversationStoreLike & { setList: ReturnType<typeof vi.fn> }
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

    expect(client.chatManager.refreshSessionList).not.toHaveBeenCalled()
    expect(fetchConversations).toHaveBeenCalledTimes(2)
    expect(fetchConversations).toHaveBeenNthCalledWith(1, undefined, 50)
    expect(fetchConversations).toHaveBeenNthCalledWith(2, 'p2', 50)
    // 合并后按最后一条消息时间倒序写入 store
    expect(store.setList).toHaveBeenCalledTimes(1)
    const list = store.setList.mock.calls[0][0] as UiConversation[]
    expect(list.map(c => c.id)).toEqual(['cvs-new', 'cvs-old'])
  })

  it('未注入时 refresh 走 SDK 默认路径', async () => {
    const client = makeConversationClient()
    const store = makeConversationStore()
    const domain = new ConversationDomain(client, store)

    await domain.refresh(true)

    expect(client.chatManager.refreshSessionList).toHaveBeenCalledWith({ includeEmpty: true })
    expect(store.setList).not.toHaveBeenCalled()
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
  } as unknown as GroupStoreLike & {
    setList: ReturnType<typeof vi.fn>
    addGroup: ReturnType<typeof vi.fn>
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
