import { computed, ref } from 'vue'
import { useContactStore } from '../store/contact'
import type { Contact } from '../store/contact'
import { useUIKit } from './use-uikit'

/**
 * 列表 UI 状态：当前激活项 / 多选集合 / 搜索词
 *
 * 数据本身仍然由 Pinia store 管理，这里只承载视图层的临时状态，
 * 在 contact-list / contact-item 子组件之间共享。
 */
const activeId = ref<string>('')
const selectedIds = ref<Set<string>>(new Set())
const filterText = ref<string>('')

/** 分页默认页大小 */
const CONTACT_PAGE_SIZE = 50

export function useContact() {
  const contactStore = useContactStore()
  const { client, dataSource, features } = useUIKit()
  const contactList = computed(() => contactStore.contactList || [])
  const contactCount = computed(() => contactStore.contactCount || 0)

  /** 是否为全量拉取模式 */
  const isAllMode = computed(() => features.contactFetchMode === 'all')

  /** 轻量获取好友总数（不拉取完整列表） */
  async function fetchContactCount() {
    try {
      if (client.value) {
        const res = await client.value.getAllContacts()
        const count = res.data?.length || 0
        contactStore.setContactCount(count)
      }
    } catch (e) {
      console.warn('[UIKit] fetch contact count failed:', e)
    }
  }

  /** 全量拉取好友列表（getAllContacts） */
  async function fetchAllContacts() {
    if (!client.value) return
    const res = await client.value.getAllContacts()
    const data = res.data || []
    const list: Contact[] = data.map((item) => ({
      userId: item.userId,
      name: item.remark || item.userId,
      remark: item.remark,
    }))
    contactStore.setContactList(list)
    // 全量模式无分页能力
    contactStore.setHasMore(false)
    contactStore.setCursor('')
  }

  /** 分页拉取好友列表（getContactsWithCursor） */
  async function fetchContactsByPage() {
    let list: Contact[] = []
    if (dataSource.fetchContacts) {
      const res = await dataSource.fetchContacts({ pageSize: CONTACT_PAGE_SIZE })
      list = res.list || []
      contactStore.setHasMore(!!res.hasMore)
      contactStore.setCursor(res.cursor || '')
    } else if (client.value) {
      const res = await client.value.getContactsWithCursor({ pageSize: CONTACT_PAGE_SIZE })
      const contacts = res.data?.contacts || []
      list = contacts.map((item) => ({
        userId: item.userId,
        name: item.remark || item.userId,
        remark: item.remark,
      }))
      contactStore.setHasMore(contacts.length >= CONTACT_PAGE_SIZE)
      contactStore.setCursor(res.data?.cursor || '')
    }
    contactStore.setContactList(list)
  }

  /** 拉取好友列表。默认幂等（仅首次拉取），传 force=true 强制刷新。 */
  async function refresh(force = false) {
    if (!features.enableContact) return
    if (!force && contactStore.loaded) return
    try {
      if (isAllMode.value) {
        await fetchAllContacts()
      } else {
        await fetchContactsByPage()
      }
    } catch (e) {
      console.warn('[UIKit] fetch contacts failed:', e)
    }
  }

  /** 加载下一页（仅分页模式有效） */
  async function loadMore() {
    if (isAllMode.value) return
    if (!contactStore.hasMore) return
    try {
      if (dataSource.fetchContacts) {
        const res = await dataSource.fetchContacts({ pageSize: CONTACT_PAGE_SIZE, cursor: contactStore.cursor })
        const list = res.list || []
        contactStore.appendContactList(list)
        contactStore.setHasMore(!!res.hasMore)
        contactStore.setCursor(res.cursor || '')
      } else if (client.value) {
        const res = await client.value.getContactsWithCursor({
          pageSize: CONTACT_PAGE_SIZE,
          cursor: contactStore.cursor,
        })
        const contacts = res.data?.contacts || []
        const list = contacts.map((item) => ({
          userId: item.userId,
          name: item.remark || item.userId,
          remark: item.remark,
        }))
        contactStore.appendContactList(list)
        contactStore.setHasMore(contacts.length >= CONTACT_PAGE_SIZE)
        contactStore.setCursor(res.data?.cursor || '')
      }
    } catch (e) {
      console.warn('[UIKit] load more contacts failed:', e)
    }
  }

  /** 添加好友邀请 */
  async function addContactRequest(userId: string, reason?: string) {
    if (!client.value) return
    await client.value.addContact(userId, reason)
  }

  /** 删除好友 */
  async function deleteContact(userId: string) {
    if (!client.value) return
    await client.value.deleteContact(userId)
    contactStore.removeContact(userId)
  }

  /** 设置备注 */
  async function setRemark(userId: string, remark: string) {
    if (!client.value) return
    await client.value.setContactRemark(userId, remark)
    contactStore.updateContactRemark(userId, remark)
  }

  /** 设置当前激活联系人（单选定位） */
  function setActiveId(id: string) {
    activeId.value = id
  }

  /** 重置当前激活联系人 */
  function clearActiveId() {
    activeId.value = ''
  }

  /** 多选切换 */
  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  /** 设置多选集合 */
  function setSelectedIds(ids: string[]) {
    selectedIds.value = new Set(ids)
  }

  /** 清空多选 */
  function clearSelected() {
    selectedIds.value = new Set()
  }

  /** 是否被选中 */
  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  /** 设置搜索关键字 */
  function setFilterText(text: string) {
    filterText.value = text
  }

  /** 根据 id 获取联系人（便于上层 emit 时填充） */
  function getContactById(id: string): Contact | undefined {
    return contactList.value.find((c) => c.userId === id)
  }

  return {
    // store data
    contactList,
    contactCount,

    // ui state
    activeId,
    selectedIds,
    filterText,

    // setters
    setActiveId,
    clearActiveId,
    toggleSelect,
    setSelectedIds,
    clearSelected,
    isSelected,
    setFilterText,
    getContactById,

    // actions
    refresh,
    loadMore,
    fetchContactCount,
    addContactRequest,
    deleteContact,
    setRemark,
  }
}
