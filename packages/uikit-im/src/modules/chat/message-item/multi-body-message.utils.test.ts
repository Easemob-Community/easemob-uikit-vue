import { describe, expect, it } from 'vitest'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBody, MultiBodySegment, UiMessage } from '@easemob-community/uikit-core'
import { toSegmentUiMessage } from './multi-body-message.utils'

const segments: MultiBody = [
  { type: 'text', content: 'text' },
  { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
  { type: 'file', url: 'https://example.com/a.pdf', filename: 'a.pdf' },
  { type: 'voice', url: 'https://example.com/a.amr', duration: 3 },
  { type: 'video', url: 'https://example.com/a.mp4', duration: 8, width: 640 },
  { type: 'location', latitude: 31.2, longitude: 121.4 },
  { type: 'custom', event: 'userCard' },
]

function makeParent(): UiMessage {
  return {
    msgServerId: 'srv-parent',
    msgLocalId: 'loc-parent',
    localId: 'loc-parent',
    from: 'peer',
    to: 'me',
    sender: { userId: 'peer', nickname: 'Peer' },
    conversationId: 'group-1',
    conversationType: 'groupChat',
    type: MESSAGE_TYPE.MULTI_BODY,
    sendStatus: MESSAGE_STATUS.SENDING,
    status: MESSAGE_STATUS.SENDING,
    isSelf: true,
    ext: { source: 'composer' },
    timestamp: 1700000000000,
    body: segments,
  }
}

describe('toSegmentUiMessage', () => {
  it('preserves order and maps every segment to its ordinary message renderer shape', () => {
    const parent = makeParent()
    const rendered = segments.map((segment, index) => toSegmentUiMessage(parent, segment, index))

    expect(rendered.map(message => message.type)).toEqual([
      'text',
      'image',
      'file',
      'voice',
      'video',
      'location',
      'custom',
    ])
    rendered.forEach((message, index) => {
      expect('type' in message.body).toBe(false)
      expect(message.msgLocalId).toBe(`loc-parent:${index}`)
      expect(message.msgServerId).toBe(`srv-parent:${index}`)
      expect(message.conversationId).toBe('group-1')
      expect(message.ext).toEqual({ source: 'composer' })
    })
  })

  it('uses a display-only sent state and keeps the parent sender identity', () => {
    const parent = makeParent()
    const segment: MultiBodySegment = { type: 'text', content: 'child' }

    const rendered = toSegmentUiMessage(parent, segment, 0)

    expect(rendered.status).toBe(MESSAGE_STATUS.SENT)
    expect(rendered.sendStatus).toBe(MESSAGE_STATUS.SENT)
    expect(rendered.from).toBe('peer')
    expect(rendered.sender).toEqual({ userId: 'peer', nickname: 'Peer' })
    expect(rendered.isSelf).toBe(true)
  })
})
