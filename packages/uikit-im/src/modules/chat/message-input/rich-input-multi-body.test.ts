import { describe, expect, it } from 'vitest'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'
import { projectRichDocumentToMultiBodyInputs } from './rich-input-multi-body'

const imageFile = (name: string) => new File([name], name, { type: 'image/png' })

describe('projectRichDocumentToMultiBodyInputs', () => {
  it('projects text-image-text in document order and preserves paragraph breaks', () => {
    const first = imageFile('first.png')
    const second = imageFile('second.png')
    const fileMap = new Map([
      ['blob:first', first],
      ['blob:second', second],
    ])
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '第一段' },
            { type: 'image', attrs: { src: 'blob:first' } },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '第二段\n第二行' },
            { type: 'image', attrs: { src: 'blob:second' } },
            { type: 'text', text: '第三段' },
          ],
        },
      ],
    }

    const bodies = projectRichDocumentToMultiBodyInputs(json, fileMap)

    expect(bodies.map(segment => segment.type)).toEqual(['text', 'image', 'text', 'image', 'text'])
    expect(bodies[0]).toMatchObject({ content: '第一段' })
    expect(bodies[1]).toMatchObject({ data: first, filename: 'first.png' })
    expect(bodies[2]).toMatchObject({ content: '第二段\n第二行' })
    expect(bodies[3]).toMatchObject({ data: second })
    expect(bodies[4]).toMatchObject({ content: '第三段' })
  })

  it('preserves a copied remote image input instead of requiring a local File', () => {
    const image: MultiBodySegmentInput = {
      type: 'image',
      originalUrl: 'https://example.com/original.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    }
    const fileMap = new Map([['https://example.com/thumb.jpg', image]])
    const json = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src: 'https://example.com/thumb.jpg' } }],
      }],
    }

    const bodies = projectRichDocumentToMultiBodyInputs(json, fileMap)

    expect(bodies).toEqual([image])
  })

  it('does not create empty text bodies between consecutive images', () => {
    const first = imageFile('first.png')
    const second = imageFile('second.png')
    const fileMap = new Map([
      ['blob:first', first],
      ['blob:second', second],
    ])
    const json = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'image', attrs: { src: 'blob:first' } },
          { type: 'image', attrs: { src: 'blob:second' } },
        ],
      }],
    }

    const bodies = projectRichDocumentToMultiBodyInputs(json, fileMap)
    expect(bodies).toHaveLength(2)
    expect(bodies.every(segment => segment.type === 'image')).toBe(true)
  })

  it('keeps all 21 segments for the caller to validate', () => {
    const fileMap = new Map(Array.from({ length: 21 }, (_, index) => [
      `blob:${index}`,
      imageFile(`${index}.png`),
    ]))
    const json = {
      type: 'doc',
      content: Array.from(fileMap.keys(), src => ({
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src } }],
      })),
    }

    expect(projectRichDocumentToMultiBodyInputs(json, fileMap)).toHaveLength(21)
  })

  it('projects inline attachment cards with surrounding text in document order', () => {
    const documentFile = new File(['doc'], 'spec.pdf', { type: 'application/pdf' })
    const attachment: MultiBodySegmentInput = { type: 'file', data: documentFile, filename: documentFile.name }
    const attachmentMap = new Map([['attachment-1', attachment]])
    const json = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: '前文' },
          { type: 'multiBodyAttachment', attrs: { attachmentId: 'attachment-1' } },
          { type: 'text', text: '后文' },
        ],
      }],
    }

    const bodies = projectRichDocumentToMultiBodyInputs(json, new Map(), [], attachmentMap)

    expect(bodies.map(segment => segment.type)).toEqual(['text', 'file', 'text'])
    expect(bodies[0]).toMatchObject({ content: '前文' })
    expect(bodies[1]).toBe(attachment)
    expect(bodies[2]).toMatchObject({ content: '后文' })
  })

  it('appends video and file drafts after document segments in insertion order', () => {
    const attachments: MultiBodySegmentInput[] = [
      { type: 'video', data: new File(['video'], 'demo.mp4', { type: ['video', 'mp4'].join('/') }), duration: 5 },
      { type: 'file', data: new File(['doc'], 'spec.pdf', { type: 'application/pdf' }) },
    ]
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '说明' }] }],
    }

    const bodies = projectRichDocumentToMultiBodyInputs(json, new Map(), attachments)

    expect(bodies.map(segment => segment.type)).toEqual(['text', 'video', 'file'])
    expect(bodies[1]).toBe(attachments[0])
    expect(bodies[2]).toBe(attachments[1])
  })

  it('rejects an inline attachment whose original File is unavailable', () => {
    const json = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'multiBodyAttachment', attrs: { attachmentId: 'missing' } }],
      }],
    }

    expect(() => projectRichDocumentToMultiBodyInputs(json, new Map())).toThrow('MULTI_BODY_ATTACHMENT_FILE_MISSING')
  })

  it('rejects an inline image whose original File is unavailable', () => {
    const json = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src: 'blob:missing' } }],
      }],
    }

    expect(() => projectRichDocumentToMultiBodyInputs(json, new Map())).toThrow('MULTI_BODY_IMAGE_FILE_MISSING')
  })
})
