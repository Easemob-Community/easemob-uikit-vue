import type {
  UiContact,
  UiContactInvite,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef } from './types'

/** 创建联系人 store */
export function createContactStore(handlersRef: HandlersRef): EventStores['contact'] {
  let contactList: UiContact[] = []
  let _blocklist: UiContact[] = []
  let invites: UiContactInvite[] = []
  const loaded = false

  function emitChange() {
    handlersRef()?.onContactChange?.(contactList)
  }

  function emitInviteChange() {
    handlersRef()?.onInviteChange?.(invites)
  }

  return {
    get contactList() {
      return contactList
    },
    get loaded() {
      return loaded
    },

    setList(list) {
      contactList = list
      emitChange()
    },

    addContact(contact) {
      const idx = contactList.findIndex(c => c.userId === contact.userId)
      if (idx >= 0)
        contactList[idx] = { ...contactList[idx], ...contact }
      else
        contactList.push(contact)
      emitChange()
      handlersRef()?.onContactUpdated?.(contact)
    },

    removeContact(userId) {
      const removed = contactList.find(c => c.userId === userId)
      contactList = contactList.filter(c => c.userId !== userId)
      if (removed) {
        emitChange()
        handlersRef()?.onContactUpdated?.(removed)
      }
    },

    updateRemark(userId, remark) {
      const idx = contactList.findIndex(c => c.userId === userId)
      if (idx < 0)
        return
      contactList[idx] = { ...contactList[idx], remark, name: remark || contactList[idx].name }
      emitChange()
      handlersRef()?.onContactUpdated?.(contactList[idx])
    },

    setBlocklist(list) {
      _blocklist = list
    },

    addInvite(invite) {
      const idx = invites.findIndex(i => i.id === invite.id)
      if (idx >= 0)
        invites[idx] = { ...invites[idx], ...invite }
      else
        invites.push(invite)
      emitInviteChange()
    },

    removeInvite(id) {
      invites = invites.filter(i => i.id !== id)
      emitInviteChange()
    },

    updateInviteStatus(id, status) {
      const idx = invites.findIndex(i => i.id === id)
      if (idx < 0)
        return
      invites[idx] = { ...invites[idx], status }
      emitInviteChange()
    },

    getContact(userId) {
      return contactList.find(c => c.userId === userId)
    },

    getInvite(id) {
      return invites.find(i => i.id === id)
    },

    setContactList(list) {
      this.setList(list)
    },

    updateContactRemark(userId, remark) {
      this.updateRemark(userId, remark)
    },
  }
}
