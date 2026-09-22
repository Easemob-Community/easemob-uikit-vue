import type { UiMessage } from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from './types'

/**
 * 根据用户 ID 从联系人 / 用户资料解析显示名。
 * 优先级：联系人备注 > 用户资料昵称。
 * 未命中时返回 undefined，由调用方决定回退策略。
 */
export function resolveUserDisplayName(stores: EventStores, userId: string): string | undefined {
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
export function resolveSenderDisplayName(stores: EventStores, message: UiMessage): string {
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
