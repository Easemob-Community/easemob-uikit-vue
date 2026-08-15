import type { CustomMessageBody, UiMessage } from '@easemob/uikit-core'
import type { RootStores } from '../sdk/event/types'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '@easemob/uikit-core'

export type LastMessageTextResolver = (message: UiMessage) => string | undefined

/**
 * 自定义消息 event → 会话摘要预览文案映射。
 * 会话列表同步（SDK snippet）与消息驱动（UiMessage）共用同一份映射，
 * 保证自定义消息（如名片 userCard）在会话列表与消息列表的摘要展示一致。
 */
export const customEventPreviewMap: Record<string, string> = {
  userCard: '[名片]',
  order: '[订单]',
  vote: '[投票]',
}

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
 * 根据用户 ID 从联系人 / 用户资料解析显示名。
 * 优先级：联系人备注 > 用户资料昵称。
 * 未命中时返回 undefined，由调用方决定回退策略。
 */
export function resolveUserDisplayName(stores: RootStores, userId: string): string | undefined {
  const contact = stores.contact.getContact(userId)
  if (contact?.remark)
    return contact.remark
  const userInfo = stores.userInfo.getUserInfo(userId)
  if (userInfo?.nickname)
    return userInfo.nickname
  return undefined
}

/**
 * 解析消息发送者的显示名称。
 * 优先级：联系人备注 > 用户资料昵称 > 消息 ext 快照昵称 > ext 快照备注 > userId。
 * 会话列表消息驱动摘要（chat.vue watch）与合并转发摘要（use-chat.ts）共用，
 * 历史消息场景用户资料可能尚未异步加载完成，ext 快照兜底可保证
 * 发送者展示为昵称而非 userId。
 */
export function resolveSenderDisplayName(stores: RootStores, message: UiMessage): string {
  const from = message.from || ''
  // 1. 联系人备注
  const contact = stores.contact.getContact(from)
  if (contact?.remark)
    return contact.remark
  // 2. 用户资料昵称
  const userInfo = stores.userInfo.getUserInfo(from)
  if (userInfo?.nickname)
    return userInfo.nickname
  // 3. 消息 ext 中携带的 UIKit 用户信息快照（历史消息场景的可靠兜底）
  const extInfo = message.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
  if (extInfo?.nickname)
    return extInfo.nickname
  if (extInfo?.remark)
    return extInfo.remark
  // 4. userId 兜底
  return from
}

/**
 * 群聊会话摘要拼接发送者前缀（单聊 / 无发送者 / 空文本不拼）。
 * 会话列表同步（conversation-adapter）与消息驱动（chat.vue watch）
 * 共用同一拼接规则，保证两端摘要展示一致。
 */
export function formatConversationPreview(
  conversationType: UiMessage['conversationType'],
  senderName: string | undefined,
  text: string,
): string {
  if (conversationType === CONVERSATION_TYPE.GROUPCHAT && senderName && text) {
    return `${senderName}: ${text}`
  }
  return text
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
