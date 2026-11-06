import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBody, MultiBodySegmentInput, UiMessage } from '@easemob-community/uikit-core'
import * as multiBodyUtils from '../multi-body.utils'
import { buildQuoteExt, getQuotePreview } from '../use-quote'
import { useMessageSearch } from '../use-message-search'

const mocks = vi.hoisted(() => ({ getMessages: vi.fn() }))

vi.mock('../use-uikit', () => ({
  useUIKit: () => ({
    client: ref({ client: {} }),
    stores: {
      conversation: {
        currentConversation: { id: 'peer', type: 'singleChat' },
        currentConversationId: 'peer',
      },
      message: { getMessages: mocks.getMessages },
      userInfo: { getUserInfo: () => undefined },
      contact: { getContact: () => undefined },
    },
  }),
}))

function makeMessage(): UiMessage {
  const body: MultiBody = [
    { type: 'text', content: '请看资料' },
    { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
    { type: 'text', content: '第三段文本' },
    { type: 'file', url: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
    { type: 'location', latitude: 31.2, longitude: 121.4, address: 'Shanghai' },
    { type: 'custom', event: 'userCard', params: { userId: 'user-1' } },
  ]
  return {
    msgServerId: 'srv-parent',
    msgLocalId: 'loc-parent',
    localId: 'loc-parent',
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

describe('multi_body quote and local search', () => {
  beforeEach(() => {
    mocks.getMessages.mockReturnValue([makeMessage()])
  })

  it('quotes the parent message with a segment-aware preview', () => {
    const message = makeMessage()

    expect(getQuotePreview(message)).toBe('请看资料 ...')
    expect(buildQuoteExt(message).msgQuote).toMatchObject({
      msgID: 'srv-parent',
      msgType: MESSAGE_TYPE.MULTI_BODY,
      msgPreview: '请看资料 ...',
    })
  })

  it.each(['第三段文本', 'spec.pdf', 'Shanghai', 'user-1'])('finds %s in later segments', async (keyword) => {
    const search = useMessageSearch()
    search.keyword.value = keyword

    await search.search()

    expect(search.results.value).toHaveLength(1)
    expect(search.results.value[0]).toMatchObject({
      msgId: 'srv-parent',
      summary: '请看资料 ...',
    })
  })
})

describe('multi_body rich clipboard', () => {
  it('round-trips supported segments in order with remote resources and plain text', () => {
    const create = (multiBodyUtils as unknown as {
      createMultiBodyClipboardData?: (message: UiMessage) => { text: string, html: string } | null
    }).createMultiBodyClipboardData
    const parse = (multiBodyUtils as unknown as {
      parseMultiBodyClipboardHtml?: (html: string) => MultiBodySegmentInput[] | null
    }).parseMultiBodyClipboardHtml
    const message = makeMessage()
    message.body = [
      { type: 'text', content: '前文' },
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', thumbnailUrl: 'https://example.com/a-thumb.jpg', isGif: false, isOriginalImage: false },
      { type: 'file', url: 'https://example.com/spec.pdf', filename: 'spec.pdf', fileLength: 128 },
      { type: 'text', content: '后文' },
      { type: 'video', url: 'https://example.com/demo.mp4', duration: 8, fileLength: 1024 },
    ]

    expect(create).toBeTypeOf('function')
    expect(parse).toBeTypeOf('function')
    const data = create?.(message)

    expect(data?.text).toBe('前文\n后文')
    const segments = parse?.(data?.html || '')
    expect(segments?.map(segment => segment.type)).toEqual(['text', 'image', 'file', 'text', 'video'])
    expect(segments?.[1]).toMatchObject({ originalUrl: 'https://example.com/a.jpg', thumbnailUrl: 'https://example.com/a-thumb.jpg' })
    expect(segments?.[2]).toMatchObject({ originalUrl: 'https://example.com/spec.pdf', filename: 'spec.pdf', fileLength: 128 })
    expect(segments?.[4]).toMatchObject({ originalUrl: 'https://example.com/demo.mp4', duration: 8 })
    expect(parse?.('<div data-easemob-multi-body="{bad}"></div>')).toBeNull()
  })

  it('falls back to plain text when any segment cannot be restored by rich input', () => {
    const create = (multiBodyUtils as unknown as {
      createMultiBodyClipboardData?: (message: UiMessage) => { text: string, html: string } | null
    }).createMultiBodyClipboardData

    expect(create).toBeTypeOf('function')
    expect(create?.(makeMessage())).toEqual({ text: '请看资料\n第三段文本', html: '' })
  })
})
