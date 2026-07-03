import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiContact, UiContactInvite } from '../sdk/types'

export const useContactStore = defineStore('contact', () => {
  const contactList = ref<UiContact[]>([])
  const blackList = ref<UiContact[]>([])
  const inviteList = ref<UiContactInvite[]>([])
  const loaded = ref(false)
  const blockListLoaded = ref(false)

  // ===== UI 交互状态 =====
  /** 搜索过滤文本 */
  const filterText = ref('')
  /** 当前激活（单选高亮）的联系人 ID */
  const activeId = ref('')
  /** 多选场景选中的联系人 ID 集合 */
  const selectedIds = ref<Set<string>>(new Set())
  /** 是否还有更多可加载（分页数据源场景） */
  const hasMore = ref(false)
  /** 未加载完整列表时的轻量总数（仅在 loaded 为 false 时生效）；加载后总数恒等于列表长度 */
  const explicitContactCount = ref(0)
  const contactCount = computed(() =>
    loaded.value ? contactList.value.length : explicitContactCount.value,
  )

  const blackIdSet = computed(() => new Set(blackList.value.map(c => c.userId)))

  function setContactList(list: UiContact[]) {
    contactList.value = list
    loaded.value = true
  }

  function appendContactList(list: UiContact[]) {
    const ids = new Set(contactList.value.map(c => c.userId))
    for (const c of list) {
      if (!ids.has(c.userId)) {
        contactList.value.push(c)
        ids.add(c.userId)
      }
    }
  }

  function addContact(contact: UiContact) {
    const exists = contactList.value.find(c => c.userId === contact.userId)
    if (!exists) {
      contactList.value.push(contact)
    }
  }

  function removeContact(userId: string) {
    contactList.value = contactList.value.filter(c => c.userId !== userId)
  }

  function getContact(userId: string): UiContact | undefined {
    return contactList.value.find(c => c.userId === userId)
  }

  function updateContactRemark(userId: string, remark: string) {
    const index = contactList.value.findIndex(c => c.userId === userId)
    if (index >= 0) {
      const contact = contactList.value[index]
      contactList.value[index] = {
        ...contact,
        remark,
        name: remark || contact.name,
      }
    }
  }

  function setBlackList(list: UiContact[]) {
    blackList.value = list
    blockListLoaded.value = true
  }

  function addToBlackList(contact: UiContact) {
    const exists = blackList.value.find(c => c.userId === contact.userId)
    if (!exists)
      blackList.value.push(contact)
  }

  function removeFromBlackList(userId: string) {
    blackList.value = blackList.value.filter(c => c.userId !== userId)
  }

  function isBlocked(userId: string): boolean {
    return blackIdSet.value.has(userId)
  }

  // ===== 好友申请/群组邀请列表 =====
  const pendingCount = computed(() => inviteList.value.filter(i => i.status === 'pending').length)

  function addInvite(invite: UiContactInvite) {
    const index = inviteList.value.findIndex(i => i.id === invite.id)
    if (index >= 0) {
      inviteList.value[index] = { ...inviteList.value[index], ...invite }
    }
    else {
      inviteList.value.unshift(invite)
    }
  }

  function removeInvite(id: string) {
    inviteList.value = inviteList.value.filter(i => i.id !== id)
  }

  function updateInviteStatus(id: string, status: UiContactInvite['status']) {
    const index = inviteList.value.findIndex(i => i.id === id)
    if (index >= 0) {
      inviteList.value[index] = { ...inviteList.value[index], status }
    }
  }

  function getInvite(id: string): UiContactInvite | undefined {
    return inviteList.value.find(i => i.id === id)
  }

  function clearInvites() {
    inviteList.value = []
  }

  // ===== UI 交互状态操作 =====
  function setFilterText(text: string) {
    filterText.value = text
  }

  function setActiveId(id: string) {
    activeId.value = id
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id))
      next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function setSelectedIds(ids: string[]) {
    selectedIds.value = new Set(ids)
  }

  function setHasMore(value: boolean) {
    hasMore.value = value
  }

  function setContactCount(count: number) {
    explicitContactCount.value = count
  }

  function clearContacts() {
    contactList.value = []
    blackList.value = []
    inviteList.value = []
    loaded.value = false
    blockListLoaded.value = false
    filterText.value = ''
    activeId.value = ''
    selectedIds.value = new Set()
    hasMore.value = false
    explicitContactCount.value = 0
  }

  // 别名方法：兼容 Domain 层 ContactStoreLike 接口
  const setList = setContactList
  const updateRemark = updateContactRemark
  const setBlocklist = setBlackList

  return {
    contactList,
    blackList,
    inviteList,
    pendingCount,
    loaded,
    blockListLoaded,
    blackIdSet,
    filterText,
    activeId,
    selectedIds,
    hasMore,
    contactCount,
    setContactList,
    setList,
    appendContactList,
    addContact,
    getContact,
    removeContact,
    updateContactRemark,
    updateRemark,
    setBlackList,
    setBlocklist,
    addToBlackList,
    removeFromBlackList,
    isBlocked,
    addInvite,
    removeInvite,
    updateInviteStatus,
    getInvite,
    clearInvites,
    setFilterText,
    setActiveId,
    isSelected,
    toggleSelect,
    setSelectedIds,
    setHasMore,
    setContactCount,
    clearContacts,
  }
})
