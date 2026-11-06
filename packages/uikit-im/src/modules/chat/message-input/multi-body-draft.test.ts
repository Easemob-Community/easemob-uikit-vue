import { afterEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodyAttachmentDraftItem } from './multi-body-draft'
import {
  buildMultiBodyInputs,
  createAttachmentDraft,
  resolveSimpleInputHeightChange,
  revokeDraftPreviewUrls,
  shouldApplyAttachmentMetadata,
  toMultiBodyAttachmentInputs,
} from './multi-body-draft'
import * as draftModule from './multi-body-draft'

function file(name: string, type: string): File {
  return new File(['content'], name, { type })
}

function imageItem(id = 'image-1'): MultiBodyAttachmentDraftItem {
  return {
    id,
    type: MESSAGE_TYPE.IMAGE,
    file: file('photo.png', 'image/png'),
    previewUrl: `blob:${id}`,
    width: 640,
    height: 480,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('multi-body attachment draft', () => {
  it('creates object-url previews for media but not for files', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')

    const image = createAttachmentDraft(file('photo.png', 'image/png'), MESSAGE_TYPE.IMAGE)
    const document = createAttachmentDraft(file('spec.pdf', 'application/pdf'), MESSAGE_TYPE.FILE)

    expect(image).toMatchObject({ type: MESSAGE_TYPE.IMAGE, previewUrl: 'blob:preview' })
    expect(document).toMatchObject({ type: MESSAGE_TYPE.FILE, previewUrl: '' })
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('maps image file and video metadata to neutral inputs without UI fields', () => {
    const inputs = toMultiBodyAttachmentInputs([
      imageItem(),
      {
        id: 'video-1',
        type: MESSAGE_TYPE.VIDEO,
        file: file('demo.mp4', ['video', 'mp4'].join('/')),
        previewUrl: 'blob:video-1',
        duration: 8,
        width: 1280,
        height: 720,
      },
      {
        id: 'file-1',
        type: MESSAGE_TYPE.FILE,
        file: file('spec.pdf', 'application/pdf'),
        previewUrl: '',
      },
    ])

    expect(inputs).toHaveLength(3)
    expect(inputs[0]).toMatchObject({
      type: MESSAGE_TYPE.IMAGE,
      filename: 'photo.png',
      filetype: 'image/png',
      fileLength: 7,
      width: 640,
      height: 480,
    })
    expect(inputs[1]).toMatchObject({
      type: MESSAGE_TYPE.VIDEO,
      duration: 8,
      width: 1280,
      height: 720,
    })
    expect(inputs[2]).toMatchObject({
      type: MESSAGE_TYPE.FILE,
      filename: 'spec.pdf',
      fileSize: 7,
      fileLength: 7,
    })
    expect(inputs.every(input => !('previewUrl' in input))).toBe(true)
  })

  it('builds trimmed text first and omits empty text', () => {
    const withText = buildMultiBodyInputs('  请看资料  ', [imageItem()])
    const withoutText = buildMultiBodyInputs('   ', [imageItem()])

    expect(withText).toHaveLength(2)
    expect(withText[0]).toEqual({ type: MESSAGE_TYPE.TEXT, content: '请看资料' })
    expect(withText[1]).toMatchObject({ type: MESSAGE_TYPE.IMAGE })
    expect(withoutText).toHaveLength(1)
    expect(withoutText[0]).toMatchObject({ type: MESSAGE_TYPE.IMAGE })
  })

  it('interleaves text around attachments at their caret positions', () => {
    const first = { ...imageItem('first'), file: file('first.png', 'image/png'), position: 1 }
    const second = { ...imageItem('second'), file: file('second.png', 'image/png'), position: 3 }

    const bodies = buildMultiBodyInputs('ABCD', [first, second])

    expect(bodies.map(body => body.type)).toEqual([
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.IMAGE,
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.IMAGE,
      MESSAGE_TYPE.TEXT,
    ])
    expect(bodies.filter(body => body.type === MESSAGE_TYPE.TEXT)).toEqual([
      { type: MESSAGE_TYPE.TEXT, content: 'A' },
      { type: MESSAGE_TYPE.TEXT, content: 'BC' },
      { type: MESSAGE_TYPE.TEXT, content: 'D' },
    ])
    expect(bodies.filter(body => body.type === MESSAGE_TYPE.IMAGE).map(body => body.filename)).toEqual(['first.png', 'second.png'])
  })

  it('keeps attachment anchors in order after inserting text', () => {
    const items = [
      { ...imageItem('first'), position: 1 },
      { ...imageItem('second'), position: 3 },
    ]
    const rebase = (draftModule as unknown as {
      rebaseAttachmentPositions?: (items: MultiBodyAttachmentDraftItem[], previousText: string, nextText: string) => void
    }).rebaseAttachmentPositions

    expect(rebase).toBeTypeOf('function')
    rebase?.(items, 'ABCD', 'AXBCD')

    expect(items.map(item => item.position)).toEqual([1, 4])
  })

  it('clamps attachment anchors into the remaining text after deletion', () => {
    const items = [
      { ...imageItem('first'), position: 1 },
      { ...imageItem('second'), position: 3 },
    ]
    const rebase = (draftModule as unknown as {
      rebaseAttachmentPositions?: (items: MultiBodyAttachmentDraftItem[], previousText: string, nextText: string) => void
    }).rebaseAttachmentPositions

    expect(rebase).toBeTypeOf('function')
    rebase?.(items, 'ABCD', 'AD')

    expect(items.map(item => item.position)).toEqual([1, 1])
  })

  it('revokes each media preview exactly once and leaves data urls alone', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const items = [
      imageItem('first'),
      imageItem('second'),
      { ...imageItem('data'), previewUrl: 'data:image/png;base64,eA==' },
      {
        id: 'file-1',
        type: MESSAGE_TYPE.FILE,
        file: file('spec.pdf', 'application/pdf'),
        previewUrl: '',
      } satisfies MultiBodyAttachmentDraftItem,
    ]

    revokeDraftPreviewUrls(items)
    revokeDraftPreviewUrls(items)

    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second')
  })
})


describe('attachment draft async guards', () => {
  it('keeps an attachment-aware height when collapsing with attachments', () => {
    expect(resolveSimpleInputHeightChange(null, 88, 196)).toBe(196)
    expect(resolveSimpleInputHeightChange(194, 88, 282)).toBe(282)
    expect(resolveSimpleInputHeightChange(null, 0, 108)).toBeNull()
  })

  it('applies metadata only to the same draft generation and existing item', () => {
    const item = imageItem('video-1')
    const items = [item]

    expect(shouldApplyAttachmentMetadata(item, items, 1, 1)).toBe(true)
    expect(shouldApplyAttachmentMetadata(item, items, 1, 2)).toBe(false)
    expect(shouldApplyAttachmentMetadata(item, [], 1, 1)).toBe(false)
  })
})
