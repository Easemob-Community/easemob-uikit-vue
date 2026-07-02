import type { ContactEventHandlerMap, ContactRosterEventPayload } from 'easemob-websdk'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'

function toUiInvite(payload: ContactRosterEventPayload, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  const userInfo = payload.userInfo
  return {
    userId: payload.from,
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
      stores.contact.addInvite(toUiInvite(payload, 'pending'))
    },
    onContactAgreed: (payload) => {
      const userId = payload.from
      if (!userId)
        return
      // 若申请列表中存在，更新为已接受；无论是否存在都加入联系人
      if (stores.contact.getInvite(userId)) {
        stores.contact.updateInviteStatus(userId, 'accepted')
      }
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: (payload) => {
      const userId = payload.from
      if (userId && stores.contact.getInvite(userId)) {
        stores.contact.updateInviteStatus(userId, 'declined')
      }
    },
    onContactDeleted: (payload) => {
      const userId = payload.from
      if (userId) {
        stores.contact.removeContact(userId)
        stores.contact.removeInvite(userId)
      }
    },
    onContactAdded: (payload) => {
      const userId = payload.from
      if (!userId)
        return
      stores.contact.addContact({ userId, name: userId })
      stores.contact.removeInvite(userId)
    },
    onContactInfoUpdated: (msg) => {
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
      }
    },
  }
}
