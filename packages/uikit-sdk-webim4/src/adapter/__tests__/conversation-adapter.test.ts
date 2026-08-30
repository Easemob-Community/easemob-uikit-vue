import type { EasemobChat } from 'easemob-websdk'
import { describe, expect, it } from 'vitest'
import { deriveConversationUpsertFromMessage } from '../conversation-adapter'
import { toUiMessage } from '../message-adapter'

const SELF = 'me'
const PEER = 'peer1'
const GROUP = 'group1'

/** 构造 4.x 文本消息体 */
function makeText(overrides: Partial<EasemobChat.TextMsgBody> = {}): EasemobChat.TextMsgBody {
  return {
    id: 'srv-1',
    chatType: 'singleChat',
    type: 'txt',
    to: PEER,
    from: SELF,
    msg: 'hello',
    time: 1700000000000,
    ...overrides,
  }
}

describe('deriveConversationUpsertFromMessage（onMessage 会话列表代偿）', () => {
  it('他人消息且非到达即读：unreadIncrement=1；群聊摘要拼发送者显示名前缀', () => {
    const uiMsg = toUiMessage(makeText({ chatType: 'groupChat', to: GROUP, from: PEER, msg: 'hi' }), SELF)
    const { patch, unreadIncrement } = deriveConversationUpsertFromMessage(uiMsg, {
      readOnArrive: false,
      resolveSenderName: () => '小明',
    })
    expect(unreadIncrement).toBe(1)
    expect(patch.lastMessageText).toBe('小明: hi')
    expect(patch.lastMessageFrom).toBe(PEER)
    expect(patch.lastMessageTime).toBe(uiMsg.timestamp)
  })

  it('自己发送（含多端同步）或到达即读：unreadIncrement=0；单聊摘要不拼发送者前缀', () => {
    const selfMsg = toUiMessage(makeText({ from: SELF, to: PEER }), SELF)
    expect(deriveConversationUpsertFromMessage(selfMsg, { readOnArrive: false }).unreadIncrement).toBe(0)

    const peerMsg = toUiMessage(makeText({ from: PEER, to: SELF }), SELF)
    const { patch, unreadIncrement } = deriveConversationUpsertFromMessage(peerMsg, { readOnArrive: true })
    expect(unreadIncrement).toBe(0)
    expect(patch.lastMessageText).toBe('hello')
    expect(patch.lastMessageFrom).toBeUndefined()
  })
})
