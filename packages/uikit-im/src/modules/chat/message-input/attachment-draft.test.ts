import { afterEach, describe, expect, it, vi } from 'vitest'
import { getClipboardAttachmentFiles, hasHtmlImage, readVideoMetadata } from './attachment-draft'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('readVideoMetadata', () => {
  it('returns duration and dimensions and releases its temporary url', async () => {
    const listeners = new Map<string, () => void>()
    const video = {
      duration: 8.9,
      videoWidth: 640,
      videoHeight: 360,
      addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    }
    vi.stubGlobal('document', { createElement: () => video })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video-metadata')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const pending = readVideoMetadata(new File(['video'], 'demo.mp4', { type: ['video', 'mp4'].join('/') }))
    listeners.get('loadedmetadata')?.()

    await expect(pending).resolves.toEqual({ duration: 8, width: 640, height: 360 })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:video-metadata')
  })

  it('falls back to one second when metadata cannot be read', async () => {
    const listeners = new Map<string, () => void>()
    const video = {
      addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    }
    vi.stubGlobal('document', { createElement: () => video })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video-error')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const pending = readVideoMetadata(new File(['video'], 'demo.mp4', { type: ['video', 'mp4'].join('/') }))
    listeners.get('error')?.()

    await expect(pending).resolves.toEqual({ duration: 1 })
  })
})

describe('getClipboardAttachmentFiles', () => {
  const image = new File(['image'], 'photo.png', { type: 'image/png' })
  const video = new File(['video'], 'demo.mp4', { type: ['video', 'mp4'].join('/') })
  const document = new File(['doc'], 'spec.pdf', { type: 'application/pdf' })
  const data = {
    items: [
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
      { kind: 'file', type: image.type, getAsFile: () => image },
      { kind: 'file', type: video.type, getAsFile: () => video },
      { kind: 'file', type: document.type, getAsFile: () => document },
    ],
  } as unknown as DataTransfer

  it('collects image video and generic files while ignoring text items', () => {
    expect(getClipboardAttachmentFiles(data, { image: true, video: true, file: true })).toEqual([image, video, document])
  })

  it('honors each attachment feature switch', () => {
    expect(getClipboardAttachmentFiles(data, { image: false, video: true, file: false })).toEqual([video])
  })
})


describe('hasHtmlImage', () => {
  it('detects html-only images that have no original File', () => {
    expect(hasHtmlImage('<p>text</p><img src="https://example.com/a.png">')).toBe(true)
    expect(hasHtmlImage('<p>plain text</p>')).toBe(false)
    expect(hasHtmlImage('')).toBe(false)
  })
})
