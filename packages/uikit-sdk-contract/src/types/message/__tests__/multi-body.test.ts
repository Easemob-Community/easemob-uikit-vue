import { describe, expect, it } from 'vitest'
import { MESSAGE_TYPE } from '../../../constants'
import type { MessageBody, MultiBody } from '../body'
import { isMultiBody } from '../guards'

const text = { type: 'text', content: '请看资料' } as const
const image = {
  type: 'image',
  localUrl: '',
  originalImageUrl: 'https://example.com/photo.jpg',
  isGif: false,
  isOriginalImage: false,
} as const
const file = {
  type: 'file',
  url: 'https://example.com/spec.pdf',
  filename: 'spec.pdf',
} as const
const voice = {
  type: 'voice',
  url: 'https://example.com/voice.amr',
  duration: 3,
} as const
const video = {
  type: 'video',
  url: 'https://example.com/demo.mp4',
  duration: 8,
  width: 640,
  height: 360,
} as const
const location = {
  type: 'location',
  latitude: 31.2304,
  longitude: 121.4737,
} as const
const custom = {
  type: 'custom',
  event: 'userCard',
  params: { userId: 'user-1' },
} as const

describe('multi_body contract', () => {
  it('exposes the SDK message type constant', () => {
    expect(MESSAGE_TYPE.MULTI_BODY).toBe('multi_body')
  })

  it('accepts every supported segment in one ordered body', () => {
    const body = [text, image, file, voice, video, location, custom] as const

    expect(isMultiBody(body)).toBe(true)
    expect(body.map(segment => segment.type)).toEqual([
      'text',
      'image',
      'file',
      'voice',
      'video',
      'location',
      'custom',
    ])
  })

  it('does not mistake ordinary object bodies for a multi body', () => {
    const bodies: MessageBody[] = [
      { content: 'plain text' },
      { localUrl: '', originalImageUrl: 'https://example.com/photo.jpg' },
      { title: 'history', summary: '2 messages', filename: 'combine', filetype: 'application/octet-stream', combineLevel: 1 },
    ]

    for (const body of bodies)
      expect(isMultiBody(body)).toBe(false)
  })

  it('accepts two segments and preserves more than twenty received segments', () => {
    const twoSegments = [text, image] as const
    const received = Array.from({ length: 21 }, (_, index) => (
      index % 2 === 0
        ? { ...text, content: `segment-${index}` }
        : image
    )) as unknown as MultiBody

    expect(isMultiBody(twoSegments)).toBe(true)
    expect(isMultiBody(received)).toBe(true)
    expect(received).toHaveLength(21)
  })

  it('rejects empty, single-segment, and malformed bodies', () => {
    expect(isMultiBody([])).toBe(false)
    expect(isMultiBody([text])).toBe(false)
    expect(isMultiBody([text, { type: 'cmd', action: 'TypingBegin' }])).toBe(false)
    expect(isMultiBody([text, { type: 'text' }])).toBe(false)
  })
})
