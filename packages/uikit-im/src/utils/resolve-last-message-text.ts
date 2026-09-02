// 消息摘要 / 显示名解析工具已下沉：
// - formatConversationPreview / defaultLastMessageTextResolver / resolveLastMessageText /
//   LastMessageTextResolver / MessagePreviewLabels / mergeMessagePreviewLabels /
//   defaultMessagePreviewLabels → @easemob/uikit-sdk-contract
// - resolveUserDisplayName / resolveSenderDisplayName → 本文件本地实现，避免依赖具体 adapter
export {
  customEventPreviewMap,
  defaultLastMessageTextResolver,
  defaultMessagePreviewLabels,
  formatConversationPreview,
  mergeMessagePreviewLabels,
  resolveLastMessageText,
} from '@easemob/uikit-sdk-contract'
export type {
  LastMessageTextResolver,
  MessagePreviewLabels,
} from '@easemob/uikit-sdk-contract'

import type { MessagePreviewLabels } from '@easemob/uikit-sdk-contract'

/**
 * 中文消息摘要预览标签（供 UIKit 默认中文 UI 使用）。
 * 业务可在调用 `resolveLastMessageText` 时传入自定义标签以覆盖。
 */
export const chineseMessagePreviewLabels: MessagePreviewLabels = {
  image: '[图片]',
  sticker: '[表情]',
  voice: '[语音]',
  video: '[视频]',
  file: '[文件]',
  location: '[位置]',
  combine: '[聊天记录]',
  custom: {
    userCard: '[名片]',
    order: '[订单]',
    vote: '[投票]',
  },
  customFallback: '[自定义]',
  unknown: '[未知消息]',
}

import type { UiMessage } from '@easemob/uikit-core'
import type { RootStores } from '../sdk/types'

/**
 * 解析用户显示名称。
 * 优先级：联系人备注 > 用户资料昵称 > undefined。
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
 */
export function resolveSenderDisplayName(stores: RootStores, message: UiMessage): string {
  const from = message.from || ''
  const contact = stores.contact.getContact(from)
  if (contact?.remark)
    return contact.remark
  const userInfo = stores.userInfo.getUserInfo(from)
  if (userInfo?.nickname)
    return userInfo.nickname
  const extInfo = message.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
  if (extInfo?.nickname)
    return extInfo.nickname
  if (extInfo?.remark)
    return extInfo.remark
  return from
}
