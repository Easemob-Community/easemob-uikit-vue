import type { ChatConversationType } from './types/conversation'
import type { UiMessage } from './types/message'
import {
  CONVERSATION_TYPE,
  MESSAGE_EXT_KEY,
  MESSAGE_TYPE,
} from './constants'

/**
 * 消息摘要预览文案标签集。
 * 通过注入不同语言/业务文案，避免在契约包硬编码特定 locale 的兜底字符串。
 */
export interface MessagePreviewLabels {
  /** 图片消息摘要 */
  image: string
  /** 表情包/GIF 消息摘要 */
  sticker: string
  /** 语音消息摘要 */
  voice: string
  /** 视频消息摘要 */
  video: string
  /** 文件消息摘要 */
  file: string
  /** 位置消息摘要 */
  location: string
  /** 合并转发消息摘要 */
  combine: string
  /** 自定义消息 event → 摘要映射 */
  custom: Record<string, string>
  /** 自定义消息未命中时的兜底摘要 */
  customFallback: string
  /** 未知消息类型兜底摘要 */
  unknown: string
}

/**
 * 默认英文摘要标签。
 * 业务侧可传入部分字段覆盖；未覆盖字段使用本默认值。
 */
export const defaultMessagePreviewLabels: MessagePreviewLabels = {
  image: '[Image]',
  sticker: '[Sticker]',
  voice: '[Voice]',
  video: '[Video]',
  file: '[File]',
  location: '[Location]',
  combine: '[Chat History]',
  custom: {},
  customFallback: '[Custom]',
  unknown: '[Unknown]',
}

/**
 * 合并业务传入的部分标签与默认标签。
 */
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

/**
 * 群聊会话摘要拼接发送者前缀（单聊 / 无发送者 / 空文本不拼）。
 * 会话列表同步（conversation-adapter）与消息驱动共用同一拼接规则，
 * 保证两端摘要展示一致。
 */
export function formatConversationPreview(
  conversationType: ChatConversationType,
  senderName: string | undefined,
  text: string,
): string {
  if (conversationType === CONVERSATION_TYPE.GROUPCHAT && senderName && text) {
    return `${senderName}: ${text}`
  }
  return text
}

/** 消息摘要自定义解析器：返回 undefined 时回落到默认解析 */
export type LastMessageTextResolver = (message: UiMessage) => string | undefined

/**
 * 默认 lastMessageText 解析器
 * - 文本消息取 content
 * - 媒体/位置消息取 labels 中的固定文案
 * - custom 消息按 event 取 labels.custom 兜底，未命中返回 labels.customFallback
 */
export function defaultLastMessageTextResolver(
  message: UiMessage,
  labels?: Partial<MessagePreviewLabels>,
): string {
  const l = mergeMessagePreviewLabels(labels)
  switch (message.type) {
    case MESSAGE_TYPE.TEXT:
      return (message.body as { content?: string }).content || ''
    case MESSAGE_TYPE.IMAGE:
      // 表情包（sticker/GIF，ext.isSticker 标记）按表情摘要，与普通图片区分
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
    case MESSAGE_TYPE.NOTICE:
      // 本地系统通知不进入会话列表摘要，避免本地-only 状态误导多设备预览
      return ''
    default:
      return l.unknown
  }
}

/**
 * 解析单条消息的会话预览文案
 * @param message 目标消息
 * @param resolver 业务自定义解析器，返回 undefined 时走默认解析
 * @param senderName 发送者显示名：群聊场景由调用方传入，用于拼接 "发送者: 消息" 前缀
 * @param recalledText 已撤回消息的预览文案；传入时优先用于 recalled 消息
 * @param labels 摘要文案标签集；不传使用默认英文标签
 */
export function resolveLastMessageText(
  message: UiMessage,
  resolver?: LastMessageTextResolver,
  senderName?: string,
  recalledText?: string,
  labels?: Partial<MessagePreviewLabels>,
): string {
  // 已撤回消息统一展示召回状态，避免会话列表仍显示原消息摘要
  if (message.recalled && recalledText) {
    return formatConversationPreview(message.conversationType, senderName, recalledText)
  }
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
