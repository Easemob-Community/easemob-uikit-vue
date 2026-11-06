import type { ContactRepository } from '@easemob-community/uikit-sdk-contract'
import type { ContactDomain } from '../../domain/contact-domain'

export function createContactRepository(domain: ContactDomain): ContactRepository {
  const contactDomain = domain
  return {
    // 经 domain.fetchContacts 读取：注入 contact.fetchContacts 时由 domain 委托覆盖；
    // 未注入时 domain 内部先 syncFromServer 再返回快照（4.x 无本地 roster 缓存）
    fetchContacts: async (cursor, pageSize) => contactDomain.fetchContacts(cursor, pageSize),

    fetchBlocklist: async () => contactDomain.syncBlocklist(),

    addContact: async (userId, message) => {
      await contactDomain.addContact(userId, message)
    },

    deleteContact: async (userId) => {
      await contactDomain.deleteContact(userId)
    },

    setRemark: async (userId, remark) => {
      await contactDomain.setRemark(userId, remark)
    },

    addToBlocklist: async (userIds) => {
      await contactDomain.addToBlocklist(userIds)
    },

    removeFromBlocklist: async (userIds) => {
      await contactDomain.removeFromBlocklist(userIds)
    },
  }
}
