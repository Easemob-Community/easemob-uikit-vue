import type { CreateMultiBodyMessageParams, Message as SdkMessage, MultiBodySegment, SendMessageOptions } from 'easemob-websdk'
import type { MessageAttachmentDownloadResult, MultiBodySegmentInput } from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import type { ManagerHost } from '../../client'
import type { MessageStoreLike } from '../message-domain'
import { MessageDomain } from '../message-domain'

const SELF = 'me'
const PEER = 'peer1'

function makeMsg(overrides: Partial<SdkMessage> = {}): SdkMessage {
  return {
    msgServerId: '',
    msgLocalId: 'loc-multi-1',
    from: SELF,
    to: PEER,
    sender: { userId: SELF },
    conversationId: PEER,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.MULTI_BODY,
    sendStatus: MESSAGE_STATUS.SENDING,
    ext: {},
    timestamp: 1700000000000,
    body: [
      { type: 'text', content: 'first' },
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/photo.jpg', isGif: false, isOriginalImage: false },
    ],
    ...overrides,
  }
}

function makeStore() {
  return {
    addSendingMessage: vi.fn(),
    replaceWithSent: vi.fn(),
    markFailed: vi.fn(),
    updateUploadProgress: vi.fn(),
  } as unknown as MessageStoreLike
}

function makeClient(sendImpl?: (message: SdkMessage, options?: SendMessageOptions) => Promise<SdkMessage>) {
  const draft = makeMsg()
  const factorySegments = [
    { type: 'text', content: 'factory-text' },
    { type: 'image', localUrl: 'blob:factory-image', isGif: false, isOriginalImage: false },
    { type: 'file', url: 'factory-file' },
    { type: 'voice', url: 'factory-voice', duration: 3 },
    { type: 'video', url: 'factory-video', duration: 8, width: 640 },
    { type: 'location', latitude: 31.2, longitude: 121.4 },
    { type: 'custom', event: 'factory-custom' },
  ] as unknown as MultiBodySegment[]
  const chatManager = {
    createTextMessageBody: vi.fn(() => factorySegments[0]),
    createImageMessageBody: vi.fn(() => factorySegments[1]),
    createFileMessageBody: vi.fn(() => factorySegments[2]),
    createVoiceMessageBody: vi.fn(() => factorySegments[3]),
    createVideoMessageBody: vi.fn(() => factorySegments[4]),
    createLocationMessageBody: vi.fn(() => factorySegments[5]),
    createCustomMessageBody: vi.fn(() => factorySegments[6]),
    createMultiBodyMessage: vi.fn((_params: CreateMultiBodyMessageParams) => draft),
    sendMessage: vi.fn(sendImpl ?? (() => Promise.resolve(makeMsg({ msgServerId: 'srv-multi-1', sendStatus: MESSAGE_STATUS.SENT })))),
    downloadAttachment: vi.fn(),
  }
  return {
    draft,
    factorySegments,
    chatManager,
    client: { currentUserId: SELF, chatManager } as unknown as ManagerHost,
  }
}

function makeInputs(localFile: File): MultiBodySegmentInput[] {
  return [
    { type: 'text', content: 'text input' },
    { type: 'image', data: localFile, filename: localFile.name, isGif: false },
    { type: 'file', originalUrl: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
    { type: 'voice', originalUrl: 'https://example.com/voice.amr', duration: 3 },
    { type: 'video', originalUrl: 'https://example.com/demo.mp4', duration: 8, width: 640, height: 360 },
    { type: 'location', latitude: 31.2304, longitude: 121.4737, address: 'Shanghai' },
    { type: 'custom', event: 'userCard', params: { userId: 'user-1' } },
  ]
}

describe('MessageDomain multi_body', () => {
  it('maps all seven factories and passes their identical segment objects to one message', async () => {
    const localFile = new File(['image'], 'photo.png', { type: 'image/png' })
    const { client, chatManager, draft, factorySegments } = makeClient()
    const store = makeStore()
    const domain = new MessageDomain(client, store)
    const ext = { source: 'composer' }

    await domain.sendMultiBody(PEER, CONVERSATION_TYPE.SINGLECHAT, makeInputs(localFile), ext, true)

    const createParams = chatManager.createMultiBodyMessage.mock.calls[0]![0]!
    expect(createParams).toMatchObject({
      conversationId: PEER,
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
      ext,
      needReadReceipt: true,
    })
    expect(createParams.bodies).toHaveLength(7)
    createParams.bodies.forEach((segment: MultiBodySegment, index: number) => {
      expect(segment).toBe(factorySegments[index])
    })
    expect(chatManager.createImageMessageBody).toHaveBeenCalledWith(expect.objectContaining({ data: localFile, isGif: false }))
    expect(chatManager.createVoiceMessageBody).toHaveBeenCalledWith(expect.objectContaining({ duration: 3 }))
    expect(chatManager.createVideoMessageBody).toHaveBeenCalledWith(expect.objectContaining({ duration: 8, width: 640 }))
    expect(chatManager.sendMessage).toHaveBeenCalledWith(draft, expect.any(Object))
  })

  it('keeps SDK segment-count validation and writes aggregate progress to the same local message', async () => {
    const localFile = new File(['image'], 'photo.png', { type: 'image/png' })
    const { client, chatManager } = makeClient(async (_message, options) => {
      options?.onFileUploadProgress?.({ loaded: 75, total: 100, percent: 75 })
      return makeMsg({ msgServerId: 'srv-multi-1', sendStatus: MESSAGE_STATUS.SENT })
    })
    chatManager.createMultiBodyMessage.mockImplementationOnce(() => {
      throw new Error('segment count invalid')
    })
    const store = makeStore()
    const domain = new MessageDomain(client, store)
    const inputs = makeInputs(localFile)

    await expect(domain.sendMultiBody(PEER, CONVERSATION_TYPE.SINGLECHAT, inputs.slice(0, 1))).rejects.toThrow('segment count invalid')
    const twentyOne = Array.from({ length: 21 }, () => inputs[0]!)
    await domain.sendMultiBody(PEER, CONVERSATION_TYPE.SINGLECHAT, twentyOne)

    expect(chatManager.createMultiBodyMessage.mock.calls[0]![0]!.bodies).toHaveLength(1)
    expect(chatManager.createMultiBodyMessage.mock.calls[1]![0]!.bodies).toHaveLength(21)
    expect(store.updateUploadProgress).toHaveBeenCalledWith('loc-multi-1', 75)
  })

  it('downloads every attachment in order and rejects non-multi-body messages before SDK calls', async () => {
    const { client, chatManager, draft } = makeClient()
    const results: MessageAttachmentDownloadResult[] = [
      { filename: 'photo.jpg', mimeType: 'image/jpeg', data: new Uint8Array([1]), downloadUrl: 'https://example.com/photo.jpg' },
      { filename: 'spec.pdf', mimeType: 'application/pdf', data: new Uint8Array([2]), downloadUrl: 'https://example.com/spec.pdf' },
    ]
    chatManager.downloadAttachment.mockResolvedValue(results)
    const domain = new MessageDomain(client, makeStore())

    await expect(domain.downloadMultiBodyAttachments(draft)).resolves.toBe(results)
    expect(chatManager.downloadAttachment).toHaveBeenCalledWith({ message: draft })

    const ordinary = makeMsg({ type: MESSAGE_TYPE.FILE, body: { url: 'https://example.com/spec.pdf' } })
    await expect(domain.downloadMultiBodyAttachments(ordinary)).rejects.toThrow('MULTI_BODY_ATTACHMENT_UNSUPPORTED')
    expect(chatManager.downloadAttachment).toHaveBeenCalledTimes(1)
  })

  it('resends the identical failed message so uploaded segments can be reused', async () => {
    const sent = makeMsg({ msgServerId: 'srv-retry', sendStatus: MESSAGE_STATUS.SENT })
    const { client, chatManager, draft } = makeClient()
    chatManager.sendMessage
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce(sent)
    const domain = new MessageDomain(client, makeStore())

    await expect(domain.sendMultiBody(PEER, CONVERSATION_TYPE.SINGLECHAT, [
      { type: 'text', content: 'first' },
      { type: 'image', originalUrl: 'https://example.com/photo.jpg' },
    ])).rejects.toThrow('upload failed')
    await expect(domain.resendMultiBody(draft)).resolves.toBe(sent)

    expect(chatManager.sendMessage).toHaveBeenCalledTimes(2)
    expect(chatManager.sendMessage.mock.calls[0][0]).toBe(draft)
    expect(chatManager.sendMessage.mock.calls[1][0]).toBe(draft)
    await expect(domain.resendMultiBody(draft)).rejects.toThrow('MULTI_BODY_RESEND_UNAVAILABLE')
  })
})
