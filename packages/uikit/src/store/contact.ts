import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UiContact } from '../sdk/types'

export const useContactStore = defineStore('contact', () => {
  const contactList = ref<UiContact[]>([])
  const blackList = ref<UiContact[]>([])
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
  /** 好友总数（可与列表长度不一致，如仅拉取了计数） */
  const contactCount = ref(0)

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

  function updateContactRemark(userId: string, remark: string) {
    const contact = contactList.value.find(c => c.userId === userId)
    if (contact) {
      contact.remark = remark
      contact.name = remark || contact.name
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
    contactCount.value = count
  }

  function clearContacts() {
    contactList.value = []
    blackList.value = []
    loaded.value = false
    blockListLoaded.value = false
    filterText.value = ''
    activeId.value = ''
    selectedIds.value = new Set()
    hasMore.value = false
    contactCount.value = 0
  }

  // 别名方法：兼容 Domain 层 ContactStoreLike 接口
  const setList = setContactList
  const updateRemark = updateContactRemark
  const setBlocklist = setBlackList

  return {
    contactList,
    blackList,
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
    removeContact,
    updateContactRemark,
    updateRemark,
    setBlackList,
    setBlocklist,
    addToBlackList,
    removeFromBlackList,
    isBlocked,
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
