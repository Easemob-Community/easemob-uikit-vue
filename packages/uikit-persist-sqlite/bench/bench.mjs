/**
 * 层 3：性能基准门禁（bench）。
 *
 * 数据规模：10 万条消息（100 个会话，其中 1 个热点会话 6000 条用于深翻页）
 * + 1 万会话。门禁阈值（超标非零退出）：
 * 1. 全局三字中文搜索（FTS trigram）P95 < 500ms（规格书验收口径，跑 50 次取 P95）；
 * 2. 二字 LIKE 回落搜索 P95 < 1000ms（回落路径放宽值——全表扫 body JSON，
 *    不走索引；决策 3.6 的二字中文验收语义靠它兜底）；
 * 3. 单会话深翻页（100 页）平均每页 < 50ms；
 * 4. 会话列表首页 + 连续 20 页续页平均每页 < 50ms；
 * 5. 灌入吞吐与库文件大小仅打印参考（不做阈值断言）。
 *
 * 跑法：pnpm -F @easemob/uikit-persist-sqlite bench（先 build 再跑 dist 产物）。
 */
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
// 基准门禁刻意跑构建产物（dist）而非源码：测的是发布形态的真实性能
// eslint-disable-next-line antfu/no-import-dist
import { createPersistence } from '../dist/easemob-uikit-persist-sqlite.js'

const MESSAGE_TOTAL = 100_000
const CONVERSATION_TOTAL = 10_000
const HOT_CONVERSATION = 'c-hot'
const HOT_COUNT = 6_000
const SEARCH_RUNS = 50

/** 中文样本（与 L2/属性测试同源风格） */
const SAMPLES = [
  '明天下午开会讨论方案',
  '这个项目的需求文档已经更新',
  '周五之前把设计稿评审完',
  '服务端的漫游接口需要联调',
  '本地搜索的性能验收标准是五百毫秒',
  '群公告记得同步给新成员',
  '数据库迁移脚本今天跑一遍',
  '客户反馈的问题已记录到工单',
  '下周的版本计划排一下优先级',
  '附件离线下载功能开始验收',
]

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]
}

function makeRecord(conversationId, seq, base) {
  return {
    msgServerId: `bench-${conversationId}-${seq}`,
    msgLocalId: `bench-local-${conversationId}-${seq}`,
    from: 'bench-bot',
    to: 'bench-user',
    sender: { userId: 'bench-bot' },
    conversationId,
    conversationType: 'singleChat',
    type: 'text',
    sendStatus: 'sent',
    ext: {},
    timestamp: base + seq * 1000,
    body: { content: `${SAMPLES[seq % SAMPLES.length]}（第 ${seq} 条）` },
  }
}

const results = []
let failed = false
function gate(name, value, threshold, unit = 'ms') {
  const ok = value < threshold
  if (!ok)
    failed = true
  results.push({ name, value: `${value.toFixed(1)}${unit}`, threshold: `< ${threshold}${unit}`, ok })
  console.warn(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${value.toFixed(1)}${unit}（阈值 < ${threshold}${unit}）`)
}

const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-bench-'))
const dbPath = join(dir, 'bench.db')
try {
  const handle = await createPersistence({
    dbPath,
    account: { appKey: 'bench-app', userId: 'bench-user' },
    logger: { warn: () => {} },
  })

  /* ===== 灌数据 ===== */
  let seedStart = Date.now()
  const convBatch = []
  for (let i = 0; i < CONVERSATION_TOTAL; i++) {
    convBatch.push({
      id: `c-${i}`,
      name: `${SAMPLES[i % SAMPLES.length]}群 ${i}`,
      type: i % 3 === 0 ? 'groupChat' : 'singleChat',
      unreadCount: 0,
      lastMessageText: SAMPLES[i % SAMPLES.length],
      lastMessageTime: seedStart - i * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    })
    if (convBatch.length === 200) {
      await handle.hooks.conversation.saveConversations(convBatch.splice(0))
    }
  }
  if (convBatch.length > 0)
    await handle.hooks.conversation.saveConversations(convBatch.splice(0))
  const convElapsed = Date.now() - seedStart

  seedStart = Date.now()
  const normalCount = MESSAGE_TOTAL - HOT_COUNT
  const normalConvs = 99
  const perConv = Math.floor(normalCount / normalConvs)
  let batch = []
  let written = 0
  const base = 1700000000000
  const pushBatch = async () => {
    if (batch.length === 0)
      return
    await handle.hooks.message.saveMessages(batch)
    batch = []
  }
  for (let c = 0; c < normalConvs; c++) {
    for (let i = 0; i < perConv; i++) {
      batch.push(makeRecord(`c-${c}`, i, base))
      if (batch.length === 500)
        await pushBatch()
    }
  }
  for (let i = 0; i < HOT_COUNT; i++) {
    batch.push(makeRecord(HOT_CONVERSATION, i, base))
    if (batch.length === 500)
      await pushBatch()
  }
  await pushBatch()
  written = normalConvs * perConv + HOT_COUNT
  handle.flushFts()
  const msgElapsed = Date.now() - seedStart

  console.warn(`—— 数据规模：消息 ${written} 条 / 会话 ${CONVERSATION_TOTAL} 个 ——`)
  console.warn(`参考（无阈值）：会话灌入 ${(CONVERSATION_TOTAL / (convElapsed / 1000)).toFixed(0)} 条/s；`
    + `消息灌入 ${(written / (msgElapsed / 1000)).toFixed(0)} 条/s；`
    + `库文件 ${(statSync(dbPath).size / 1024 / 1024).toFixed(1)}MB`)

  /* ===== 1. 全局三字中文搜索（FTS）P95 < 500ms ===== */
  let samples = []
  for (let i = 0; i < SEARCH_RUNS; i++) {
    const start = performance.now()
    await handle.repository.searchMessages({ keyword: '性能验收' })
    samples.push(performance.now() - start)
  }
  gate('全局三字中文搜索 P95', percentile(samples, 0.95), 500)

  /* ===== 2. 二字 LIKE 回落搜索 P95 < 1000ms ===== */
  samples = []
  for (let i = 0; i < SEARCH_RUNS; i++) {
    const start = performance.now()
    await handle.repository.searchMessages({ keyword: '下午' })
    samples.push(performance.now() - start)
  }
  gate('二字 LIKE 回落搜索 P95', percentile(samples, 0.95), 1000)

  /* ===== 3. 单会话深翻页（100 页）平均每页 < 50ms ===== */
  samples = []
  let cursor
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    const page = await handle.repository.loadMessages(HOT_CONVERSATION, 'singleChat', cursor, 30)
    samples.push(performance.now() - start)
    cursor = page.cursor
  }
  gate('单会话深翻页均值（100 页）', samples.reduce((a, b) => a + b, 0) / samples.length, 50)

  /* ===== 4. 会话列表首页 + 20 页续页平均每页 < 50ms ===== */
  samples = []
  cursor = undefined
  for (let i = 0; i < 21; i++) {
    const start = performance.now()
    const page = await handle.repository.fetchConversations(cursor, 50)
    samples.push(performance.now() - start)
    cursor = page.hasMore ? page.cursor : undefined
  }
  gate('会话列表翻页均值（首页 + 20 续页）', samples.reduce((a, b) => a + b, 0) / samples.length, 50)

  handle.close()
}
finally {
  rmSync(dir, { recursive: true, force: true })
}

console.warn(`—— bench 结果：${results.filter(r => r.ok).length}/${results.length} 项达标 ——`)
process.exit(failed ? 1 : 0)
