/**
 * 层 1：属性测试（fast-check 随机操作序列 + 不变量穷举）。
 *
 * 随机操作流（saveMessage / saveMessages / saveConversations / markMessageRecalled /
 * updateMessageContent / deleteMessages / clearMessages / updateMessageStatus /
 * 漫游回流（同 serverId 重复 save）/ 乱序升格（pending 与 serverId 行交错））
 * 作用于 `:memory:` 实例，跑完断言四类不变量：
 * 1. 搜索纯净：FTS（≥3 字符）与 LIKE（<3 字符）两路径结果永不包含墓碑行与
 *    水位线以下消息，且命中集 = DB 直读期望可搜索集；
 * 2. 翻页完备：loadMessages 翻到 hasMore=false = 期望可见集，不重不漏；
 * 3. 单行性：同一 msgServerId 在库中至多一行；
 * 4. 水位线恒成立：无 type 的 clearMessages 之后水位以下不可读不可搜；
 *    带 type 的清除不写水位线（sync_state 不产生 / 不推进该行）。
 *
 * 种子固定可复现（seed: 20260907）；撞出反例时用 fast-check 输出的 counterexample
 * replay（seed + path）定位，不要静默放宽断言。
 */

import * as fc from 'fast-check'
import Database from 'better-sqlite3'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-sdk-contract'
import type { MessageRecord } from '@easemob/uikit-sdk-contract'
import { describe, expect, it } from 'vitest'
import { wrapBetterSqlite3 } from '../driver/driver'
import { createPersistence } from '../index'
import { makeConversation } from './helpers'
import {
  collectAllViaPaging,
  collectSearchViaPaging,
  expectedSearchableIds,
  expectedVisibleIds,
  findDuplicateServerIds,
} from './invariant-helpers'

const ACCOUNT = { appKey: 'app-key', userId: 'user-1' }
const silentLogger = { warn: () => {} }

/** 会话池（3 个，触发同会话交错） */
const CONV_IDS = ['c1', 'c2', 'c3'] as const

/** 中文/英文内容样本（属性流只造 text 消息：期望集的 body 子串判定与 FTS 抽取对齐） */
const CONTENT_SAMPLES = [
  '明天下午开会讨论方案',
  '需求文档已经更新完毕',
  '周五前完成设计评审',
  '服务端漫游接口联调',
  '本地搜索性能验收',
  '附件离线下载验收',
  'hello world message',
  '数据库迁移脚本评审',
]

/** 搜索关键词池：二字（LIKE 回落）与 ≥3（FTS）混合 */
const KEYWORDS = ['下午', '需求', '明天下午', '性能验收', 'hello', '文档']

/** localId / serverId 小池：高碰撞率触发 upsert / 升格 / 漫游重复回流 */
const arbLocalId = fc.integer({ min: 0, max: 24 }).map(i => `loc-${i}`)
const arbServerId = fc.oneof(
  fc.constant(''),
  fc.integer({ min: 0, max: 14 }).map(i => `srv-${i}`),
)
const arbConvId = fc.constantFrom(...CONV_IDS)
const arbContent = fc.constantFrom(...CONTENT_SAMPLES)
const arbTs = fc.integer({ min: 0, max: 100000 })
const arbStatus = fc.constantFrom(
  MESSAGE_STATUS.SENDING,
  MESSAGE_STATUS.SENT,
  MESSAGE_STATUS.DELIVERED,
  MESSAGE_STATUS.READ,
  MESSAGE_STATUS.FAILED,
)

/** 单条 save 参数 */
const arbSave = fc.record({
  tag: fc.constant('save' as const),
  conversationId: arbConvId,
  msgLocalId: arbLocalId,
  msgServerId: arbServerId,
  content: arbContent,
  timestamp: arbTs,
  sendStatus: arbStatus,
})

/** 引用既有消息的操作：index 在执行时按当时已发出 id 数取模（空则跳过） */
const arbExistingRef = fc.integer({ min: 0, max: 9999 })

const arbOp = fc.oneof(
  arbSave,
  // 批量回流（漫游场景）
  fc.record({
    tag: fc.constant('saveBatch' as const),
    items: fc.array(arbSave, { minLength: 1, maxLength: 4 }),
  }),
  fc.record({ tag: fc.constant('recall' as const), ref: arbExistingRef }),
  fc.record({ tag: fc.constant('edit' as const), ref: arbExistingRef, content: arbContent }),
  fc.record({ tag: fc.constant('delete' as const), ref: arbExistingRef }),
  fc.record({ tag: fc.constant('status' as const), ref: arbExistingRef, status: arbStatus }),
  // 清除：随机带 / 不带 type、before、conversationId（水位线语义穷举）
  fc.record({
    tag: fc.constant('clear' as const),
    before: fc.option(arbTs, { nil: undefined }),
    withType: fc.boolean(),
    conversationId: fc.option(arbConvId, { nil: undefined }),
  }),
  // 会话快照落库（与消息流交错）
  fc.record({ tag: fc.constant('saveConvs' as const) }),
)

type Op = typeof arbOp extends fc.Arbitrary<infer T> ? T : never

/** 执行一条操作（hooks 全部 fire-and-forget；clearMessages 是管理 API 需 await） */
async function applyOp(
  handle: Awaited<ReturnType<typeof createPersistence>>,
  op: Op,
  emittedIds: string[],
): Promise<void> {
  const message = handle.hooks.message!
  const conversation = handle.hooks.conversation!
  switch (op.tag) {
    case 'save': {
      const record: MessageRecord = {
        msgServerId: op.msgServerId,
        msgLocalId: op.msgLocalId,
        from: 'peer',
        to: 'me',
        sender: { userId: 'peer' },
        conversationId: op.conversationId,
        conversationType: 'singleChat',
        type: MESSAGE_TYPE.TEXT,
        sendStatus: op.sendStatus,
        ext: {},
        timestamp: op.timestamp,
        body: { content: op.content },
      }
      await message.saveMessage?.(record)
      emittedIds.push(op.msgLocalId)
      if (op.msgServerId)
        emittedIds.push(op.msgServerId)
      break
    }
    case 'saveBatch': {
      const records = op.items.map(item => ({
        msgServerId: item.msgServerId,
        msgLocalId: item.msgLocalId,
        from: 'peer',
        to: 'me',
        sender: { userId: 'peer' },
        conversationId: item.conversationId,
        conversationType: 'singleChat' as const,
        type: MESSAGE_TYPE.TEXT,
        sendStatus: item.sendStatus,
        ext: {},
        timestamp: item.timestamp,
        body: { content: item.content },
      }))
      await message.saveMessages?.(records)
      for (const item of op.items) {
        emittedIds.push(item.msgLocalId)
        if (item.msgServerId)
          emittedIds.push(item.msgServerId)
      }
      break
    }
    case 'recall': {
      if (emittedIds.length === 0)
        return
      await message.markMessageRecalled?.(emittedIds[op.ref % emittedIds.length], 'admin')
      break
    }
    case 'edit': {
      if (emittedIds.length === 0)
        return
      await message.updateMessageContent?.(emittedIds[op.ref % emittedIds.length], { content: op.content }, {})
      break
    }
    case 'delete': {
      if (emittedIds.length === 0)
        return
      await message.deleteMessages?.([emittedIds[op.ref % emittedIds.length]])
      break
    }
    case 'status': {
      if (emittedIds.length === 0)
        return
      await message.updateMessageStatus?.(emittedIds[op.ref % emittedIds.length], op.status)
      break
    }
    case 'clear': {
      await handle.clearMessages({
        before: op.before,
        type: op.withType ? MESSAGE_TYPE.TEXT : undefined,
        conversationId: op.conversationId,
      })
      break
    }
    case 'saveConvs': {
      await conversation.saveConversations?.(
        CONV_IDS.map((id, i) => makeConversation({ id, name: `会话${id}`, lastMessageTime: 1000 + i })),
      )
      break
    }
  }
}

describe('层 1：属性测试（fast-check 随机操作流 + 不变量）', () => {
  it('随机操作序列后四类不变量恒成立（seed 固定可复现）', { timeout: 120000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbOp, { minLength: 20, maxLength: 50 }), async (ops) => {
        // 注入驱动模式创建：DB 直读对照需要拿到驱动句柄
        const driver = wrapBetterSqlite3(new Database(':memory:'))
        const handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
        const emittedIds: string[] = []
        /** 执行期水位线快照（带 type 清除不写水位线的断言用） */
        try {
          for (const op of ops)
            await applyOp(handle, op, emittedIds)
          handle.flushFts()

          /* ===== 不变量 3：单行性 ===== */
          expect(findDuplicateServerIds(driver)).toEqual([])

          for (const cvsId of CONV_IDS) {
            /* ===== 不变量 2：翻页完备（期望可见集 = DB 直读，不重不漏） ===== */
            const expected = expectedVisibleIds(driver, cvsId)
            const paged = await collectAllViaPaging(handle.repository, cvsId, 'singleChat')
            const pagedIds = paged.map(m => m.msgLocalId)
            expect(new Set(pagedIds).size).toBe(pagedIds.length)
            expect(new Set(pagedIds)).toEqual(expected)

            /* ===== 不变量 1：搜索纯净（FTS ≥3 与 LIKE <3 两路径） ===== */
            for (const keyword of KEYWORDS) {
              const hits = await collectSearchViaPaging(handle.repository, keyword, cvsId)
              // 命中永不含墓碑行（recalled/deleted）
              for (const hit of hits) {
                expect((hit as MessageRecord).recalled).toBeFalsy()
                expect((hit as MessageRecord).deleted).toBeFalsy()
              }
              // 命中集 = DB 直读期望可搜索集（含水位线过滤，不变量 4 的读侧）
              expect(new Set(hits.map(m => m.msgLocalId))).toEqual(expectedSearchableIds(driver, keyword, cvsId))
            }
          }

          /* ===== 不变量 1 全局形态（不缩圈） ===== */
          for (const keyword of KEYWORDS) {
            const hits = await collectSearchViaPaging(handle.repository, keyword)
            expect(new Set(hits.map(m => m.msgLocalId))).toEqual(expectedSearchableIds(driver, keyword))
          }
        }
        finally {
          handle.close()
        }
      }),
      { numRuns: 50, seed: 20260907 },
    )
  })

  it('带 type 的 clearMessages 不写水位线（sync_state 不推进）', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbOp, { minLength: 10, maxLength: 30 }),
        arbConvId,
        arbTs,
        async (ops, cvsId, before) => {
          const driver = wrapBetterSqlite3(new Database(':memory:'))
          const handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
          const emittedIds: string[] = []
          try {
            for (const op of ops)
              await applyOp(handle, op, emittedIds)

            // 记录当前水位线 → 执行带 type 的清除 → 断言水位线不变
            const beforeRow = driver.prepare(
              'SELECT clearedBefore FROM uikit_sync_state WHERE conversationId = ?',
            ).get(cvsId)
            await handle.clearMessages({ conversationId: cvsId, type: MESSAGE_TYPE.TEXT, before })
            const afterRow = driver.prepare(
              'SELECT clearedBefore FROM uikit_sync_state WHERE conversationId = ?',
            ).get(cvsId)
            expect(afterRow?.clearedBefore ?? null).toBe(beforeRow?.clearedBefore ?? null)
          }
          finally {
            handle.close()
          }
        },
      ),
      { numRuns: 30, seed: 20260907 },
    )
  })
})
