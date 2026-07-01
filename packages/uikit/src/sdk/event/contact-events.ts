import type { ContactEventHandlerMap } from 'easemob-websdk'
import type { RootStores } from './types'

/**
 * 创建 ContactManager 事件处理器。
 */
export function createContactHandlers(stores: RootStores): ContactEventHandlerMap {
  return {
    onContactInvited: (msg) => {
      console.info('[UIKit] onContactInvited:', msg)
    },
    onContactAgreed: (msg) => {
      const userId = msg.from
      if (!userId) return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: (msg) => {
      console.info('[UIKit] onContactRefuse:', msg)
    },
    onContactDeleted: (msg) => {
      const userId = msg.from
      if (userId) stores.contact.removeContact(userId)
    },
    onContactAdded: (msg) => {
      const userId = msg.from
      if (!userId) return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactInfoUpdated: (msg) => {
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
      }
      console.info('[UIKit] onContactInfoUpdated:', msg)
    },
  }
}
