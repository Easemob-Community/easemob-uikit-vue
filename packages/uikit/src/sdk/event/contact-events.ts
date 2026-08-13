import type { ContactEventHandlerMap, ContactRosterEventPayload } from 'easemob-websdk'
import { CONVERSATION_TYPE, NOTICE_EVENT_TYPE } from '../../constants'
import { t } from '../../locale'
import { createLogger } from '../../utils/logger'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'
import { insertChatNotice } from './notice-utils'

const contactLog = createLogger('UIKit:ContactEvents')

function toUiInvite(payload: ContactRosterEventPayload, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  const userInfo = payload.userInfo
  const userId = payload.from
  return {
    id: userId,
    type: 'contact',
    userId,
    nickname: userInfo?.nickname,
    avatarUrl: userInfo?.avatarUrl,
    // 0.16.0 起 payload.status 重命名为 payload.message
    reason: payload.message,
    status,
    timestamp: Date.now(),
  }
}

/**
 * 创建 ContactManager 事件处理器。
 */
export function createContactHandlers(stores: RootStores): ContactEventHandlerMap {
  return {
    onContactInvited: (payload) => {
      contactLog.info('onContactInvited', { from: payload.from })
      const userId = payload.from
      const alreadyContact = userId ? stores.contact.getContact(userId) : undefined
      stores.contact.addInvite(toUiInvite(payload, alreadyContact ? 'accepted' : 'pending'))
    },
    onContactAgreed: (payload) => {
      contactLog.info('onContactAgreed', { from: payload.from })
      const userId = payload.from
      if (!userId)
        return
      const invite = stores.contact.getInvite(userId)
      if (invite) {
        stores.contact.updateInviteStatus(userId, 'accepted')
      }
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: (payload) => {
      contactLog.info('onContactRefuse', { from: payload.from })
      const userId = payload.from
      if (userId && stores.contact.getInvite(userId)) {
        stores.contact.updateInviteStatus(userId, 'declined')
      }
    },
    onContactDeleted: (payload) => {
      contactLog.info('onContactDeleted', { from: payload.from })
      const userId = payload.from
      if (userId) {
        stores.contact.removeContact(userId)
        stores.contact.removeInvite(userId)
        // 在单聊会话中插入好友关系删除通知
        insertChatNotice(stores, userId, CONVERSATION_TYPE.SINGLECHAT, {
          eventType: NOTICE_EVENT_TYPE.CONTACT_DELETED,
          params: {},
          defaultText: t('chat.notice.contactDeleted'),
        })
      }
    },
    onContactAdded: (payload) => {
      contactLog.info('onContactAdded', { from: payload.from })
      const userId = payload.from
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
    onContactInfoUpdated: (msg) => {
      contactLog.info('onContactInfoUpdated', { userId: msg.contact?.userId })
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
        // 跨端同步备注变更时，同步刷新会话列表显示名称
        const name = contact.remark || msg.userInfo?.nickname || contact.userId
        stores.conversation.updateConversation(contact.userId, { name })
      }
    },
  }
}
