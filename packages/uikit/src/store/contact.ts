import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Contact {
  userId: string
  name: string
  avatar?: string
  remark?: string
}

export const useContactStore = defineStore('contact', () => {
  const contactList = ref<Contact[]>([])
  const blackList = ref<Contact[]>([])

  function setContactList(list: Contact[]) {
    contactList.value = list
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

  function clearContacts() {
    contactList.value = []
    blackList.value = []
  }

  return {
    contactList,
    blackList,
    setContactList,
    addContact,
    removeContact,
    updateContactRemark,
    clearContacts,
  }
})
