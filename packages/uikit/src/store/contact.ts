import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Contact {
  userId: string
  name: string
  avatar?: string
  remark?: string
}

export const useContactStore = defineStore('contact', () => {
  const contactList = ref<Contact[]>([])
  const blackList = ref<Contact[]>([])
  /** 好友列表是否已拉取过（幂等标记） */
  const loaded = ref(false)
  /** 黑名单是否已拉取过（幂等标记） */
  const blockListLoaded = ref(false)

  /** 黑名单 ID 集合（高频查询优化） */
  const blackIdSet = computed(() => new Set(blackList.value.map((c) => c.userId)))

  function setContactList(list: Contact[]) {
    contactList.value = list
    loaded.value = true
  }

  function addContact(contact: Contact) {
    const exists = contactList.value.find((c: Contact) => c.userId === contact.userId)
    if (!exists) {
      contactList.value.push(contact)
    }
  }

  function removeContact(userId: string) {
    contactList.value = contactList.value.filter((c: Contact) => c.userId !== userId)
  }

  function updateContactRemark(userId: string, remark: string) {
    const contact = contactList.value.find((c: Contact) => c.userId === userId)
    if (contact) {
      contact.remark = remark
    }
  }

  /** 设置黑名单 */
  function setBlackList(list: Contact[]) {
    blackList.value = list
    blockListLoaded.value = true
  }

  /** 加入黑名单 */
  function addToBlackList(contact: Contact) {
    const exists = blackList.value.find((c) => c.userId === contact.userId)
    if (!exists) blackList.value.push(contact)
  }

  /** 移出黑名单 */
  function removeFromBlackList(userId: string) {
    blackList.value = blackList.value.filter((c) => c.userId !== userId)
  }

  /** 是否被拉黑 */
  function isBlocked(userId: string): boolean {
    return blackIdSet.value.has(userId)
  }

  function clearContacts() {
    contactList.value = []
    blackList.value = []
    loaded.value = false
    blockListLoaded.value = false
  }

  return {
    contactList,
    blackList,
    loaded,
    blockListLoaded,
    blackIdSet,
    setContactList,
    addContact,
    removeContact,
    updateContactRemark,
    setBlackList,
    addToBlackList,
    removeFromBlackList,
    isBlocked,
    clearContacts,
  }
})
