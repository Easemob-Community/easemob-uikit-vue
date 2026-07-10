import type { ContactEventHandlerMap, ContactRosterEventPayload } from 'easemob-websdk'
import { createLogger } from '../../utils/logger'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'

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
    reason: payload.status,
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
      }
    },
    onContactAdded: (payload) => {
      contactLog.info('onContactAdded', { from: payload.from })
      const userId = payload.from
      if (!userId)
        return
      stores.contact.addContact({ userId, name: userId })
      stores.contact.removeInvite(userId)
    },
    onContactInfoUpdated: (msg) => {
      contactLog.info('onContactInfoUpdated', { userId: msg.contact?.userId })
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
      }
    },
  }
}
