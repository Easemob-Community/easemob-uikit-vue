import { describe, expect, it, vi } from 'vitest'
import type { ConversationMuteTarget } from '../conversation-mute'
import {
  CONVERSATION_MUTE_BATCH_SIZE,
  conversationMuteKey,
  syncConversationMuteStates,
} from '../conversation-mute'

function makeTargets(count: number): ConversationMuteTarget[] {
  return Array.from({ length: count }, (_, index) => ({
    conversationId: `u${index}`,
    conversationType: 'singleChat',
  }))
}

describe('syncConversationMuteStates', () => {
  it('按 20 条分批、小并发执行，并逐批记账', async () => {
    const targets = makeTargets(45)
    const queried = new Set<string>()
    const applied: string[] = []
    let active = 0
    let maxActive = 0
    const query = vi.fn(async (batch: ConversationMuteTarget[]) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
      return batch.map(item => ({ conversationId: item.conversationId, rule: { remindType: 'NONE' } }))
    })

    const result = await syncConversationMuteStates({
      targets,
      queried,
      query,
      apply: item => applied.push(item.conversationId),
    })

    expect(query.mock.calls.map(call => call[0].length)).toEqual([
      CONVERSATION_MUTE_BATCH_SIZE,
      CONVERSATION_MUTE_BATCH_SIZE,
      5,
    ])
    expect(result).toEqual({ queriedCount: 45, batchCount: 3, failedBatchCount: 0 })
    expect(applied).toHaveLength(45)
    expect(queried.size).toBe(45)
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it('已查询过的会话不再重复请求', async () => {
    const targets = makeTargets(25)
    const queried = new Set(targets.slice(0, 20).map(conversationMuteKey))
    const query = vi.fn(async (batch: ConversationMuteTarget[]) =>
      batch.map(item => ({ conversationId: item.conversationId, rule: {} })))

    const result = await syncConversationMuteStates({ targets, queried, query, apply: () => {} })

    expect(result.queriedCount).toBe(5)
    expect(result.batchCount).toBe(1)
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0].map(item => item.conversationId)).toEqual(targets.slice(20).map(item => item.conversationId))
  })

  it('单批失败不阻塞其余批次，失败批次不记账（下次重试）', async () => {
    const targets = makeTargets(45)
    const queried = new Set<string>()
    let callIndex = 0
    const query = vi.fn(async (batch: ConversationMuteTarget[]) => {
      callIndex += 1
      if (callIndex === 2)
        throw new Error('batch failed')
      return batch.map(item => ({ conversationId: item.conversationId, rule: {} }))
    })
    const onError = vi.fn()

    const result = await syncConversationMuteStates({ targets, queried, query, apply: () => {}, onError })

    expect(result.failedBatchCount).toBe(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(queried.size).toBe(25)
    expect(queried.has(conversationMuteKey(targets[20]))).toBe(false)
  })

  it('空目标与全部已查询时不发请求', async () => {
    const query = vi.fn()
    const empty = await syncConversationMuteStates({ targets: [], queried: new Set(), query, apply: () => {} })
    expect(empty).toEqual({ queriedCount: 0, batchCount: 0, failedBatchCount: 0 })

    const targets = makeTargets(3)
    const queried = new Set(targets.map(conversationMuteKey))
    const allQueried = await syncConversationMuteStates({ targets, queried, query, apply: () => {} })
    expect(allQueried.batchCount).toBe(0)
    expect(query).not.toHaveBeenCalled()
  })
})
