import type { EasemobChat } from 'easemob-websdk'
import { CONVERSATION_TYPE, NOTICE_EVENT_TYPE, createLogger } from '@easemob/uikit-sdk-contract'
import type { UiContactInvite } from '@easemob/uikit-sdk-contract'
import { getEventHandlerDeps } from './deps'
import type { EventStores } from './types'

const contactLog = createLogger('UIKit:Webim4ContactEvents')

/**
 * 4.x 联系人事件负载 → 中立好友申请。
 * ContactMsgBody：`type: 'subscribe'|'unsubscribed'|'subscribed'`、`from`（申请人）、
 * `status`（申请附言）。4.x payload 不含用户资料，昵称/头像留空由 UI 层资料链路补。
 */
function toUiInvite(msg: EasemobChat.ContactMsgBody, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  const userId = msg.from
  return {
    id: userId,
    type: 'contact',
    userId,
    reason: msg.status,
    status,
    timestamp: Date.now(),
  }
}

/**
 * 创建 4.x 联系人事件处理器（store 语义对齐 websdk5 contact-events）。
 * 4.x 所有事件挂单一 `connection.addEventHandler`，返回 Partial 由 registry 合并注册。
 *
 * 4.24.2 联系人事件全集（EventHandlerType）：
 * onContactInvited（收到好友申请）/ onContactAgreed（申请被同意）/
 * onContactRefuse（申请被拒绝，注意 4.x 无 onContactRefused）/
 * onContactDeleted（好友关系被删除）/ onContactAdded（好友关系建立）。
 * `onContactChange` 已 deprecated，不接入；4.x 无 onContactBlockStatus / onContactInfoUpdated。
 */
export function createContactHandlers(stores: EventStores): Partial<EasemobChat.EventHandlerType> {
  const { t, insertChatNotice } = getEventHandlerDeps()
  return {
    onContactInvited: (msg) => {
      contactLog.info('onContactInvited', { from: msg.from })
      const userId = msg.from
      if (!userId)
        return
      const alreadyContact = stores.contact.getContact(userId)
      stores.contact.addInvite(toUiInvite(msg, alreadyContact ? 'accepted' : 'pending'))
    },
    onContactAgreed: (msg) => {
      contactLog.info('onContactAgreed', { from: msg.from })
      const userId = msg.from
      if (!userId)
        return
      if (stores.contact.getInvite(userId)) {
        stores.contact.updateInviteStatus(userId, 'accepted')
      }
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: (msg) => {
      contactLog.info('onContactRefuse', { from: msg.from })
      const userId = msg.from
      if (userId && stores.contact.getInvite(userId)) {
        stores.contact.updateInviteStatus(userId, 'declined')
      }
    },
    onContactDeleted: (msg) => {
      contactLog.info('onContactDeleted', { from: msg.from })
      const userId = msg.from
      if (!userId)
        return
      stores.contact.removeContact(userId)
      stores.contact.removeInvite(userId)
      // 在单聊会话中插入好友关系删除通知
      insertChatNotice(stores, userId, CONVERSATION_TYPE.SINGLECHAT, {
        eventType: NOTICE_EVENT_TYPE.CONTACT_DELETED,
        params: {},
        defaultText: t('chat.notice.contactDeleted'),
      })
    },
    onContactAdded: (msg) => {
      contactLog.info('onContactAdded', { from: msg.from })
      const userId = msg.from
      if (!userId)
        return
      stores.contact.addContact({ userId, name: userId })
      stores.contact.removeInvite(userId)
      // 在单聊会话中插入好友关系建立通知
      insertChatNotice(stores, userId, CONVERSATION_TYPE.SINGLECHAT, {
        eventType: NOTICE_EVENT_TYPE.CONTACT_ADDED,
        params: {},
        defaultText: t('chat.notice.contactAdded'),
      })
    },
  }
}
