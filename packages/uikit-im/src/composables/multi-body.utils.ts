import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBody, MultiBodySegmentInput, UiMessage } from '@easemob-community/uikit-core'

function remoteUrl(value: string | undefined): string | undefined {
  return value && /^https?:\/\//i.test(value) ? value : undefined
}

/** 构造 beforeSend 使用的中立消息预览，不带本地 File 或 blob 地址。 */
export function toMultiBodyPreview(bodies: readonly MultiBodySegmentInput[]): MultiBody {
  return bodies.map((segment) => {
    switch (segment.type) {
      case MESSAGE_TYPE.TEXT:
      case MESSAGE_TYPE.LOCATION:
      case MESSAGE_TYPE.CUSTOM:
        return { ...segment }
      case MESSAGE_TYPE.IMAGE: {
        const { data: _data, originalUrl, ...rest } = segment
        return {
          ...rest,
          localUrl: '',
          originalImageUrl: originalUrl,
          isGif: segment.isGif ?? false,
          isOriginalImage: segment.isOriginalImage ?? false,
        }
      }
      case MESSAGE_TYPE.FILE:
      case MESSAGE_TYPE.VOICE:
      case MESSAGE_TYPE.VIDEO: {
        const { data: _data, originalUrl, ...rest } = segment
        return { ...rest, url: originalUrl }
      }
    }
  })
}

/** 将收到的复合消息映射为转发输入；任一段没有可用远端地址时整体失败。 */
export function toMultiBodyInputs(message: UiMessage): MultiBodySegmentInput[] {
  if (message.type !== MESSAGE_TYPE.MULTI_BODY || !Array.isArray(message.body))
    throw new Error('MULTI_BODY_FORWARD_UNAVAILABLE')

  return message.body.map((segment) => {
    switch (segment.type) {
      case MESSAGE_TYPE.TEXT:
      case MESSAGE_TYPE.LOCATION:
      case MESSAGE_TYPE.CUSTOM:
        return { ...segment }
      case MESSAGE_TYPE.IMAGE: {
        const { localUrl: _localUrl, originalImageUrl, bigImageUrl, thumbnailUrl, ...rest } = segment
        const originalUrl = remoteUrl(originalImageUrl) || remoteUrl(bigImageUrl) || remoteUrl(thumbnailUrl)
        if (!originalUrl)
          throw new Error('MULTI_BODY_FORWARD_UNAVAILABLE')
        return { ...rest, originalUrl, thumbnailUrl: remoteUrl(thumbnailUrl) }
      }
      case MESSAGE_TYPE.FILE:
      case MESSAGE_TYPE.VOICE:
      case MESSAGE_TYPE.VIDEO: {
        const { url, ...rest } = segment
        const originalUrl = remoteUrl(url)
        if (!originalUrl)
          throw new Error('MULTI_BODY_FORWARD_UNAVAILABLE')
        return { ...rest, originalUrl }
      }
    }
  })
}

const MULTI_BODY_CLIPBOARD_ATTRIBUTE = 'data-easemob-multi-body'

function isRichClipboardSegment(segment: MultiBodySegmentInput): boolean {
  return segment.type === MESSAGE_TYPE.TEXT
    || segment.type === MESSAGE_TYPE.IMAGE
    || segment.type === MESSAGE_TYPE.FILE
    || segment.type === MESSAGE_TYPE.VIDEO
}

function escapeClipboardHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeClipboardHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function createMultiBodyClipboardData(message: UiMessage): { text: string, html: string } | null {
  if (message.type !== MESSAGE_TYPE.MULTI_BODY || !Array.isArray(message.body))
    return null
  const text = message.body
    .filter(segment => segment.type === MESSAGE_TYPE.TEXT)
    .map(segment => segment.content)
    .join('\n')
  if (!text)
    return null

  let segments: MultiBodySegmentInput[]
  try {
    segments = toMultiBodyInputs(message)
  }
  catch {
    return { text, html: '' }
  }
  if (!segments.every(isRichClipboardSegment))
    return { text, html: '' }

  const payload = escapeClipboardHtml(JSON.stringify({ version: 1, segments }))
  const visibleText = escapeClipboardHtml(text).replace(/\n/g, '<br>')
  return {
    text,
    html: `<div ${MULTI_BODY_CLIPBOARD_ATTRIBUTE}="${payload}"></div><p>${visibleText}</p>`,
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseRichClipboardSegment(value: unknown): MultiBodySegmentInput | null {
  if (!value || typeof value !== 'object')
    return null
  const segment = value as Record<string, unknown>
  if (segment.type === MESSAGE_TYPE.TEXT && typeof segment.content === 'string')
    return { type: MESSAGE_TYPE.TEXT, content: segment.content }

  const originalUrl = optionalString(segment.originalUrl)
  if (!originalUrl)
    return null
  const base = {
    originalUrl,
    filename: optionalString(segment.filename),
    filetype: optionalString(segment.filetype),
    fileLength: optionalNumber(segment.fileLength),
  }
  if (segment.type === MESSAGE_TYPE.IMAGE) {
    return {
      ...base,
      type: MESSAGE_TYPE.IMAGE,
      width: optionalNumber(segment.width),
      height: optionalNumber(segment.height),
      isGif: segment.isGif === true,
      isOriginalImage: segment.isOriginalImage === true,
      thumbnailUrl: optionalString(segment.thumbnailUrl),
    }
  }
  if (segment.type === MESSAGE_TYPE.FILE) {
    return { ...base, type: MESSAGE_TYPE.FILE, fileSize: optionalNumber(segment.fileSize) }
  }
  if (segment.type === MESSAGE_TYPE.VIDEO) {
    const duration = optionalNumber(segment.duration)
    if (duration === undefined)
      return null
    return {
      ...base,
      type: MESSAGE_TYPE.VIDEO,
      duration,
      width: optionalNumber(segment.width),
      height: optionalNumber(segment.height),
      thumbnailUrl: optionalString(segment.thumbnailUrl),
    }
  }
  return null
}

export function parseMultiBodyClipboardHtml(html: string): MultiBodySegmentInput[] | null {
  const match = html.match(/data-easemob-multi-body="([^"]*)"/)
  if (!match)
    return null
  try {
    const payload = JSON.parse(decodeClipboardHtml(match[1]!)) as { version?: number, segments?: unknown }
    if (payload.version !== 1 || !Array.isArray(payload.segments) || payload.segments.length === 0)
      return null
    const segments = payload.segments.map(parseRichClipboardSegment)
    return segments.every((segment): segment is MultiBodySegmentInput => segment !== null) ? segments : null
  }
  catch {
    return null
  }
}
