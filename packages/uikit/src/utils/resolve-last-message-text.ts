import type { CustomMessageBody, UiMessage } from '../sdk/types'
import { MESSAGE_TYPE } from '../constants'

export type LastMessageTextResolver = (message: UiMessage) => string | undefined

const defaultCustomPreviewMap: Record<string, string> = {
  userCard: '[名片]',
  order: '[订单]',
  vote: '[投票]',
}

/**
 * 默认 lastMessageText 解析器
 * - 文本消息取 content
 * - 媒体/位置消息取固定文案
 * - custom 消息按 event 取 previewMap 兜底，未命中返回 [自定义消息]
 */
export function defaultLastMessageTextResolver(message: UiMessage): string {
  switch (message.type) {
    case MESSAGE_TYPE.TEXT:
      return (message.body as { content?: string }).content || ''
    case MESSAGE_TYPE.IMAGE:
      return '[图片]'
    case MESSAGE_TYPE.VOICE:
      return '[语音]'
    case MESSAGE_TYPE.VIDEO:
      return '[视频]'
    case MESSAGE_TYPE.FILE:
      return '[文件]'
    case MESSAGE_TYPE.LOCATION:
      return '[位置]'
    case MESSAGE_TYPE.CUSTOM: {
      const event = (message.body as CustomMessageBody).event || ''
      return defaultCustomPreviewMap[event] || '[自定义消息]'
    }
    case MESSAGE_TYPE.COMBINE:
      return '[聊天记录]'
    case 'notice':
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
 */
export function resolveLastMessageText(message: UiMessage, resolver?: LastMessageTextResolver): string {
  if (resolver) {
    const text = resolver(message)
    if (text !== undefined)
      return text
  }
  return defaultLastMessageTextResolver(message)
}
