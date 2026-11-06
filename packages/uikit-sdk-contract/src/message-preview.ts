import type { ChatConversationType } from './types/conversation'
import type { MultiBodySegment, UiMessage } from './types/message'
import {
  CONVERSATION_TYPE,
  MESSAGE_EXT_KEY,
  MESSAGE_TYPE,
} from './constants'

/** 消息摘要预览文案标签集。通过注入不同语言/业务文案，避免在契约包硬编码特定 locale 的兜底字符串。 */
export interface MessagePreviewLabels {
  image: string
  sticker: string
  voice: string
  video: string
  file: string
  location: string
  combine: string
  /** 复合消息无可用摘要时的兜底；缺省使用内置标签 */
  multiBody?: string
  /** 复合消息首段后的附加后缀，可包含 {count} 插值；缺省使用内置标签 */
  multiBodyMore?: string
  custom: Record<string, string>
  customFallback: string
  unknown: string
}

export const defaultMessagePreviewLabels: MessagePreviewLabels = {
  image: '[Image]',
  sticker: '[Sticker]',
  voice: '[Voice]',
  video: '[Video]',
  file: '[File]',
  location: '[Location]',
  combine: '[Chat History]',
  multiBody: '[Composite Message]',
  multiBodyMore: '...',
  custom: {},
  customFallback: '[Custom]',
  unknown: '[Unknown]',
}

export function mergeMessagePreviewLabels(
  labels?: Partial<MessagePreviewLabels>,
): MessagePreviewLabels {
  return {
    image: labels?.image ?? defaultMessagePreviewLabels.image,
    sticker: labels?.sticker ?? defaultMessagePreviewLabels.sticker,
    voice: labels?.voice ?? defaultMessagePreviewLabels.voice,
    video: labels?.video ?? defaultMessagePreviewLabels.video,
    file: labels?.file ?? defaultMessagePreviewLabels.file,
    location: labels?.location ?? defaultMessagePreviewLabels.location,
    combine: labels?.combine ?? defaultMessagePreviewLabels.combine,
    multiBody: labels?.multiBody ?? defaultMessagePreviewLabels.multiBody,
    multiBodyMore: labels?.multiBodyMore ?? defaultMessagePreviewLabels.multiBodyMore,
    custom: { ...defaultMessagePreviewLabels.custom, ...labels?.custom },
    customFallback: labels?.customFallback ?? defaultMessagePreviewLabels.customFallback,
    unknown: labels?.unknown ?? defaultMessagePreviewLabels.unknown,
  }
}

/**
 * 自定义消息 event → 会话摘要预览文案映射（中文兜底，向后兼容）。
 * @deprecated 请使用 `MessagePreviewLabels` 注入业务/语言特定的文案；本映射将在后续大版本移除。
 */
export const customEventPreviewMap: Record<string, string> = {
  userCard: '[名片]',
  order: '[订单]',
  vote: '[投票]',
}

export function formatConversationPreview(
  conversationType: ChatConversationType,
  senderName: string | undefined,
  text: string,
): string {
  if (conversationType === CONVERSATION_TYPE.GROUPCHAT && senderName && text)
    return `${senderName}: ${text}`
  return text
}

export type LastMessageTextResolver = (message: UiMessage) => string | undefined

function resolveSegmentPreview(segment: MultiBodySegment, message: UiMessage, labels: MessagePreviewLabels): string {
  switch (segment.type) {
    case MESSAGE_TYPE.TEXT:
      return segment.content || ''
    case MESSAGE_TYPE.IMAGE:
      return message.ext?.[MESSAGE_EXT_KEY.IS_STICKER] === true ? labels.sticker : labels.image
    case MESSAGE_TYPE.VOICE:
      return labels.voice
    case MESSAGE_TYPE.VIDEO:
      return labels.video
    case MESSAGE_TYPE.FILE:
      return segment.filename || labels.file
    case MESSAGE_TYPE.LOCATION:
      return labels.location
    case MESSAGE_TYPE.CUSTOM:
      return labels.custom[segment.event] ?? labels.customFallback
  }
}

/** 复合消息统一摘要：首段摘要 + 配置后缀；无可用首段摘要时使用复合消息兜底。 */
export function resolveMultiBodyPreview(
  message: UiMessage,
  labels?: Partial<MessagePreviewLabels>,
): string {
  const l = mergeMessagePreviewLabels(labels)
  const fallback = l.multiBody ?? defaultMessagePreviewLabels.multiBody!
  if (message.type !== MESSAGE_TYPE.MULTI_BODY || !Array.isArray(message.body) || message.body.length === 0)
    return fallback
  const first = resolveSegmentPreview(message.body[0]!, message, l)
  if (!first)
    return fallback
  const moreTemplate = l.multiBodyMore ?? defaultMessagePreviewLabels.multiBodyMore!
  const more = moreTemplate.replace('{count}', String(message.body.length))
  return `${first} ${more}`.trim()
}

export function defaultLastMessageTextResolver(
  message: UiMessage,
  labels?: Partial<MessagePreviewLabels>,
): string {
  const l = mergeMessagePreviewLabels(labels)
  switch (message.type) {
    case MESSAGE_TYPE.TEXT:
      return (message.body as { content?: string }).content || ''
    case MESSAGE_TYPE.IMAGE:
      return message.ext?.[MESSAGE_EXT_KEY.IS_STICKER] === true ? l.sticker : l.image
    case MESSAGE_TYPE.VOICE:
      return l.voice
    case MESSAGE_TYPE.VIDEO:
      return l.video
    case MESSAGE_TYPE.FILE:
      return l.file
    case MESSAGE_TYPE.LOCATION:
      return l.location
    case MESSAGE_TYPE.CUSTOM: {
      const event = (message.body as { event?: string }).event || ''
      return l.custom[event] ?? l.customFallback
    }
    case MESSAGE_TYPE.COMBINE:
      return l.combine
    case MESSAGE_TYPE.MULTI_BODY:
      return resolveMultiBodyPreview(message, l)
    case MESSAGE_TYPE.NOTICE:
      return ''
    default:
      return l.unknown
  }
}

export function resolveLastMessageText(
  message: UiMessage,
  resolver?: LastMessageTextResolver,
  senderName?: string,
  recalledText?: string,
  labels?: Partial<MessagePreviewLabels>,
): string {
  if (message.recalled && recalledText)
    return formatConversationPreview(message.conversationType, senderName, recalledText)
  let text: string
  if (resolver) {
    const resolved = resolver(message)
    text = resolved !== undefined ? resolved : defaultLastMessageTextResolver(message, labels)
  }
  else {
    text = defaultLastMessageTextResolver(message, labels)
  }
  return formatConversationPreview(message.conversationType, senderName, text)
}
