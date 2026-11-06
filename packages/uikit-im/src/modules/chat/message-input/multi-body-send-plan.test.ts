import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'
import { canUseConversationForSend, resolveMultiBodySendPlan, settleInputDraftSend } from './multi-body-send-plan'

const text: MultiBodySegmentInput = { type: MESSAGE_TYPE.TEXT, content: 'hello' }
const image: MultiBodySegmentInput = { type: MESSAGE_TYPE.IMAGE, originalUrl: 'https://example.com/a.png' }
const video: MultiBodySegmentInput = { type: MESSAGE_TYPE.VIDEO, originalUrl: 'https://example.com/a.mp4', duration: 3 }
const file: MultiBodySegmentInput = { type: MESSAGE_TYPE.FILE, originalUrl: 'https://example.com/a.pdf' }

describe('resolveMultiBodySendPlan', () => {
  it('rejects an empty draft', () => {
    expect(resolveMultiBodySendPlan([])).toEqual({ kind: 'empty' })
  })

  it('keeps single content as its original message type', () => {
    expect(resolveMultiBodySendPlan([text])).toEqual({ kind: 'text', body: text })
    expect(resolveMultiBodySendPlan([image])).toEqual({ kind: 'image', body: image })
    expect(resolveMultiBodySendPlan([video])).toEqual({ kind: 'video', body: video })
    expect(resolveMultiBodySendPlan([file])).toEqual({ kind: 'file', body: file })
  })

  it('combines text with one attachment and combines attachments without text', () => {
    expect(resolveMultiBodySendPlan([text, image])).toEqual({ kind: 'multiBody', bodies: [text, image] })
    expect(resolveMultiBodySendPlan([image, video])).toEqual({ kind: 'multiBody', bodies: [image, video] })
  })

  it('accepts twenty segments and rejects twenty-one without truncation', () => {
    const twenty = Array.from({ length: 20 }, () => text)
    const twentyOne = Array.from({ length: 21 }, () => text)

    expect(resolveMultiBodySendPlan(twenty)).toEqual({ kind: 'multiBody', bodies: twenty })
    expect(resolveMultiBodySendPlan(twentyOne)).toEqual({ kind: 'tooMany', count: 21 })
  })
})

describe('settleInputDraftSend', () => {
  it('clears the draft only after a successful send', async () => {
    const clearDraft = vi.fn()

    await expect(settleInputDraftSend(() => Promise.resolve(true), clearDraft)).resolves.toBe(true)
    expect(clearDraft).toHaveBeenCalledTimes(1)
  })

  it('preserves the draft when sending is blocked or fails', async () => {
    const clearDraft = vi.fn()

    await expect(settleInputDraftSend(() => Promise.resolve(false), clearDraft)).resolves.toBe(false)
    await expect(settleInputDraftSend(() => Promise.reject(new Error('upload failed')), clearDraft)).rejects.toThrow('upload failed')
    expect(clearDraft).not.toHaveBeenCalled()
  })
})


describe('settleInputDraftSend context guard', () => {
  it('does not clear a newer draft or a draft from another conversation', async () => {
    const clearDraft = vi.fn()

    await expect(settleInputDraftSend(() => Promise.resolve(true), clearDraft, () => false)).resolves.toBe(true)

    expect(clearDraft).not.toHaveBeenCalled()
  })
})


describe('canUseConversationForSend', () => {
  it('allows only the original non-empty conversation', () => {
    expect(canUseConversationForSend('conversation-a', 'conversation-a')).toBe(true)
    expect(canUseConversationForSend('conversation-a', 'conversation-b')).toBe(false)
    expect(canUseConversationForSend('', 'conversation-a')).toBe(false)
  })
})
