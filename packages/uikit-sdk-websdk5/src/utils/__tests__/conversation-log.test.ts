import { describe, expect, it, vi } from 'vitest'
import { CONVERSATION_SNAPSHOT_FULL_LIMIT, logConversationSnapshot } from '../conversation-log'

function makeLogger() {
  return { info: vi.fn() }
}

describe('logConversationSnapshot', () => {
  it('小列表保留全量快照，日志前缀不变', () => {
    const logger = makeLogger()
    const items = [{ id: 'a' }, { id: 'b' }]

    logConversationSnapshot(logger, 'onConversationListUpdate', items)

    expect(logger.info).toHaveBeenCalledWith('getConversationList raw (onConversationListUpdate)', items)
  })

  it('超过阈值只记录数量与样本，避免千级列表全量 dump', () => {
    const logger = makeLogger()
    const items = Array.from({ length: CONVERSATION_SNAPSHOT_FULL_LIMIT + 1 }, (_, index) => ({ id: `c${index}` }))

    logConversationSnapshot(logger, 'syncLocal', items)

    const [message, payload] = logger.info.mock.calls[0]
    expect(message).toBe('getConversationList raw (syncLocal)')
    expect(payload).toEqual({
      count: CONVERSATION_SNAPSHOT_FULL_LIMIT + 1,
      sampleSize: 3,
      sample: items.slice(0, 3),
    })
  })
})
