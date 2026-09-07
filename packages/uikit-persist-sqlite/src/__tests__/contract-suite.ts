/**
 * L1 契约行为套件（规格书决策 4 测试分层：最先写）。
 *
 * 把 hooks / repository 应满足的一致性语义（D122 决策 12/13：upsert 幂等 /
 * pending 升格 / 墓碑 / clearedBefore / keyset 分页稳定性 / 级联删除可选 /
 * chatRoom / cmd 跳过 / insertLocalMessage / 置顶）写成参数化套件，
 * SQLite 实现只是被测对象之一；行为契约被测试固定，实现可换。
 *
 * 用法：`runPersistenceContractSuite('实现名', factory)`，factory 每用例给出全新实例。
 */

import type {
  ConversationPage,
  ConversationSearchParams,
  ConversationTypeValue,
  MessagePage,
  MessageRecord,
  MessageSearchParams,
  SdkPersistenceHooks,
} from '@easemob/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeConversation, makeRecord } from './helpers'

/** 被测句柄：hooks + repository + 可选管理口（实现方可选提供的以 ? 标注） */
export interface PersistenceContractHandle {
  hooks: SdkPersistenceHooks
  repository: {
    loadMessages: (
      conversationId: string,
      conversationType: ConversationTypeValue,
      cursor?: string,
      pageSize?: number,
    ) => Promise<MessagePage>
    fetchConversations: (cursor?: string, pageSize?: number) => Promise<ConversationPage>
    searchMessages?: (params: MessageSearchParams) => Promise<MessagePage>
    searchConversations?: (params: ConversationSearchParams) => Promise<ConversationPage>
  }
  /** FTS 等异步队列的同步等待口（搜索断言前先 flush） */
  flushFts?: () => void | Promise<void>
  insertLocalMessage?: (input: {
    conversationId: string
    conversationType: ConversationTypeValue
    from: string
    to: string
    type: MessageRecord['type']
    body: MessageRecord['body']
    ext?: Record<string, unknown>
    timestamp?: number
    msgLocalId?: string
  }) => Promise<MessageRecord>
  setMessagePinned?: (msgId: string, pinned: boolean) => Promise<void>
  clearMessages?: (filter: { before?: number, type?: string, conversationId?: string }) => Promise<number>
  close: () => void | Promise<void>
}

export type PersistenceContractFactory = () => Promise<PersistenceContractHandle>

async function flushFts(handle: PersistenceContractHandle): Promise<void> {
  await handle.flushFts?.()
}

export function runPersistenceContractSuite(name: string, factory: PersistenceContractFactory): void {
  describe(`L1 持久化契约行为套件（${name}）`, () => {
    let handle: PersistenceContractHandle

    beforeEach(async () => {
      handle = await factory()
    })

    afterEach(async () => {
      await handle.close()
    })

    it('saveMessage 落库并可经 loadMessages 读回（页内升序）', async () => {
      const record = makeRecord({ msgServerId: 'srv-a', timestamp: 1000 })
      await handle.hooks.message?.saveMessage?.(record)

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].msgServerId).toBe('srv-a')
      expect(page.hasMore).toBe(false)
    })

    it('saveMessage 按 msgServerId upsert 幂等（重复投递 / 状态回流重放不产生重复行）', async () => {
      const record = makeRecord({ msgServerId: 'srv-dup', body: { content: 'first' } })
      await handle.hooks.message?.saveMessage?.(record)
      await handle.hooks.message?.saveMessage?.({ ...record, body: { content: 'second' } })

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].body).toEqual({ content: 'second' })
    })

    it('pending 升格：msgServerId 空先落库，回填后按 msgLocalId 合并而非新增', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: '', msgLocalId: 'loc-p1', sendStatus: MESSAGE_STATUS.SENDING }),
      )
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-p1', msgLocalId: 'loc-p1', sendStatus: MESSAGE_STATUS.SENT }),
      )

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].msgServerId).toBe('srv-p1')
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.SENT)
    })

    it('pending 行不被未回填的重放降级（msgServerId 不被清回空）', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-p2', msgLocalId: 'loc-p2', sendStatus: MESSAGE_STATUS.SENT }),
      )
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: '', msgLocalId: 'loc-p2', sendStatus: MESSAGE_STATUS.SENDING }),
      )

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].msgServerId).toBe('srv-p2')
    })

    it('updateMessageStatus 按 msgServerId / msgLocalId 均可定位', async () => {
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-s1', msgLocalId: 'loc-s1' }))
      await handle.hooks.message?.updateMessageStatus?.('srv-s1', MESSAGE_STATUS.DELIVERED)
      let page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.DELIVERED)

      await handle.hooks.message?.updateMessageStatus?.('loc-s1', MESSAGE_STATUS.READ)
      page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.READ)
      expect(page.list[0].isPeerRead).toBe(true)
    })

    it('markMessageRecalled 置墓碑：loadMessages 仍返回该行（UI 渲染占位），搜索不再命中', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-r1', body: { content: 'recall me please' } }),
      )
      await handle.hooks.message?.markMessageRecalled?.('srv-r1', 'admin1')

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect((page.list[0] as MessageRecord).recalled).toBe(true)
      expect((page.list[0] as MessageRecord).tombstoneTime).toBeTypeOf('number')

      if (handle.repository.searchMessages) {
        await flushFts(handle)
        const found = await handle.repository.searchMessages({ keyword: 'recall' })
        expect(found.list).toHaveLength(0)
      }
    })

    it('deleteMessages 置删除墓碑：loadMessages 过滤该行', async () => {
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-d1' }),
        makeRecord({ msgServerId: 'srv-d2' }),
      ])
      await handle.hooks.message?.deleteMessages?.(['srv-d1'])

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-d2'])
    })

    it('updateMessageContent 更新后可搜到新内容、搜不到旧内容', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-e1', body: { content: 'alpha beta gamma' } }),
      )
      await handle.hooks.message?.updateMessageContent?.(
        'srv-e1',
        { content: 'delta epsilon zeta' },
        {},
        { operatorId: 'me', operationCount: 1, operationTime: 1700000001000 },
      )

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list[0].body).toEqual({ content: 'delta epsilon zeta' })
      expect(page.list[0].modifiedInfo?.operationCount).toBe(1)

      if (handle.repository.searchMessages) {
        await flushFts(handle)
        const hitNew = await handle.repository.searchMessages({ keyword: 'epsilon' })
        expect(hitNew.list.map(m => m.msgServerId)).toEqual(['srv-e1'])
        const hitOld = await handle.repository.searchMessages({ keyword: 'gamma' })
        expect(hitOld.list).toHaveLength(0)
      }
    })

    it('clearMessages 物理删并写 clearedBefore 水位线：水位线以下回流消息被过滤', async () => {
      if (!handle.clearMessages)
        return
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-w1', timestamp: 100 }),
        makeRecord({ msgServerId: 'srv-w2', timestamp: 200 }),
        makeRecord({ msgServerId: 'srv-w3', timestamp: 300 }),
      ])

      const removed = await handle.clearMessages({ conversationId: 'c1', before: 250 })
      expect(removed).toBe(2)
      let page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-w3'])

      // 「用户清了就永远不再回来」：水位线以下的漫游回流直接不入读侧结果
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-w0', timestamp: 150 }))
      page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-w3'])
    })

    it('loadMessages keyset 分页：无重复无遗漏、页内升序、游标向更老方向推进', async () => {
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRecord({ msgServerId: `srv-k${i}`, timestamp: 1000 + i }))
      await handle.hooks.message?.saveMessages?.(records)

      const seen: string[] = []
      let cursor: string | undefined
      const pageSizes: number[] = []
      for (let round = 0; round < 10; round++) {
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT, cursor, 4)
        pageSizes.push(page.list.length)
        seen.push(...page.list.map(m => m.msgServerId))
        if (!page.hasMore)
          break
        cursor = page.cursor
      }
      expect(pageSizes).toEqual([4, 4, 2])
      // 游标向更老方向推进：每页内部升序（prependMessages 约定），页间由新到老
      expect(seen).toEqual([
        'srv-k6',
        'srv-k7',
        'srv-k8',
        'srv-k9',
        'srv-k2',
        'srv-k3',
        'srv-k4',
        'srv-k5',
        'srv-k0',
        'srv-k1',
      ])
      expect(new Set(seen).size).toBe(10)
    })

    it('loadMessages 同毫秒并列靠 msgServerId 决胜：跨页排序稳定', async () => {
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-ta', timestamp: 5000 }),
        makeRecord({ msgServerId: 'srv-tb', timestamp: 5000 }),
        makeRecord({ msgServerId: 'srv-tc', timestamp: 5000 }),
      ])

      const ids: string[] = []
      let cursor: string | undefined
      for (let round = 0; round < 10; round++) {
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT, cursor, 1)
        ids.push(...page.list.map(m => m.msgServerId))
        if (!page.hasMore)
          break
        cursor = page.cursor
      }
      // DESC 排序键 (timestamp, msgServerId)：srv-tc > srv-tb > srv-ta，逐页向更老推进
      expect(ids).toEqual(['srv-tc', 'srv-tb', 'srv-ta'])
    })

    it('loadMessages 同毫秒多条 pending（msgServerId 为 NULL）由第三决胜键稳定分页', async () => {
      // pending 期 msgServerId 为 NULL，同毫秒多条时两键 keyset 无决胜会丢页/重复；
      // 三键 (timestamp, msgServerId, rowid) 下应无重复无遗漏
      await handle.hooks.message?.saveMessages?.(
        Array.from({ length: 5 }, (_, i) =>
          makeRecord({ msgServerId: '', msgLocalId: `loc-tie-${i}`, timestamp: 8000 })),
      )

      const ids: string[] = []
      let cursor: string | undefined
      for (let round = 0; round < 10; round++) {
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT, cursor, 2)
        ids.push(...page.list.map(m => m.msgLocalId))
        if (!page.hasMore)
          break
        cursor = page.cursor
      }
      expect(ids).toHaveLength(5)
      expect(new Set(ids).size).toBe(5)
    })

    it('clearMessages 水位线贯通：回流老消息写侧拦截，loadMessages / searchMessages 均不可见', async () => {
      if (!handle.clearMessages)
        return
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-wl1', timestamp: 100, body: { content: 'waterline alpha bravo' } }),
        makeRecord({ msgServerId: 'srv-wl2', timestamp: 200, body: { content: 'waterline charlie delta' } }),
      ])
      await handle.clearMessages({ conversationId: 'c1', before: 250 })

      // 漫游回流老消息（早于水位线）：写侧直接跳过（而非入库后读侧过滤）
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-wl0', timestamp: 150, body: { content: 'waterline alpha bravo' } }),
      ])
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(0)

      // 搜索读侧同样不可见（FTS 分支水位线过滤）
      if (handle.repository.searchMessages) {
        await flushFts(handle)
        const found = await handle.repository.searchMessages({ keyword: 'waterline' })
        expect(found.list).toHaveLength(0)
      }
    })

    it('fetchConversations：置顶段固定在首页且优先，非置顶按 COALESCE(lastMessageTime, draftTime, createdAt) 倒序', async () => {
      await handle.hooks.conversation?.saveConversations?.([
        makeConversation({ id: 'cv-old', lastMessageTime: 100 }),
        makeConversation({ id: 'cv-new', lastMessageTime: 300 }),
        makeConversation({ id: 'cv-mid', lastMessageTime: 200 }),
        makeConversation({ id: 'cv-pin', isPinned: true, pinnedTime: 50, lastMessageTime: 10 }),
      ])

      const page = await handle.repository.fetchConversations()
      expect(page.list.map(c => c.id)).toEqual(['cv-pin', 'cv-new', 'cv-mid', 'cv-old'])
      expect(page.hasMore).toBe(false)
    })

    it('fetchConversations keyset 续页：首页含全部置顶，续页无重复无遗漏', async () => {
      await handle.hooks.conversation?.saveConversations?.([
        makeConversation({ id: 'cv-p1', isPinned: true, pinnedTime: 1, lastMessageTime: 10 }),
        makeConversation({ id: 'cv-p2', isPinned: true, pinnedTime: 2, lastMessageTime: 20 }),
        makeConversation({ id: 'cv-n1', lastMessageTime: 300 }),
        makeConversation({ id: 'cv-n2', lastMessageTime: 200 }),
        makeConversation({ id: 'cv-n3', lastMessageTime: 100 }),
      ])

      const first = await handle.repository.fetchConversations(undefined, 3)
      // 首页固定含全部置顶（即使超过 pageSize 剩余位）
      expect(first.list.map(c => c.id)).toEqual(['cv-p2', 'cv-p1', 'cv-n1'])
      expect(first.hasMore).toBe(true)

      const second = await handle.repository.fetchConversations(first.cursor, 3)
      expect(second.list.map(c => c.id)).toEqual(['cv-n2', 'cv-n3'])
      expect(second.hasMore).toBe(false)
    })

    it('removeConversations 缺省只删会话行：消息保留，会话再浮现时历史仍在', async () => {
      await handle.hooks.conversation?.saveConversations?.([makeConversation({ id: 'c1', name: 'c1' })])
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-keep' }))
      await handle.hooks.conversation?.removeConversations?.(['c1'])

      const conversations = await handle.repository.fetchConversations()
      expect(conversations.list).toHaveLength(0)
      const messages = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(messages.list.map(m => m.msgServerId)).toEqual(['srv-keep'])
    })

    it('removeConversations deleteMessages=true 级联物理删消息（微信语义）', async () => {
      await handle.hooks.conversation?.saveConversations?.([makeConversation({ id: 'c1', name: 'c1' })])
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-gone', body: { content: 'cascade delete target' } }))
      await handle.hooks.conversation?.removeConversations?.(['c1'], { deleteMessages: true })

      const messages = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(messages.list).toHaveLength(0)
      if (handle.repository.searchMessages) {
        await flushFts(handle)
        const found = await handle.repository.searchMessages({ keyword: 'cascade' })
        expect(found.list).toHaveLength(0)
      }
    })

    it('chatRoom 消息整行不落库（弹幕高频无持久化价值）', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-cr1', conversationId: 'room1', conversationType: 'chatRoom' }),
      )
      const page = await handle.repository.loadMessages('room1', 'chatRoom' as ConversationTypeValue)
      expect(page.list).toHaveLength(0)
    })

    it('cmd 透传消息整行不入库（控制信令，不进消息流）', async () => {
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-cmd1', type: MESSAGE_TYPE.CMD, body: { action: 'TypingBegin' } }),
      )
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(0)
    })

    it('insertLocalMessage 强制 local_ 前缀 msgLocalId 且可读回', async () => {
      if (!handle.insertLocalMessage)
        return
      const record = await handle.insertLocalMessage({
        conversationId: 'c1',
        conversationType: CONVERSATION_TYPE.SINGLECHAT,
        from: 'me',
        to: 'peer1',
        type: MESSAGE_TYPE.TEXT,
        body: { content: '本地系统提示' },
        msgLocalId: 'no-prefix-id',
      })
      expect(record.msgLocalId).toBe('local_no-prefix-id')

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].msgLocalId).toBe('local_no-prefix-id')
    })

    it('setMessagePinned 本地置顶 / updateMessagePinned(null) 取消置顶', async () => {
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-pin1' }))
      await handle.setMessagePinned?.('srv-pin1', true)

      let page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect((page.list[0] as { pinnedTime?: number }).pinnedTime).toBeTypeOf('number')

      await handle.hooks.message?.updateMessagePinned?.('srv-pin1', null)
      page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect((page.list[0] as { pinnedTime?: number }).pinnedTime).toBeUndefined()
    })

    it('searchMessages 全局搜索与会话作用域缩圈', async () => {
      if (!handle.repository.searchMessages)
        return
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-sc1', conversationId: 'c1', body: { content: 'search target alpha' } }),
        makeRecord({ msgServerId: 'srv-sc2', conversationId: 'c2', body: { content: 'search target beta' } }),
      ])
      await flushFts(handle)

      const global = await handle.repository.searchMessages({ keyword: 'search target' })
      expect(global.list.map(m => m.msgServerId).sort()).toEqual(['srv-sc1', 'srv-sc2'])

      const scoped = await handle.repository.searchMessages({ keyword: 'search target', conversationId: 'c2' })
      expect(scoped.list.map(m => m.msgServerId)).toEqual(['srv-sc2'])
    })

    it('searchConversations 按会话名 / 用户昵称 LIKE 匹配', async () => {
      if (!handle.repository.searchConversations)
        return
      await handle.hooks.conversation?.saveConversations?.([
        makeConversation({ id: 'cv-s1', name: '产品讨论组', type: CONVERSATION_TYPE.GROUPCHAT }),
        makeConversation({ id: 'cv-s2', name: 'Tom' }),
      ])

      const byName = await handle.repository.searchConversations({ keyword: '产品' })
      expect(byName.list.map(c => c.id)).toEqual(['cv-s1'])

      const byType = await handle.repository.searchConversations({ keyword: 'Tom', conversationType: CONVERSATION_TYPE.GROUPCHAT })
      expect(byType.list).toHaveLength(0)
    })
  })
}
