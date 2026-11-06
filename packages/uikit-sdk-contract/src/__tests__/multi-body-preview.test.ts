import { describe, expect, it } from 'vitest'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '../constants'
import { defaultLastMessageTextResolver } from '../message-preview'
import type { MultiBody, UiMessage } from '../types'

function makeMessage(body: MultiBody): UiMessage {
  return {
    msgServerId: 'srv-multi',
    msgLocalId: 'loc-multi',
    from: 'peer',
    to: 'me',
    sender: { userId: 'peer' },
    conversationId: 'peer',
    conversationType: 'singleChat',
    type: MESSAGE_TYPE.MULTI_BODY,
    sendStatus: MESSAGE_STATUS.SENT,
    status: MESSAGE_STATUS.SENT,
    isSelf: false,
    ext: {},
    timestamp: 1700000000000,
    body,
  }
}

const labels = {
  image: '[图片]',
  custom: { userCard: '[名片]' },
  multiBody: '[复合消息]',
}

describe('multi_body preview', () => {
  it('uses the first text segment and appends the configured suffix', () => {
    const message = makeMessage([
      { type: 'text', content: '请看资料' },
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
      { type: 'text', content: '第三段' },
    ])

    expect(defaultLastMessageTextResolver(message, labels)).toBe('请看资料 ...')
  })

  it('uses image and custom labels when they are the first segment', () => {
    const imageFirst = makeMessage([
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
      { type: 'text', content: '补充说明' },
    ])
    const customFirst = makeMessage([
      { type: 'custom', event: 'userCard' },
      { type: 'text', content: '补充说明' },
    ])

    expect(defaultLastMessageTextResolver(imageFirst, labels)).toBe('[图片] ...')
    expect(defaultLastMessageTextResolver(customFirst, labels)).toBe('[名片] ...')
  })
})
