import { describe, expect, it } from 'vitest'
import { CONVERSATION_TYPE } from '@easemob-community/uikit-core'
import type { UiConversation } from '@easemob-community/uikit-core'
import { shouldFetchLastMessageSender } from './conversation-item.utils'

function makeConversation(patch: Partial<UiConversation> = {}): UiConversation {
  return {
    id: 'group-1',
    name: '群聊',
    type: CONVERSATION_TYPE.GROUPCHAT,
    unreadCount: 0,
    lastMessageText: 'u1: hello',
    lastMessageFrom: 'u1',
    isPinned: false,
    isMuted: false,
    marks: [],
    ...patch,
  }
}

describe('shouldFetchLastMessageSender', () => {
  it('仅在群摘要仍以原始 userId 开头时需要回退拉取', () => {
    expect(shouldFetchLastMessageSender(makeConversation(), true)).toBe(true)
    expect(shouldFetchLastMessageSender(makeConversation({ lastMessageText: '昵称: hello' }), true)).toBe(false)
    expect(shouldFetchLastMessageSender(makeConversation({ lastMessageText: 'hello' }), true)).toBe(false)
  })

  it('单聊、无发送者、草稿覆盖和关闭发送者名称时不拉取', () => {
    expect(shouldFetchLastMessageSender(makeConversation({ type: CONVERSATION_TYPE.SINGLECHAT }), true)).toBe(false)
    expect(shouldFetchLastMessageSender(makeConversation({ lastMessageFrom: undefined }), true)).toBe(false)
    expect(shouldFetchLastMessageSender(makeConversation({ draft: '草稿' }), true)).toBe(false)
    expect(shouldFetchLastMessageSender(makeConversation(), false)).toBe(false)
  })
})
