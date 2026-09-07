/**
 * 层 2：故障注入（健壮性纪律的机器验证）。
 *
 * 1. 随机抛错驱动：包装 better-sqlite3 内存驱动，prepare/run/get/all 按概率
 *    随机抛错（建库完成后才武装）。跑 200+ 步随机 hooks / 管理操作，断言：
 *    hooks 调用永不 throw / reject（fire-and-forget 纪律）、无 unhandled
 *    rejection、错误都经 logger.warn 出来。`backup()` 是显式例外
 *    （warn 后原样上抛），单独断言「失败会 reject 且已 warn」。
 * 2. 损坏 fuzz：循环 50 次——临时库文件写入数据后随机损坏（比特翻转 /
 *    截断 / 头部覆写垃圾），再 createPersistence({ dbPath })，断言结局二值化：
 *    正常打开可读，或自愈重建（.corrupt-* 备份存在 + 新库可用）；
 *    不存在「抛未处理异常 / 静默用坏库」的第三结局。
 */

import { Buffer } from 'node:buffer'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { MESSAGE_STATUS } from '@easemob/uikit-sdk-contract'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SqliteDriver, SqliteStatement } from '../driver/driver'
import { wrapBetterSqlite3 } from '../driver/driver'
import type { UikitPersistenceHandle } from '../index'
import { createPersistence } from '../index'
import { makeRecord } from './helpers'

const ACCOUNT = { appKey: 'app-key', userId: 'user-1' }

/** 可复现伪随机数（xorshift32） */
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0xFFFFFFFF
  }
}

/** 随机抛错驱动包装：armed 后每个 statement 方法按 errorRate 概率抛错 */
function wrapFlaky(driver: SqliteDriver, errorRate: number, rng: () => number): { driver: SqliteDriver, arm: () => void } {
  let armed = false
  const maybeThrow = (): void => {
    if (armed && rng() < errorRate)
      throw new Error('flaky-driver: injected failure')
  }
  return {
    driver: {
      prepare(sql: string): SqliteStatement {
        const stmt = driver.prepare(sql)
        return {
          run: (...params) => {
            maybeThrow()
            return stmt.run(...params)
          },
          get: (...params) => {
            maybeThrow()
            return stmt.get(...params)
          },
          all: (...params) => {
            maybeThrow()
            return stmt.all(...params)
          },
        }
      },
      exec: (sql) => {
        maybeThrow()
        driver.exec(sql)
      },
      transaction: fn => driver.transaction(fn),
      close: () => driver.close(),
    },
    arm: () => {
      armed = true
    },
  }
}

describe('层 2：故障注入', () => {
  let handle: UikitPersistenceHandle | undefined

  afterEach(async () => {
    await handle?.close()
    handle = undefined
  })

  it('随机抛错驱动：hooks 永不 throw/reject，错误经 logger.warn 出来，无 unhandled rejection', async () => {
    const rng = makeRng(20260907)
    const logger = { warn: vi.fn() }
    const inner = wrapBetterSqlite3(new Database(':memory:'))
    const flaky = wrapFlaky(inner, 0.1, rng)
    // 建库完成后再武装（启动路径不在本用例注入范围）
    handle = await createPersistence({ db: flaky.driver, account: ACCOUNT, logger })
    flaky.arm()

    // 捕获进程级 unhandled rejection（hooks 链不允许有）
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)

    try {
      for (let i = 0; i < 240; i++) {
        const msgId = rng() < 0.5 ? `srv-f${i % 30}` : `loc-f${i % 30}`
        switch (Math.floor(rng() * 6)) {
          case 0:
            // fire-and-forget 纪律：同步调用不 throw
            handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: `srv-f${i % 30}`, msgLocalId: `loc-f${i % 30}` }))
            break
          case 1:
            handle.hooks.message?.saveMessages?.([makeRecord({ msgServerId: `srv-f${i % 30}`, msgLocalId: `loc-f${i % 30}` })])
            break
          case 2:
            handle.hooks.message?.updateMessageStatus?.(msgId, MESSAGE_STATUS.READ)
            break
          case 3:
            handle.hooks.message?.markMessageRecalled?.(msgId, 'admin')
            break
          case 4:
            handle.hooks.message?.deleteMessages?.([msgId])
            break
          case 5:
            await handle.getStorageStats().catch(() => 'swallowed-by-test')
            break
        }
      }
      // flushFts / vacuum / clearAll 等管理口也过一遍
      handle.flushFts()
      await handle.vacuum()
      await handle.clearAll()
    }
    finally {
      process.removeListener('unhandledRejection', onUnhandled)
    }

    // 异步队列尾部落定后统一断言
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(unhandled).toEqual([])
    expect(logger.warn.mock.calls.length).toBeGreaterThan(0)
  })

  it('backup() 是显式例外：驱动抛错时 warn 且 reject（调用方必须感知）', async () => {
    const rng = makeRng(42)
    const logger = { warn: vi.fn() }
    const inner = wrapBetterSqlite3(new Database(':memory:'))
    // 100% 抛错：确定性验证 backup 的 warn + rethrow
    const flaky = wrapFlaky(inner, 1, rng)
    handle = await createPersistence({ db: flaky.driver, account: ACCOUNT, logger })
    flaky.arm()

    const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-fault-'))
    try {
      await expect(handle.backup(join(dir, 'b.db'))).rejects.toThrow('flaky-driver')
      expect(logger.warn).toHaveBeenCalled()
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('损坏 fuzz：50 次随机损坏后打开结局二值化（正常可读 或 自愈重建）', { timeout: 120000 }, async () => {
    const rng = makeRng(20260907)
    const dir = mkdtempSync(join(tmpdir(), 'uikit-persist-fuzz-'))
    let healed = 0
    let intact = 0
    try {
      for (let round = 0; round < 50; round++) {
        const dbPath = join(dir, `fuzz-${round}.db`)
        // 1. 造一个含数据的库
        const seed = await createPersistence({ dbPath, account: ACCOUNT, logger: { warn: () => {} } })
        await seed.hooks.message?.saveMessages?.(
          Array.from({ length: 20 }, (_, i) => makeRecord({ msgServerId: `srv-fz-${round}-${i}` })),
        )
        seed.flushFts()
        seed.close()

        // 2. 随机损坏：比特翻转 / 截断 / 头部覆写垃圾
        const buf = readFileSync(dbPath)
        const mode = Math.floor(rng() * 3)
        if (mode === 0) {
          // 比特翻转 N 处（避开前 100 字节页头，提高「仍可打开」分支覆盖）
          const flips = 1 + Math.floor(rng() * 32)
          for (let k = 0; k < flips; k++) {
            const pos = 100 + Math.floor(rng() * (buf.length - 100))
            buf[pos] = buf[pos] ^ (1 << Math.floor(rng() * 8))
          }
          writeFileSync(dbPath, buf)
        }
        else if (mode === 1) {
          writeFileSync(dbPath, buf.subarray(0, Math.floor(rng() * buf.length)))
        }
        else {
          const garbage = Buffer.from('garbage-header-'.repeat(8))
          garbage.copy(buf, 0, 0, Math.min(garbage.length, buf.length))
          writeFileSync(dbPath, buf)
        }

        // 3. 重新打开：结局必须二值化——正常可读 或 自愈重建；不允许抛出
        const logger = { warn: vi.fn() }
        const reopened = await createPersistence({ dbPath, account: ACCOUNT, logger })
        const stats = await reopened.getStorageStats()
        expect(stats.messageCount).toBeGreaterThanOrEqual(0)
        // 读写均可用
        await reopened.hooks.message?.saveMessage?.(makeRecord({ msgServerId: `srv-fz-${round}-after` }))
        reopened.close()

        const corruptBackups = readdirSync(dir).filter(n => n.startsWith(`fuzz-${round}.db.corrupt-`))
        if (corruptBackups.length > 0) {
          healed += 1
          expect(logger.warn).toHaveBeenCalled()
        }
        else {
          intact += 1
        }
      }
      // 两类结局都被覆盖（统计性断言：损坏矩阵设计保证两分支都必然出现）
      expect(healed).toBeGreaterThan(0)
      console.warn(`[fault-injection] 损坏 fuzz 50 次：自愈重建 ${healed} 次，完整幸存 ${intact} 次`)
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
