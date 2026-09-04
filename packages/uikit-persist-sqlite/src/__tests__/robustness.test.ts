/**
 * 健壮性补强测试（2026-09-04 五项：自检重建 / busy_timeout / synchronous=NORMAL /
 * backup API / 运维口径）。
 *
 * - 开库自检 + 自动重建：人为制造损坏库文件（写入垃圾字节）→ 重新
 *   createPersistence → 新库可用 + `.corrupt-<时间戳>` 备份文件存在；
 * - 注入驱动模式：拿不到文件语义，损坏只 warn 不重建；
 * - busy_timeout 可经 options 覆盖；
 * - backup（VACUUM INTO）：`:memory:` 与文件库产物均可打开且数据一致。
 */

import { Buffer } from 'node:buffer'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { CONVERSATION_TYPE } from '@easemob/uikit-sdk-contract'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { wrapBetterSqlite3 } from '../driver/driver'
import type { UikitPersistenceHandle } from '../index'
import { createPersistence } from '../index'
import { makeRecord } from './helpers'

const ACCOUNT = { appKey: 'app-key', userId: 'user-1' }

const silentLogger = { warn: () => {} }

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'uikit-persist-robust-'))
}

describe('健壮性补强', () => {
  let handle: UikitPersistenceHandle | undefined
  const tmpDirs: string[] = []

  afterEach(async () => {
    await handle?.close()
    handle = undefined
    for (const dir of tmpDirs.splice(0))
      rmSync(dir, { recursive: true, force: true })
  })

  it('开库自检：损坏库文件自动改名备份（.corrupt-<时间戳>）并重建可用新库', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const dbPath = join(dir, 'broken.db')

    // 先建一个正常库写入数据，关闭后人为破坏（覆盖为垃圾字节）
    handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
    await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-before-corrupt' }))
    await handle.close()
    handle = undefined
    writeFileSync(dbPath, Buffer.from('not-a-sqlite-database-garbage-bytes'.repeat(16)))

    const logger = { warn: vi.fn() }
    handle = await createPersistence({ dbPath, account: ACCOUNT, logger })

    // 自愈事件经 logger 上报
    expect(logger.warn).toHaveBeenCalled()
    // corrupt 备份文件存在
    const backups = readdirSync(dir).filter(name => name.startsWith('broken.db.corrupt-'))
    expect(backups).toHaveLength(1)
    // 新库可用：读写正常（旧数据按「服务端权威」口径丢弃）
    await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-after-heal' }))
    const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(page.list.map(m => m.msgServerId)).toEqual(['srv-after-heal'])
  })

  it('完好库重开不产生 .corrupt 备份、数据保留', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const dbPath = join(dir, 'healthy.db')

    handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
    await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-healthy' }))
    await handle.close()
    handle = undefined

    const logger = { warn: vi.fn() }
    handle = await createPersistence({ dbPath, account: ACCOUNT, logger })
    expect(logger.warn).not.toHaveBeenCalled()
    expect(readdirSync(dir).filter(name => name.includes('.corrupt-'))).toHaveLength(0)
    const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(page.list.map(m => m.msgServerId)).toEqual(['srv-healthy'])
  })

  it('注入驱动模式：库损坏只 warn 上报，不做改名重建（文件归宿主）', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const dbPath = join(dir, 'injected.db')

    handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
    await handle.close()
    handle = undefined
    writeFileSync(dbPath, Buffer.from('garbage'.repeat(64)))

    // 宿主自行打开（better-sqlite3 构造是惰性的，wrap 成功），注入后由包内探测
    const logger = { warn: vi.fn() }
    const driver = wrapBetterSqlite3(new Database(dbPath))
    // 探测 warn 后建库 DDL 会在损坏文件上失败并如实抛出（删库重建是宿主的决策）
    await expect(createPersistence({ db: driver, account: ACCOUNT, logger })).rejects.toThrow()
    expect(logger.warn).toHaveBeenCalled()
    // 不做改名备份：原文件保留、无 .corrupt 产物
    expect(readdirSync(dir).filter(name => name.includes('.corrupt-'))).toHaveLength(0)
    expect(existsSync(dbPath)).toBe(true)
  })

  it('busy_timeout 默认 3000ms，可经 options 覆盖', async () => {
    const driver = wrapBetterSqlite3(new Database(':memory:'))
    handle = await createPersistence({ db: driver, account: ACCOUNT, logger: silentLogger })
    expect(driver.prepare('PRAGMA busy_timeout').get()?.timeout).toBe(3000)
    await handle.close()

    const driver2 = wrapBetterSqlite3(new Database(':memory:'))
    handle = await createPersistence({
      db: driver2,
      account: ACCOUNT,
      logger: silentLogger,
      busyTimeoutMs: 1234,
    })
    expect(driver2.prepare('PRAGMA busy_timeout').get()?.timeout).toBe(1234)
  })

  it('backup：:memory: 库备份产物可打开且数据一致（含 FTS 索引）', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const backupPath = join(dir, 'backup-memory.db')

    handle = await createPersistence({ dbPath: ':memory:', account: ACCOUNT, logger: silentLogger })
    await handle.hooks.message?.saveMessage?.(
      makeRecord({ msgServerId: 'srv-bk1', body: { content: '备份一致性验证样本' } }),
    )
    await handle.backup(backupPath)
    await handle.close()
    handle = undefined

    // 备份产物作为独立库打开：数据与索引一致（backup 前已落盘 FTS 队列）
    handle = await createPersistence({ dbPath: backupPath, account: ACCOUNT, logger: silentLogger })
    const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(page.list.map(m => m.msgServerId)).toEqual(['srv-bk1'])
    const found = await handle.repository.searchMessages({ keyword: '一致性验证' })
    expect(found.list.map(m => m.msgServerId)).toEqual(['srv-bk1'])
  })

  it('backup：文件库备份数据一致；目标已存在时报错防覆盖', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const dbPath = join(dir, 'source.db')
    const backupPath = join(dir, 'backup-file.db')

    handle = await createPersistence({ dbPath, account: ACCOUNT, logger: silentLogger })
    await handle.hooks.message?.saveMessage?.(makeRecord({ msgServerId: 'srv-bk2' }))
    await handle.backup(backupPath)

    // 目标已存在：SQLite VACUUM INTO 拒绝覆盖，错误 warn 后原样上抛
    await expect(handle.backup(backupPath)).rejects.toThrow()

    await handle.close()
    handle = undefined

    handle = await createPersistence({ dbPath: backupPath, account: ACCOUNT, logger: silentLogger })
    const page = await handle.repository.loadMessages('c1', CONVERSATION_TYPE.SINGLECHAT)
    expect(page.list.map(m => m.msgServerId)).toEqual(['srv-bk2'])
  })
})
