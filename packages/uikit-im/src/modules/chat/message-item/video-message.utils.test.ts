import { describe, expect, it } from 'vitest'
import { resolveVideoPlaybackUrl } from './video-message.utils'

describe('resolveVideoPlaybackUrl', () => {
  it('adds redirect and original file parameters to a URL without a query string', () => {
    expect(resolveVideoPlaybackUrl('https://example.com/video'))
      .toBe('https://example.com/video?em-redirect=true&origin-file=true')
  })

  it('adds only the original file parameter to a URL with a query string', () => {
    expect(resolveVideoPlaybackUrl('https://example.com/video?share-secret=abc'))
      .toBe('https://example.com/video?share-secret=abc&origin-file=true')
  })

  it('does not add the redirect parameter again when it already exists', () => {
    expect(resolveVideoPlaybackUrl('https://example.com/video?em-redirect=true&share-secret=abc'))
      .toBe('https://example.com/video?em-redirect=true&share-secret=abc&origin-file=true')
  })
})
