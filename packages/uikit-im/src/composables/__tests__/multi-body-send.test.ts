import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBody, MultiBodySegmentInput, UiConversation, UiMessage } from '@easemob-community/uikit-core'
import { useChat } from '../use-chat'
import { useMessageSend } from '../use-message-send'
import { toMultiBodyPreview } from '../multi-body.utils'

const mocks = vi.hoisted(() => ({
  sendMultiBody: vi.fn(),
  resendMultiBody: vi.fn(),
  deleteMessage: vi.fn(),
  addMessage: vi.fn(),
  capabilities: { multiBodyMessage: true },
}))

vi.mock('../use-uikit', () => ({
  useUIKit: () => ({
    capabilities: mocks.capabilities,
    domains: {
      message: {
        sendMultiBody: mocks.sendMultiBody,
        resendMultiBody: mocks.resendMultiBody,
      },
    },
    stores: {
      conversation: {
        currentConversation: { id: 'group-1', type: 'groupChat' },
      },
      group: {
        getGroupById: () => ({ memberCount: 10 }),
      },
      message: {
        deleteMessage: mocks.deleteMessage,
        addMessage: mocks.addMessage,
      },
      client: { currentUser: 'me' },
    },
  }),
}))

function makeMessage(body: MultiBody): UiMessage {
  return {
    msgServerId: 'srv-parent',
    msgLocalId: 'loc-parent',
    localId: 'loc-parent',
    from: 'me',
    to: 'group-1',
    sender: { userId: 'me' },
    conversationId: 'group-1',
    conversationType: 'groupChat',
    type: MESSAGE_TYPE.MULTI_BODY,
    sendStatus: MESSAGE_STATUS.FAILED,
    status: MESSAGE_STATUS.FAILED,
    isSelf: true,
    ext: { source: 'composer' },
    timestamp: 1700000000000,
    body,
  }
}

const target = { id: 'target-group', type: 'groupChat', name: 'Target' } as UiConversation

beforeEach(() => {
  vi.clearAllMocks()
  mocks.capabilities.multiBodyMessage = true
  mocks.sendMultiBody.mockImplementation((...args) => Promise.resolve(args))
  mocks.resendMultiBody.mockImplementation(message => Promise.resolve(message))
})

describe('sendMultiBodyMessage', () => {
  it('sends through the current conversation with ext and computed group ack', async () => {
    const bodies: MultiBodySegmentInput[] = [
      { type: 'text', content: 'hello' },
      { type: 'image', originalUrl: 'https://example.com/a.jpg' },
    ]
    const ext = { quote: 'parent' }

    await useMessageSend().sendMultiBodyMessage(bodies, ext, { groupReadReceiptEnabled: true, maxGroupSize: 20 })

    expect(mocks.sendMultiBody).toHaveBeenCalledWith('group-1', 'groupChat', bodies, ext, true)
  })

  it('rejects when the adapter does not support multi_body', async () => {
    mocks.capabilities.multiBodyMessage = false

    await expect(useMessageSend().sendMultiBodyMessage([{ type: 'text', content: 'one' }])).rejects.toThrow('MULTI_BODY_UNSUPPORTED')
    expect(mocks.sendMultiBody).not.toHaveBeenCalled()
  })
})

describe('multi_body preview, forwarding, and retry', () => {
  it('builds a File-free preview with SDK-required image flags', () => {
    const file = new File(['x'], 'draft.png')
    const preview = toMultiBodyPreview([
      { type: 'image', data: file, originalUrl: 'https://example.com/draft.png' },
      { type: 'file', originalUrl: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
    ])

    expect(preview).toEqual([
      expect.objectContaining({
        type: 'image',
        localUrl: '',
        originalImageUrl: 'https://example.com/draft.png',
        isGif: false,
        isOriginalImage: false,
      }),
      expect.objectContaining({ type: 'file', url: 'https://example.com/spec.pdf' }),
    ])
    expect('data' in preview[0]!).toBe(false)
  })

  it('forwards every segment in order using remote URLs', async () => {
    const message = makeMessage([
      { type: 'text', content: 'first' },
      { type: 'image', localUrl: '', thumbnailUrl: 'https://example.com/thumb.jpg', isGif: false, isOriginalImage: false },
      { type: 'file', url: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
    ])

    await useChat().forwardMessage(message, target)

    const bodies = mocks.sendMultiBody.mock.calls[0]?.[2] as MultiBodySegmentInput[]
    expect(bodies.map(segment => segment.type)).toEqual(['text', 'image', 'file'])
    expect(bodies[1]).toMatchObject({ originalUrl: 'https://example.com/thumb.jpg' })
    expect(bodies[2]).toMatchObject({ originalUrl: 'https://example.com/spec.pdf' })
    expect(mocks.sendMultiBody.mock.calls[0]?.[3]).toEqual({ source: 'composer' })
  })

  it('rejects forwarding a local-only segment instead of silently dropping it', async () => {
    const message = makeMessage([
      { type: 'text', content: 'first' },
      { type: 'image', localUrl: 'blob:draft', isGif: false, isOriginalImage: false },
    ])

    await expect(useChat().forwardMessage(message, target)).rejects.toThrow('MULTI_BODY_FORWARD_UNAVAILABLE')
    expect(mocks.sendMultiBody).not.toHaveBeenCalled()
  })

  it('resends the original failed message and restores it when retry fails again', async () => {
    const message = makeMessage([
      { type: 'text', content: 'first' },
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
    ])

    await useMessageSend().resendMessage(message)
    expect(mocks.deleteMessage).toHaveBeenCalledWith('srv-parent')
    expect(mocks.resendMultiBody).toHaveBeenCalledWith(message)

    mocks.resendMultiBody.mockRejectedValueOnce(new Error('retry failed'))
    await expect(useMessageSend().resendMessage(message)).rejects.toThrow('retry failed')
    expect(mocks.addMessage).toHaveBeenCalledWith(message)
  })
})
