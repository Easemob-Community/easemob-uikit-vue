import { describe, expect, it } from 'vitest'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'
import type { RichInputDraftSnapshot, SimpleInputDraftSnapshot } from './input-draft'
import {
  buildMessageInputDraft,
  canRestoreInputDraftSnapshot,
  cloneMessageInputDraftSnapshot,
  getDraftSnapshotPreviewUrls,
  resolveMultiBodyDraftPreview,
} from './input-draft'

const labels: Record<string, string> = {
  'message.image': '[图片]',
  'message.video': '[视频]',
  'message.file': '[文件]',
}
const t = (key: string) => labels[key] || key

function file(name: string, type: string): File {
  return new File(['content'], name, { type })
}

function simpleSnapshot(): SimpleInputDraftSnapshot {
  return {
    mode: 'simple',
    text: '前文后文',
    attachments: [
      {
        id: 'image-1',
        type: MESSAGE_TYPE.IMAGE,
        file: file('photo.png', 'image/png'),
        previewUrl: 'blob:image-1',
        position: 2,
        width: 640,
        height: 480,
      },
      {
        id: 'video-1',
        type: MESSAGE_TYPE.VIDEO,
        file: file('demo.mp4', ['video', 'mp4'].join('/')),
        previewUrl: 'blob:video-1',
        position: 4,
        duration: 8,
      },
    ],
    mentionList: [{ userId: 'user-1', name: '小明' }],
  }
}

describe('multi-body input draft preview', () => {
  it('joins image and following text without an ellipsis', () => {
    const bodies: MultiBodySegmentInput[] = [
      { type: MESSAGE_TYPE.IMAGE, data: file('photo.png', 'image/png') },
      { type: MESSAGE_TYPE.TEXT, content: '哇达哇' },
    ]

    expect(resolveMultiBodyDraftPreview(bodies, t)).toBe('[图片]哇达哇')
  })

  it('preserves text, video, and file order', () => {
    const bodies: MultiBodySegmentInput[] = [
      { type: MESSAGE_TYPE.TEXT, content: '前文' },
      { type: MESSAGE_TYPE.VIDEO, data: file('demo.mp4', ['video', 'mp4'].join('/')), duration: 8 },
      { type: MESSAGE_TYPE.TEXT, content: '后文' },
      { type: MESSAGE_TYPE.FILE, data: file('spec.pdf', 'application/pdf') },
      { type: MESSAGE_TYPE.IMAGE, data: file('second.png', 'image/png') },
    ]

    expect(resolveMultiBodyDraftPreview(bodies, t)).toBe('前文[视频]后文[文件][图片]')
  })

  it('returns an empty preview for no segments', () => {
    expect(resolveMultiBodyDraftPreview([], t)).toBe('')
  })
})

describe('input draft snapshots', () => {
  it('clones simple containers and attachment items while retaining File references', () => {
    const original = simpleSnapshot()
    const cloned = cloneMessageInputDraftSnapshot(original)

    expect(cloned).not.toBe(original)
    expect(cloned.attachments).not.toBe(original.attachments)
    expect(cloned.attachments[0]).not.toBe(original.attachments[0])
    expect(cloned.attachments[0]!.file).toBe(original.attachments[0]!.file)
    expect(cloned.mentionList).not.toBe(original.mentionList)

    cloned.attachments[0]!.position = 99
    cloned.mentionList[0]!.name = '改名'
    expect(original.attachments[0]!.position).toBe(2)
    expect(original.mentionList[0]!.name).toBe('小明')
  })

  it('clones rich document and resource containers without losing metadata', () => {
    const image = file('photo.png', 'image/png')
    const remote: MultiBodySegmentInput = {
      type: MESSAGE_TYPE.IMAGE,
      originalUrl: 'https://example.com/remote.png',
    }
    const original: RichInputDraftSnapshot = {
      mode: 'rich',
      document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '文字' }] }] },
      inlineImageFiles: new Map<string, File | MultiBodySegmentInput>([
        ['blob:rich-image', image],
        ['https://example.com/remote.png', remote],
      ]),
      inlineImageBlobUrls: new Set(['blob:rich-image']),
      attachments: simpleSnapshot().attachments,
      copiedAttachmentInputs: new Map([['copied-1', remote]]),
      mentionList: [{ userId: 'user-1', name: '小明' }],
    }

    const cloned = cloneMessageInputDraftSnapshot(original) as RichInputDraftSnapshot

    expect(cloned.document).not.toBe(original.document)
    expect(cloned.document.content?.[0]).not.toBe(original.document.content?.[0])
    expect(cloned.inlineImageFiles).not.toBe(original.inlineImageFiles)
    expect(cloned.inlineImageFiles.get('blob:rich-image')).toBe(image)
    expect(cloned.inlineImageBlobUrls).not.toBe(original.inlineImageBlobUrls)
    expect(cloned.copiedAttachmentInputs).not.toBe(original.copiedAttachmentInputs)
    expect(cloned.copiedAttachmentInputs.get('copied-1')).toBe(remote)
    expect(cloned.attachments[1]).toMatchObject({ duration: 8, position: 4 })
  })

  it('collects unique blob preview URLs from simple and rich snapshots', () => {
    const simple = simpleSnapshot()
    const rich: RichInputDraftSnapshot = {
      mode: 'rich',
      document: { type: 'doc' },
      inlineImageFiles: new Map(),
      inlineImageBlobUrls: new Set(['blob:inline', 'blob:image-1']),
      attachments: simple.attachments,
      copiedAttachmentInputs: new Map(),
      mentionList: [],
    }

    expect(getDraftSnapshotPreviewUrls(simple)).toEqual(['blob:image-1', 'blob:video-1'])
    expect(getDraftSnapshotPreviewUrls(rich)).toEqual(['blob:inline', 'blob:image-1', 'blob:video-1'])
  })
})

describe('message input draft assembly', () => {
  it('keeps an attachment-only draft and rejects a genuinely empty input', () => {
    const snapshot = simpleSnapshot()
    const bodies: MultiBodySegmentInput[] = [
      { type: MESSAGE_TYPE.IMAGE, data: snapshot.attachments[0]!.file },
    ]

    expect(buildMessageInputDraft('', snapshot, bodies, t)).toMatchObject({
      text: '',
      preview: '[图片]',
      snapshot: { mode: 'simple' },
    })
    expect(buildMessageInputDraft('   ', undefined, [], t)).toBeNull()
  })

  it('restores full snapshots only in their original input mode', () => {
    expect(canRestoreInputDraftSnapshot(simpleSnapshot(), 'simple')).toBe(true)
    expect(canRestoreInputDraftSnapshot(simpleSnapshot(), 'rich')).toBe(false)
    expect(canRestoreInputDraftSnapshot(undefined, 'simple')).toBe(false)
  })
})
