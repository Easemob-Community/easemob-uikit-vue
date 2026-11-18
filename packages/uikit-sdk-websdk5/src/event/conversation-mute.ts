/**
 * 会话免打扰（silent mode）批量查询编排。
 *
 * SDK `pushManager.getConversationSilentModes` 单次最多 20 条，且会话列表同步协议
 * 不携带免打扰字段——UIKit 只能逐批查询。千级会话下若每次同步都对全量列表重查，
 * 会形成「20 条/次 × N 次」的请求风暴（压测实测 2 分钟 204 次），因此这里只做三件事：
 * 1) 已查过的会话不再重复查（queried 集合按事件注册周期维护）；
 * 2) 小并发（默认 2）缩短总耗时，避免串行几十次；
 * 3) 单片失败不阻塞其余分片，失败片不记账，下次同步重试。
 */

/** 单次请求的会话数上限（SDK 文档：getConversationSilentModes 单次最多 20 条） */
export const CONVERSATION_MUTE_BATCH_SIZE = 20

/** 默认并发数：兼顾总耗时与服务端压力 */
export const CONVERSATION_MUTE_CONCURRENCY = 2

export interface ConversationMuteTarget {
  conversationId: string
  conversationType: string
}

export interface ConversationMuteRule {
  remindType?: string
  expireTimestamp?: number
}

export interface ConversationMuteResultItem {
  conversationId: string
  rule: ConversationMuteRule
}

export interface SyncConversationMuteStatesOptions<T extends ConversationMuteTarget = ConversationMuteTarget> {
  /** 当前会话列表全量目标（内部会自动过滤已查询项） */
  targets: readonly T[]
  /** 已成功查询过的会话 key 集合（会被原地更新） */
  queried: Set<string>
  /** 单批查询实现，返回与入参顺序对齐的规则列表 */
  query: (batch: T[]) => Promise<readonly ConversationMuteResultItem[]>
  /** 每条规则的落库回调 */
  apply: (item: ConversationMuteResultItem) => void
  /** 单批失败回调（不抛出，继续其余分片） */
  onError?: (error: unknown, batch: T[]) => void
  batchSize?: number
  concurrency?: number
}

export interface SyncConversationMuteStatesResult {
  /** 本次实际查询的会话数（过滤已查询项后） */
  queriedCount: number
  /** 实际发起的请求批次数 */
  batchCount: number
  /** 失败批次数（这些会话不会记账，下次同步重试） */
  failedBatchCount: number
}

/** 会话唯一 key（单聊 userId 与群 id 理论上不冲突，仍带类型避免误合并） */
export function conversationMuteKey(target: Pick<ConversationMuteTarget, 'conversationId' | 'conversationType'>): string {
  return `${target.conversationType}:${target.conversationId}`
}

/**
 * 增量同步会话免打扰状态：跳过已查询项，按 20 条分批、小并发执行。
 * 成功批次整体记账（服务端未返回的会话视为默认规则，避免无限重查）。
 */
export async function syncConversationMuteStates<T extends ConversationMuteTarget = ConversationMuteTarget>(
  options: SyncConversationMuteStatesOptions<T>,
): Promise<SyncConversationMuteStatesResult> {
  const batchSize = options.batchSize ?? CONVERSATION_MUTE_BATCH_SIZE
  const concurrency = Math.max(1, options.concurrency ?? CONVERSATION_MUTE_CONCURRENCY)

  const pending = options.targets.filter(target => !options.queried.has(conversationMuteKey(target)))
  if (pending.length === 0 || batchSize <= 0)
    return { queriedCount: 0, batchCount: 0, failedBatchCount: 0 }

  const batches: T[][] = []
  for (let index = 0; index < pending.length; index += batchSize)
    batches.push(pending.slice(index, index + batchSize))

  let nextBatchIndex = 0
  let failedBatchCount = 0

  async function worker(): Promise<void> {
    while (nextBatchIndex < batches.length) {
      const batch = batches[nextBatchIndex]
      nextBatchIndex += 1
      try {
        const items = await options.query(batch)
        for (const item of items)
          options.apply(item)
        // 整批记账：服务端未返回的会话按默认规则处理，不重复查询
        for (const target of batch)
          options.queried.add(conversationMuteKey(target))
      }
      catch (error) {
        failedBatchCount += 1
        options.onError?.(error, batch)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, () => worker()))

  return { queriedCount: pending.length, batchCount: batches.length, failedBatchCount }
}
