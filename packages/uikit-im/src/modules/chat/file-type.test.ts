import { describe, expect, it } from 'vitest'
import { resolveFileType } from './file-type'

describe('resolveFileType', () => {
  it.each([
    ['pdf', 'file/pdf', ['pdf']],
    ['xls', 'file/xls', ['xls', 'xlsx', 'csv', 'et']],
    ['doc', 'doc', ['doc', 'docx', 'txt', 'rtf', 'wps']],
    ['ppt', 'file/ppt', ['ppt', 'pptx', 'dps']],
    ['md', 'file/md', ['md', 'markdown']],
    ['img', 'file/img', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic']],
    ['video', 'file/video', ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv']],
    ['audio', 'file/audio', ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma']],
  ] as const)('resolves %s files with the message bubble icon', (key, icon, extensions) => {
    for (const extension of extensions)
      expect(resolveFileType(`example.${extension}`)).toEqual({ key, icon })
  })

  it('matches extensions case-insensitively', () => {
    expect(resolveFileType('REPORT.PDF')).toEqual({ key: 'pdf', icon: 'file/pdf' })
  })

  it.each(['README', 'archive.zip'])('falls back to the generic file icon for %s', (fileName) => {
    expect(resolveFileType(fileName)).toEqual({ key: 'file', icon: 'file/empty' })
  })

  it('uses the video fallback when a video has no recognized extension', () => {
    expect(resolveFileType('video', 'video')).toEqual({ key: 'video', icon: 'file/video' })
  })
})
