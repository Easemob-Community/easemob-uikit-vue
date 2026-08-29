import type { ChatConversationType } from './types/message'
import type { UiMessage } from './types/message'
import {
  CONVERSATION_TYPE,
  MESSAGE_EXT_KEY,
  MESSAGE_TYPE,
} from './constants'

/**
 * 自定义消息 event → 会话摘要预览文案映射（中立，与 locale 无关的硬编码兜底）。
 * 会话列表同步（SDK snippet）与消息驱动（UiMessage）共用同一份映射，
 * 保证自定义消息（如名片 userCard）在会话列表与消息列表的摘要展示一致。
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
 * - 媒体/位置消息取固定文案
 * - custom 消息按 event 取 previewMap 兜底，未命中返回 [自定义]
 */
export function defaultLastMessageTextResolver(message: UiMessage): string {
  switch (message.type) {
    case MESSAGE_TYPE.TEXT:
      return (message.body as { content?: string }).content || ''
    case MESSAGE_TYPE.IMAGE:
      // 表情包（sticker/GIF，ext.isSticker 标记）按表情摘要，与普通图片区分
      return message.ext?.[MESSAGE_EXT_KEY.IS_STICKER] === true ? '[表情]' : '[图片]'
    case MESSAGE_TYPE.VOICE:
      return '[语音]'
    case MESSAGE_TYPE.VIDEO:
      return '[视频]'
    case MESSAGE_TYPE.FILE:
      return '[文件]'
    case MESSAGE_TYPE.LOCATION:
      return '[位置]'
    case MESSAGE_TYPE.CUSTOM: {
      const event = (message.body as { event?: string }).event || ''
      return customEventPreviewMap[event] || '[自定义]'
    }
    case MESSAGE_TYPE.COMBINE:
      return '[聊天记录]'
    case MESSAGE_TYPE.NOTICE:
      // 本地系统通知不进入会话列表摘要，避免本地-only 状态误导多设备预览
      return ''
    default:
      return '[未知消息]'
  }
}

/**
 * 解析单条消息的会话预览文案
 * @param message 目标消息
 * @param resolver 业务自定义解析器，返回 undefined 时走默认解析
 * @param senderName 发送者显示名：群聊场景由调用方传入，用于拼接 "发送者: 消息" 前缀
 * @param recalledText 已撤回消息的预览文案；传入时优先用于 recalled 消息
 */
export function resolveLastMessageText(
  message: UiMessage,
  resolver?: LastMessageTextResolver,
  senderName?: string,
  recalledText?: string,
): string {
  // 已撤回消息统一展示召回状态，避免会话列表仍显示原消息摘要
  if (message.recalled && recalledText) {
    return formatConversationPreview(message.conversationType, senderName, recalledText)
  }
  let text: string
  if (resolver) {
    const resolved = resolver(message)
    text = resolved !== undefined ? resolved : defaultLastMessageTextResolver(message)
  }
  else {
    text = defaultLastMessageTextResolver(message)
  }
  return formatConversationPreview(message.conversationType, senderName, text)
}
