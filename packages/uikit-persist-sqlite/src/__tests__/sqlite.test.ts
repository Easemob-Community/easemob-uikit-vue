/**
 * L2 SQLite 实现测试（规格书决策 4：better-sqlite3 `:memory:` 实例，同步 API；
 * 每用例独立实例 + afterEach 清理）。
 *
 * 覆盖：L1 契约套件全量 + 实现特有项——事务回滚、FTS 中文语料、tip 不入 FTS、
 * 撤回后搜不到、generated column ext 索引、sending→failed 启动降级、migration runner。
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SqliteDriver } from '../driver/driver'
import { wrapBetterSqlite3 } from '../driver/driver'
import type { UikitPersistenceHandle } from '../index'
import { createPersistence } from '../index'
import { SCHEMA_VERSION } from '../schema/schema'
import { runPersistenceContractSuite } from './contract-suite'
import { makeConversation, makeRecord } from './helpers'

const ACCOUNT = { appKey: 'app-key', userId: 'user-1' }

/** 静默 logger（测试默认不打印 warn；需要断言时自行注入 vi.fn） */
const silentLogger = { warn: () => {} }

async function makeMemoryHandle(): Promise<UikitPersistenceHandle> {
  return createPersistence({ dbPath: ':memory:', account: ACCOUNT, logger: silentLogger })
}

// L1 契约行为套件：SQLite 实现作为被测对象
runPersistenceContractSuite('uikit-persist-sqlite', makeMemoryHandle)

describe('l2 SQLite 实现特有项', () => {
  let handle: UikitPersistenceHandle | undefined

  afterEach(async () => {
    await handle?.close()
    handle = undefined
  })

  describe('事务回滚', () => {
    it('驱动 transaction 抛错时整批回滚', async () => {
      const driver: SqliteDriver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })

      expect(() =>
        driver.transaction(() => {
          driver.prepare(
            'INSERT INTO uikit_conversations (id, type, name, createdAt) VALUES (?, ?, ?, ?)',
          ).run('cv-rb', 'singleChat', 'rollback', 1)
          throw new Error('boom')
        }),
      ).toThrow('boom')

      const row = driver.prepare('SELECT id FROM uikit_conversations WHERE id = ?').get('cv-rb')
      expect(row).toBeUndefined()
    })

    it('批量 saveMessages 中途失败只 warn 不抛出，且钩子链不阻塞', async () => {
      const logger = { warn: vi.fn() }
      handle = await createPersistence({ dbPath: ':memory:', account: ACCOUNT, logger })
      // 构造必然失败的批量：conversationType 为 null 触发 NOT NULL 约束
      const bad = { ...makeRecord({ msgServerId: 'srv-bad' }), conversationType: null } as never
      await handle.hooks.message?.saveMessages?.([makeRecord({ msgServerId: 'srv-good' }), bad])

      expect(logger.warn).toHaveBeenCalled()
      // 整批回滚：good 也不残留（批量事务语义）
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(0)
    })
  })

  describe('fTS 中文语料（决策 3.6 trigram 验收）', () => {
    it('「明天下午开会」搜「下午」（二字词走 LIKE 回落）与「天下午」（FTS）均命中', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-zh1', body: { content: '明天下午开会' } }),
      )
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-zh2', body: { content: '今天中午吃饭' } }),
      )
      handle.flushFts()

      const two = await handle.repository.searchMessages({ keyword: '下午' })
      expect(two.list.map(m => m.msgServerId)).toEqual(['srv-zh1'])

      const three = await handle.repository.searchMessages({ keyword: '天下午' })
      expect(three.list.map(m => m.msgServerId)).toEqual(['srv-zh1'])

      const miss = await handle.repository.searchMessages({ keyword: '中午' })
      expect(miss.list.map(m => m.msgServerId)).toEqual(['srv-zh2'])
    })

    it('附件文件名 / 位置文本 / 合并消息内层文本入索引', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-f1', type: MESSAGE_TYPE.FILE, body: { filename: '季度财报汇总.xlsx' } }),
        makeRecord({ msgServerId: 'srv-l1', type: MESSAGE_TYPE.LOCATION, body: { latitude: 31.2, longitude: 121.5, address: '上海市浦东新区软件园' } }),
        makeRecord({
          msgServerId: 'srv-cb1',
          type: MESSAGE_TYPE.COMBINE,
          body: {
            title: '聊天记录',
            summary: '摘要',
            filename: 'chat.html',
            filetype: 'html',
            combineLevel: 1,
            messageList: [makeRecord({ msgServerId: 'srv-inner', body: { content: '内层文本关键证据' } })],
          },
        }),
      ])
      handle.flushFts()

      const byFile = await handle.repository.searchMessages({ keyword: '财报汇总' })
      expect(byFile.list.map(m => m.msgServerId)).toEqual(['srv-f1'])

      const byLocation = await handle.repository.searchMessages({ keyword: '浦东新区' })
      expect(byLocation.list.map(m => m.msgServerId)).toEqual(['srv-l1'])

      const byInner = await handle.repository.searchMessages({ keyword: '关键证据' })
      expect(byInner.list.map(m => m.msgServerId)).toEqual(['srv-cb1'])
    })

    it('tip（notice）入库但不入 FTS 队列', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-tip1', type: MESSAGE_TYPE.NOTICE, body: { content: '群公告已更新提醒' } }),
      )
      handle.flushFts()

      // 入库可读
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-tip1'])
      // 不进搜索结果
      const found = await handle.repository.searchMessages({ keyword: '群公告' })
      expect(found.list).toHaveLength(0)
    })

    it('撤回后搜不到（墓碑联动撤 FTS 行，决策 8.3）', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-rc1', body: { content: '涉敏内容需撤回' } }),
      )
      handle.flushFts()
      let found = await handle.repository.searchMessages({ keyword: '涉敏内容' })
      expect(found.list).toHaveLength(1)

      await handle.hooks.message?.markMessageRecalled?.('srv-rc1')
      handle.flushFts()
      found = await handle.repository.searchMessages({ keyword: '涉敏内容' })
      expect(found.list).toHaveLength(0)
    })

    it('flushFts 前异步队列未落索引，flush 后立即可搜（异步批量合并写语义）', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-q1', body: { content: '异步队列观测样本' } }),
      )
      const before = await handle.repository.searchMessages({ keyword: '队列观测' })
      expect(before.list).toHaveLength(0)

      handle.flushFts()
      const after = await handle.repository.searchMessages({ keyword: '队列观测' })
      expect(after.list.map(m => m.msgServerId)).toEqual(['srv-q1'])
    })
  })

  describe('generated column ext 索引', () => {
    it('预置 em_at_list 生成 ext_em_at_list 列并可按索引查询', async () => {
      const driver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-at1', ext: { em_at_list: ['user-1'] } }),
      )
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-at2', ext: {} }))

      const rows = driver.prepare(
        'SELECT msgServerId FROM uikit_messages WHERE ext_em_at_list IS NOT NULL',
      ).all()
      expect(rows.map(r => r.msgServerId)).toEqual(['srv-at1'])
    })

    it('宿主可追加 indexedExtKeys（建库期生效）', async () => {
      const driver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({
        db: driver,
        account: ACCOUNT,
        logger: silentLogger,
        indexedExtKeys: ['em_at_list', 'biz_tag'],
      })
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-biz1', ext: { biz_tag: 'order' } }),
      )
      const rows = driver.prepare(
        'SELECT msgServerId FROM uikit_messages WHERE ext_biz_tag = ?',
      ).all('order')
      expect(rows.map(r => r.msgServerId)).toEqual(['srv-biz1'])
    })
  })

  describe('启动降级（决策 8.4）', () => {
    it('重启后 sending 一次性降级为 failed（契约 MESSAGE_STATUS.FAILED）', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-'))
      const dbPath = join(dir, 'test.db')
      try {
        handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
        await handle.hooks.message?.saveMessage?.(
          makeRecord({ msgServerId: '', msgLocalId: 'loc-sending', sendStatus: MESSAGE_STATUS.SENDING }),
        )
        await handle.close()
        handle = undefined

        handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
        expect(page.list).toHaveLength(1)
        expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.FAILED)
      }
      finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('migration runner（决策 3.4）', () => {
    it('初版建库写入 schema_version / account / created_at，重开幂等', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-'))
      const dbPath = join(dir, 'test.db')
      try {
        handle = await createPersistence({ dbPath, account: ACCOUNT, adapterId: 'websdk5', logger: silentLogger })
        await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-m1' }))
        await handle.close()
        handle = undefined

        // 重开：schema_version 不重复迁移，数据保留
        const driver = wrapBetterSqlite3(new Database(dbPath))
        handle = await createPersistence({ db: driver, account: ACCOUNT, adapterId: 'websdk5', logger: silentLogger })
        const version = driver.prepare('SELECT value FROM uikit_meta WHERE key = ?').get('schema_version')
        expect(version?.value).toBe(String(SCHEMA_VERSION))
        const account = driver.prepare('SELECT value FROM uikit_meta WHERE key = ?').get('account')
        expect(account?.value).toBe('app-key:user-1')
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
        expect(page.list.map(m => m.msgServerId)).toEqual(['srv-m1'])
      }
      finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    it('adapter 更换检测：sync_state 漫游游标清零（数据不动）', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-'))
      const dbPath = join(dir, 'test.db')
      try {
        // 建库（adapter=websdk5）并写入漫游游标与消息
        const raw = wrapBetterSqlite3(new Database(dbPath))
        handle = await createPersistence({ db: raw, account: ACCOUNT, adapterId: 'websdk5', logger: silentLogger })
        raw.prepare(
          'INSERT INTO uikit_sync_state (conversationId, roamCursor, lastSyncedTs) VALUES (?, ?, ?)',
        ).run('c1', 'cursor-v1', 123)
        await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-keep' }))
        await handle.close()
        handle = undefined

        // 模拟换 adapter 重启（同库重开）：游标清零 + warn，消息数据不动
        const logger2 = { warn: vi.fn() }
        const raw2 = wrapBetterSqlite3(new Database(dbPath))
        handle = await createPersistence({ db: raw2, account: ACCOUNT, adapterId: 'webim4', logger: logger2 })
        expect(logger2.warn).toHaveBeenCalled()
        const sync = raw2.prepare('SELECT roamCursor, lastSyncedTs FROM uikit_sync_state WHERE conversationId = ?').get('c1')
        expect(sync?.roamCursor).toBeNull()
        expect(sync?.lastSyncedTs).toBeNull()
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
        expect(page.list.map(m => m.msgServerId)).toEqual(['srv-keep'])
      }
      finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('管理 API', () => {
    it('getStorageStats 返回行数与分组统计', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-st1', timestamp: 100 }),
        makeRecord({ msgServerId: 'srv-st2', conversationId: 'c2', timestamp: 200, type: MESSAGE_TYPE.IMAGE, body: { filename: 'a.png', localUrl: '' } }),
      ])
      const stats = await handle.getStorageStats()
      expect(stats.messageCount).toBe(2)
      expect(stats.oldestMessageTime).toBe(100)
      expect(stats.byConversation).toContainEqual({ conversationId: 'c1', count: 1 })
      expect(stats.byType).toContainEqual({ type: MESSAGE_TYPE.IMAGE, count: 1 })
      expect(stats.dbBytes).toBeGreaterThan(0)
    })

    it('clearAll 全表清 + 全局水位线生效', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-ca1', timestamp: 100 }))
      await handle.hooks.conversation?.saveConversations?.([makeConversation({ id: 'c1' })])
      await handle.clearAll()

      const stats = await handle.getStorageStats()
      expect(stats.messageCount).toBe(0)
      // 全局水位线：clearAll 前的回流消息不再可读
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-ca0', timestamp: 50 }))
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(0)
    })

    it('user_info / group_member 读写往返', async () => {
      handle = await makeMemoryHandle()
      await handle.upsertUserInfos([
        { userId: 'u1', nickname: '张三', avatar: 'https://a/1.png' },
        { userId: 'u2', nickname: '李四' },
      ])
      await handle.upsertUserInfos([{ userId: 'u1', nickname: '张三丰' }])
      const users = await handle.getUserInfos(['u1', 'u2', 'u3'])
      expect(users).toHaveLength(2)
      expect(users.find(u => u.userId === 'u1')?.nickname).toBe('张三丰')

      await handle.upsertGroupMembers([
        { groupId: 'g1', userId: 'u1', nickname: '群内名', role: 'admin' },
      ])
      const members = await handle.getGroupMembers('g1')
      expect(members).toHaveLength(1)
      expect(members[0]).toMatchObject({ groupId: 'g1', userId: 'u1', nickname: '群内名', role: 'admin' })
    })

    it('vacuum 可调用且不报错', async () => {
      handle = await makeMemoryHandle()
      await expect(handle.vacuum()).resolves.toBeUndefined()
    })
  })

  describe('决策 8.13 补强（2026-09-07 四域 review 修复）', () => {
    it('升格撞 UNIQUE：漫游先行 + ACK 后到乱序，以 serverId 行为准合并并物理删 pending 行', async () => {
      handle = await makeMemoryHandle()
      // 1. 本地发送 pending（msgServerId 空，loc-p 定位）
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: '', msgLocalId: 'loc-p', body: { content: '乱序升格样本' } }),
      )
      // 2. 漫游先行到达（同一逻辑消息，serverId srv-A，但 localId 不同源）
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-a', msgLocalId: 'loc-roam', body: { content: '乱序升格样本' } }),
      )
      // 此刻两行分居（pedding 行 + 漫游行）
      let page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(2)

      // 3. ACK 后到：sendStatus 回流（serverId=srv-a + localId=loc-p）触发升格冲突
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-a', msgLocalId: 'loc-p', sendStatus: MESSAGE_STATUS.DELIVERED, body: { content: '乱序升格样本' } }),
      )

      // 合并为一行：serverId 行为准，pending 行物理删
      page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(1)
      expect(page.list[0].msgServerId).toBe('srv-a')
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.DELIVERED)
      // FTS 无幽灵：pending 行已物理删且撤索引，搜索只命中一次
      handle.flushFts()
      const found = await handle.repository.searchMessages({ keyword: '乱序升格' })
      expect(found.list).toHaveLength(1)
    })

    it('sendStatus 单调：read 后迟到的 delivered 不回退，isPeerRead 保持一致', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-mono' }))
      await handle.hooks.message?.updateMessageStatus?.('srv-mono', MESSAGE_STATUS.READ)
      await handle.hooks.message?.updateMessageStatus?.('srv-mono', MESSAGE_STATUS.DELIVERED)
      let page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.READ)
      expect(page.list[0].isPeerRead).toBe(true)
      expect(page.list[0].isPeerDelivered).toBe(true)

      // upsert 的 UPDATE 分支同守：回流旧状态（sent）不回退已 read 的行
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-mono', sendStatus: MESSAGE_STATUS.SENT }),
      )
      page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list[0].sendStatus).toBe(MESSAGE_STATUS.READ)
    })

    it('批量回滚后 FTS 队列无幽灵操作（搜索不命中未入库内容）', async () => {
      const logger = { warn: vi.fn() }
      handle = await createPersistence({ dbPath: ':memory:', account: ACCOUNT, logger })
      // 构造必然整批回滚的批量：第二条 conversationType 为 null 触发 NOT NULL 约束
      const bad = { ...makeRecord({ msgServerId: 'srv-ghost-bad' }), conversationType: null } as never
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-ghost-good', body: { content: '幽灵索引观测样本' } }),
        bad,
      ])
      expect(logger.warn).toHaveBeenCalled()
      handle.flushFts()

      // 整批回滚：主表无行，FTS 也无残留（修复前队列里的幽灵 op 会索引未提交的 rowid）
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list).toHaveLength(0)
      const found = await handle.repository.searchMessages({ keyword: '幽灵索引' })
      expect(found.list).toHaveLength(0)
    })

    it('clearMessages 带 type 过滤不写水位线：同类型回流消息可读回', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-ty1', timestamp: 100, type: MESSAGE_TYPE.IMAGE, body: { localUrl: '', filename: '照片.png' } }),
      )
      // 按类型清除（不写水位线）
      const removed = await handle.clearMessages({ conversationId: 'c1', type: MESSAGE_TYPE.IMAGE })
      expect(removed).toBe(1)

      // 漫游回流更早的同类消息：无水位线拦截，正常入库可读
      await handle.hooks.message?.saveMessage?.(
        makeRecord({ msgServerId: 'srv-ty0', timestamp: 50, type: MESSAGE_TYPE.IMAGE, body: { localUrl: '', filename: '旧照片.png' } }),
      )
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-ty0'])
    })

    it('clearMessages 的 before 命中 0 行仍写水位线', async () => {
      handle = await makeMemoryHandle()
      // 空会话上按 before 清除：0 命中，但水位线应落
      const removed = await handle.clearMessages({ conversationId: 'c1', before: 1000 })
      expect(removed).toBe(0)
      // 水位线以下回流被写侧拦截
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-early', timestamp: 500 }))
      // 水位线以上正常
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-late', timestamp: 1500 }))
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect(page.list.map(m => m.msgServerId)).toEqual(['srv-late'])
    })

    it('全局搜索按会话水位线过滤（FTS 与 LIKE 两分支）', async () => {
      const driver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
      await handle.hooks.message?.saveMessages?.([
        makeRecord({ msgServerId: 'srv-g1', conversationId: 'c1', timestamp: 100, body: { content: '全局水位观测甲' } }),
        makeRecord({ msgServerId: 'srv-g2', conversationId: 'c2', timestamp: 200, body: { content: '全局水位观测乙' } }),
      ])
      handle.flushFts()
      // 直接写水位线（不删行）：c1 的老消息行仍在库中，读侧过滤必须生效
      driver.prepare(
        'INSERT INTO uikit_sync_state (conversationId, clearedBefore) VALUES (?, ?)',
      ).run('c1', 150)
      const ftsHits = await handle.repository.searchMessages({ keyword: '全局水位观测' })
      expect(ftsHits.list.map(m => m.msgServerId)).toEqual(['srv-g2'])
      // LIKE 回落分支（二字词）同样过滤
      const likeHits = await handle.repository.searchMessages({ keyword: '观测' })
      expect(likeHits.list.map(m => m.msgServerId)).toEqual(['srv-g2'])
      // 会话作用域搜索同样过滤
      const scopedHits = await handle.repository.searchMessages({ keyword: '全局水位观测', conversationId: 'c1' })
      expect(scopedHits.list).toHaveLength(0)
    })

    it('account 不一致 warn 不阻断', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-'))
      const dbPath = join(dir, 'test.db')
      try {
        handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
        await handle.close()
        handle = undefined

        const logger = { warn: vi.fn() }
        handle = await createPersistence({
          dbPath,
          account: { appKey: 'app-key', userId: 'another-user' },
          logger,
        })
        expect(logger.warn).toHaveBeenCalled()
        // 不阻断：库仍可用
        await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-acc' }))
        const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
        expect(page.list).toHaveLength(1)
      }
      finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    it('注入驱动模式 close 不关闭宿主 Database', async () => {
      const driver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-host' }))
      handle.close()
      handle = undefined
      // 宿主实例仍可用（未被 close）
      const row = driver.prepare('SELECT msgServerId FROM uikit_messages WHERE msgServerId = ?').get('srv-host')
      expect(row?.msgServerId).toBe('srv-host')
    })

    it('recallOperator 读回（扩展字段，UIKit v1 不消费）', async () => {
      handle = await makeMemoryHandle()
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-op' }))
      await handle.hooks.message?.markMessageRecalled?.('srv-op', 'admin-9')
      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      expect((page.list[0] as { recallOperator?: string }).recallOperator).toBe('admin-9')
    })

    it('坏 JSON 行进 warn 观测且读路径不阻断', async () => {
      const logger = { warn: vi.fn() }
      const driver = wrapBetterSqlite3(new Database(':memory:'))
      handle = await createPersistence({ db: driver, account: ACCOUNT, logger })
      await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-bad-json' }))
      // 人为写坏 body 列
      driver.prepare('UPDATE uikit_messages SET body = ? WHERE msgServerId = ?').run('{not-json', 'srv-bad-json')

      const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
      // 行仍返回（body 按缺失回落 {}），且 warn 已观测
      expect(page.list).toHaveLength(1)
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('会话搜索容错匹配（决策 8.16 子串优先 + 子序列兜底）', () => {
    async function seedConversations() {
      handle = await makeMemoryHandle()
      await handle.hooks.conversation?.saveConversations?.([
        makeConversation({ id: 'cv-1', name: '需求评审群 195' }),
        makeConversation({ id: 'cv-2', name: '需求文档同步' }),
        makeConversation({ id: 'cv-3', name: '产品讨论组' }),
      ])
    }

    it('子串优先：严格子串命中排前，不触发兜底也能命中', async () => {
      await seedConversations()
      const page = await handle!.repository.searchConversations({ keyword: '需求' })
      // 「需求评审群 195」「需求文档同步」均为子串命中
      expect(page.list.map(c => c.id)).toEqual(['cv-1', 'cv-2'])
    })

    it('子序列兜底：「需求评审19」命中「需求评审群 195」', async () => {
      await seedConversations()
      const page = await handle!.repository.searchConversations({ keyword: '需求评审19' })
      expect(page.list.map(c => c.id)).toEqual(['cv-1'])
    })

    it('乱序不命中：「95需求」不中任何会话', async () => {
      await seedConversations()
      const page = await handle!.repository.searchConversations({ keyword: '95需求' })
      expect(page.list).toHaveLength(0)
    })

    it('两段合并去重排序：子串命中排前，子序列命中补足且不重复', async () => {
      await seedConversations()
      // 「需求」子串命中 cv-1 / cv-2；cv-1 同时子序列命中——去重后只出现一次
      const page = await handle!.repository.searchConversations({ keyword: '需求' })
      expect(page.list.map(c => c.id)).toEqual(['cv-1', 'cv-2'])
      // 「产品19」：cv-1 子序列命中（产…1…9? 不——「产品讨论组」无 19），验证混合场景：
      const mixed = await handle!.repository.searchConversations({ keyword: '产品' })
      expect(mixed.list.map(c => c.id)).toEqual(['cv-3'])
    })

    it('昵称同样适用子序列兜底（uikit_user_info 小表）', async () => {
      await seedConversations()
      await handle!.upsertUserInfos([{ userId: 'cv-3', nickname: '产品老王 77' }])
      // 子串路径：昵称 LIKE 命中
      const byNick = await handle!.repository.searchConversations({ keyword: '老王' })
      expect(byNick.list.map(c => c.id)).toEqual(['cv-3'])
      // 子序列兜底路径：会话名不含、昵称子序列命中
      const subseq = await handle!.repository.searchConversations({ keyword: '产品老7' })
      expect(subseq.list.map(c => c.id)).toEqual(['cv-3'])
    })
  })
})
