import { describe, expect, it } from 'vitest'
import type { UiMessage } from '@easemob-community/uikit-core'
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
} from '@easemob-community/uikit-core'
import { pickLastSummaryMessage } from '../conversation-summary'

function makeTextMessage(timestamp: number): UiMessage {
  return {
    msgServerId: `server-${timestamp}`,
    msgLocalId: `local-${timestamp}`,
    from: 'peer',
    to: 'me',
    sender: { userId: 'peer' },
    conversationId: 'group-1',
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp,
    body: { content: `text-${timestamp}` },
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
  } as UiMessage
}

function makeNoticeMessage(timestamp: number): UiMessage {
  return {
    msgServerId: '',
    msgLocalId: `notice-${timestamp}`,
    from: 'me',
    to: 'group-1',
    sender: { userId: 'me' },
    conversationId: 'group-1',
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.NOTICE,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp,
    body: { content: `notice-${timestamp}` },
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
  } as UiMessage
}

describe('pickLastSummaryMessage', () => {
  it('skips trailing local notices so group events cannot move the conversation', () => {
    const messages = [
      makeTextMessage(1000),
      makeNoticeMessage(2000),
      makeNoticeMessage(3000),
    ]

    expect(pickLastSummaryMessage(messages)?.timestamp).toBe(1000)
  })

  it('returns undefined when the conversation only contains local notices', () => {
    const messages = [makeNoticeMessage(2000), makeNoticeMessage(3000)]

    expect(pickLastSummaryMessage(messages)).toBeUndefined()
  })

  it('returns the last real message when notices are interleaved', () => {
    const messages = [
      makeTextMessage(1000),
      makeNoticeMessage(2000),
      makeTextMessage(3000),
      makeNoticeMessage(4000),
    ]

    expect(pickLastSummaryMessage(messages)?.timestamp).toBe(3000)
  })

  it('returns the last real message when there are no notices', () => {
    const messages = [makeTextMessage(1000), makeTextMessage(2000)]

    expect(pickLastSummaryMessage(messages)?.timestamp).toBe(2000)
  })
})
