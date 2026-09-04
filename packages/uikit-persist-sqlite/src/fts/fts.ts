/**
 * FTS5 全文索引：内容拼装规则 + 异步批量合并写队列（规格书决策 3.6 / 决策 6）。
 *
 * 内容列拼装规则（决策 6 DDL 注释落地）：
 * - 入索引：文本 content / 附件文件名 / 位置文本 / 合并消息内层文本（递归提取）；
 * - 不入索引：sender 昵称（昵称可变，入索引会「搜新不命中、搜旧反命中」，
 *   昵称搜索走 uikit_user_info / uikit_conversations 小表 LIKE）；
 * - 不入索引：tip 类中性事件消息（notice，入库但无人搜，入索引只会稀释结果）；
 * - cmd 透传消息整行不入库（hooks 写库路径拦截，不会到达本模块）。
 *
 * 维护方式（决策 6）：主表先写，FTS 队列异步批量合并写，避免高频消息逐条
 * 维护索引卡 IPC；墓碑置位 / 物理删除时同步撤 FTS 行（决策 8.3，政企场景
 * 已撤回消息仍可被搜到是事故）。
 *
 * 注意：FTS 表是 external content（content='uikit_messages'），但主表没有
 * `content` 列——撤行必须走 FTS5 'delete' 命令并自带旧内容（本模块按
 * 「内容拼装确定性」从行数据重算旧内容），不能用裸 DELETE（会触发
 * external content 回读 `content` 列而报错）。
 */

import type { SqliteDriver } from '../driver/driver'
import type { FtsSourceShape } from '../records/records'

interface CombineBodyLike {
  messageList?: ReadonlyArray<{ type?: string, body?: unknown }>
}

/** 从 body 提取可索引文本（返回 null 表示该类型不入 FTS） */
function extractFromBody(type: string, body: unknown): string | null {
  if (!body || typeof body !== 'object')
    return null
  const b = body as Record<string, unknown>
  switch (type) {
    case 'text':
      return typeof b.content === 'string' && b.content !== '' ? b.content : null
    case 'image':
    case 'file':
    case 'voice':
    case 'video':
      return typeof b.filename === 'string' && b.filename !== '' ? b.filename : null
    case 'location': {
      const parts = [b.address, b.buildingName].filter(
        (v): v is string => typeof v === 'string' && v !== '',
      )
      return parts.length > 0 ? parts.join(' ') : null
    }
    case 'combine': {
      // 合并消息：递归提取内层文本（命中跳外层消息）
      const list = (b as unknown as CombineBodyLike).messageList
      if (!Array.isArray(list))
        return null
      const texts: string[] = []
      for (const sub of list) {
        if (!sub || typeof sub !== 'object' || typeof sub.type !== 'string')
          continue
        const text = extractFromBody(sub.type, sub.body)
        if (text)
          texts.push(text)
      }
      return texts.length > 0 ? texts.join('\n') : null
    }
    default:
      // custom / notice（tip）/ 其它类型不入 FTS
      return null
  }
}

/**
 * 计算一条消息的 FTS 内容列（确定性：同一份 (type, body) 恒得同一结果，
 * 这是 external content 表能用 'delete' 命令精确撤行的前提）。
 */
export function extractFtsContent(source: FtsSourceShape): string | null {
  return extractFromBody(source.type, source.body)
}

interface PendingFtsOp {
  /** 撤行用旧内容（null = 无需撤行） */
  oldContent: string | null
  /** 写入新内容（null = 不写新行） */
  newContent: string | null
}

export interface FtsQueueLogger {
  warn: (...args: unknown[]) => void
}

/**
 * FTS 异步批量合并写队列：主表写完后入队，setTimeout(0) 批量合并落索引；
 * 测试与管理 API（clearMessages / clearAll）经 `flush()` 同步等待口强制落盘。
 * 同一 rowid 的多次操作合并：保留最早旧内容、最新新内容。
 */
export class FtsIndexQueue {
  private readonly pending = new Map<number, PendingFtsOp>()
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly db: SqliteDriver,
    private readonly logger: FtsQueueLogger,
  ) {}

  /** 入队索引维护操作（oldContent / newContent 均 null 时为 no-op） */
  enqueue(rowid: number, oldContent: string | null, newContent: string | null): void {
    if (oldContent === null && newContent === null)
      return
    const existing = this.pending.get(rowid)
    if (existing) {
      existing.newContent = newContent
    }
    else {
      this.pending.set(rowid, { oldContent, newContent })
    }
    this.schedule()
  }

  private schedule(): void {
    if (this.timer !== null)
      return
    this.timer = setTimeout(() => this.flush(), 0)
    // 不让 flush 定时器拖住进程退出（Electron 主进程退出场景）
    this.timer.unref?.()
  }

  /** 同步落盘等待口：把队列内全部操作合并写入 FTS（事务） */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.pending.size === 0)
      return
    const ops = [...this.pending.entries()]
    this.pending.clear()
    try {
      const deleteStmt = this.db.prepare(
        'INSERT INTO uikit_messages_fts(uikit_messages_fts, rowid, content) VALUES(\'delete\', ?, ?)',
      )
      const insertStmt = this.db.prepare(
        'INSERT INTO uikit_messages_fts(rowid, content) VALUES(?, ?)',
      )
      this.db.transaction(() => {
        for (const [rowid, op] of ops) {
          if (op.oldContent !== null)
            deleteStmt.run(rowid, op.oldContent)
          if (op.newContent !== null)
            insertStmt.run(rowid, op.newContent)
        }
      })
    }
    catch (error) {
      // 写库失败只 warn 不阻塞（决策 3.2）；FTS 失准由「删库重建」兜底
      this.logger.warn('[uikit-persist-sqlite] FTS 批量合并写失败', error)
    }
  }

  /** 待落盘操作数（测试 / 调试观测用） */
  get pendingCount(): number {
    return this.pending.size
  }
}
