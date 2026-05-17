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
  /** 是否还有下一页 */
  const hasMore = ref(false)
  /** 分页游标 */
  const cursor = ref<string>('')
  /** 好友总数（由 getAllContacts 轻量接口提供） */
  const contactCount = ref<number>(0)

  /** 黑名单 ID 集合（高频查询优化） */
  const blackIdSet = computed(() => new Set(blackList.value.map((c) => c.userId)))

  function setContactList(list: Contact[]) {
    contactList.value = list
    loaded.value = true
  }

  function appendContactList(list: Contact[]) {
    const ids = new Set(contactList.value.map((c) => c.userId))
    for (const c of list) {
      if (!ids.has(c.userId)) {
        contactList.value.push(c)
        ids.add(c.userId)
      }
    }
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

  function setHasMore(value: boolean) {
    hasMore.value = value
  }

  function setCursor(value: string) {
    cursor.value = value
  }

  function setContactCount(count: number) {
    contactCount.value = count
  }

  function clearContacts() {
    contactList.value = []
    blackList.value = []
    loaded.value = false
    blockListLoaded.value = false
    hasMore.value = false
    cursor.value = ''
    contactCount.value = 0
  }

  return {
    contactList,
    blackList,
    loaded,
    blockListLoaded,
    hasMore,
    cursor,
    contactCount,
    blackIdSet,
    setContactList,
    appendContactList,
    addContact,
    removeContact,
    updateContactRemark,
    setBlackList,
    addToBlackList,
    removeFromBlackList,
    isBlocked,
    setHasMore,
    setCursor,
    setContactCount,
    clearContacts,
  }
})
