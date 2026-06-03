import type { EventPayloadMap } from 'im-sdk-web'
import type { RootStores } from './index'

/**
 * 创建好友事件处理器
 */
export function createContactHandler(stores: RootStores) {
  const handler = {
    onContactInvited: (msg: EventPayloadMap['onContactInvited']) => {
      console.info('[UIKit] onContactInvited:', msg)
    },
    onContactAgreed: (msg: EventPayloadMap['onContactAgreed']) => {
      const userId = msg.from
      if (!userId) return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: (msg: EventPayloadMap['onContactRefuse']) => {
      console.info('[UIKit] onContactRefuse:', msg)
    },
    onContactDeleted: (msg: EventPayloadMap['onContactDeleted']) => {
      const userId = msg.from
      if (userId) stores.contact.removeContact(userId)
    },
    onContactAdded: (msg: EventPayloadMap['onContactAdded']) => {
      const userId = msg.from
      if (!userId) return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactInfoUpdated: (msg: EventPayloadMap['onContactInfoUpdated']) => {
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
      }
      console.info('[UIKit] onContactInfoUpdated:', msg)
    },
    onContactSyncStart: () => {
      console.log('[UIKit] Contact sync started')
    },
    onContactSyncFinish: (payload: EventPayloadMap['onContactSyncFinish']) => {
      console.log('[UIKit] Contact sync finished', payload)
    },
  }

  return handler
}

