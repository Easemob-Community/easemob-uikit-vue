import type { ContactEventHandlerMap } from 'easemob-websdk'
import type { RootStores } from './types'

/**
 * 创建 ContactManager 事件处理器。
 */
export function createContactHandlers(stores: RootStores): ContactEventHandlerMap {
  return {
    onContactInvited: () => {
      // 好友申请通知：UIKit 暂不维护申请列表，交由业务层监听处理
    },
    onContactAgreed: (msg) => {
      const userId = msg.from
      if (!userId)
        return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactRefuse: () => {
      // 好友申请被拒：UIKit 暂不维护申请列表，交由业务层监听处理
    },
    onContactDeleted: (msg) => {
      const userId = msg.from
      if (userId)
        stores.contact.removeContact(userId)
    },
    onContactAdded: (msg) => {
      const userId = msg.from
      if (!userId)
        return
      stores.contact.addContact({ userId, name: userId })
    },
    onContactInfoUpdated: (msg) => {
      const contact = msg.contact
      if (contact?.userId && contact.remark !== undefined) {
        stores.contact.updateContactRemark(contact.userId, contact.remark)
      }
    },
  }
}
