import { computed, ref } from 'vue'
import { useUIKit } from './use-uikit'

export function useContact() {
  const { domains, stores, dataSource } = useUIKit()
  const contactStore = stores.contact

  const contactList = computed(() => contactStore.contactList)
  const blackList = computed(() => contactStore.blackList)
  const inviteList = computed(() => contactStore.inviteList)
  const loaded = computed(() => contactStore.loaded)

  // ===== UI 交互状态 =====
  const filterText = computed(() => contactStore.filterText)
  const activeId = computed(() => contactStore.activeId)
  const selectedIds = computed(() => contactStore.selectedIds)
  const hasMore = computed(() => contactStore.hasMore)
  const contactCount = computed(() => contactStore.contactCount)

  const loading = ref(false)

  function setFilterText(text: string) {
    contactStore.setFilterText(text)
  }

  function setActiveId(id: string) {
    contactStore.setActiveId(id)
  }

  function isSelected(userId: string): boolean {
    return contactStore.isSelected(userId)
  }

  function toggleSelect(userId: string) {
    contactStore.toggleSelect(userId)
  }

  function setSelectedIds(ids: string[]) {
    contactStore.setSelectedIds(ids)
  }

  /** 同步本地联系人列表 */
  function syncLocalContacts() {
    return domains.contact.syncLocal()
  }

  /** 拉取联系人列表（优先数据源适配器） */
  async function fetchContacts(params?: { cursor?: string, pageSize?: number }) {
    if (dataSource.fetchContacts) {
      loading.value = true
      try {
        const result = await dataSource.fetchContacts(params)
        // 带 cursor 视为分页追加，否则为首屏/刷新整体替换
        if (params?.cursor) {
          contactStore.appendContactList(result.list)
        }
        else {
          contactStore.setContactList(result.list)
        }
        // 分页元数据落 store，供 loadMore 判断是否继续加载及传游标
        contactStore.setHasMore(result.hasMore ?? false)
        contactStore.setCursor(result.cursor)
        return result
      }
      finally {
        loading.value = false
      }
    }
    // 默认走 SDK 本地内存（全量内存态，无分页，hasMore 保持 false）
    const list = domains.contact.syncLocal()
    return { list, cursor: undefined, hasMore: false }
  }

  /** 拉取黑名单 */
  async function fetchBlocklist() {
    if (dataSource.fetchBlocklist) {
      const list = await dataSource.fetchBlocklist()
      contactStore.setBlackList(list)
      return list
    }
    return domains.contact.syncBlocklist()
  }

  /** 添加好友 */
  async function addContact(userId: string, message?: string) {
    await domains.contact.addContact(userId, message)
  }

  /** 删除好友 */
  async function deleteContact(userId: string) {
    await domains.contact.deleteContact(userId)
  }

  /** 设置备注 */
  async function setContactRemark(userId: string, remark: string) {
    await domains.contact.setRemark(userId, remark)
  }

  /** 接受好友申请 */
  async function acceptContactInvite(userId: string) {
    await domains.contact.acceptInvite(userId)
  }

  /** 拒绝好友申请 */
  async function declineContactInvite(userId: string) {
    await domains.contact.declineInvite(userId)
  }

  /** 加入黑名单 */
  async function addToBlocklist(userIds: string[]) {
    await domains.contact.addToBlocklist(userIds)
  }

  /** 移出黑名单 */
  async function removeFromBlocklist(userIds: string[]) {
    await domains.contact.removeFromBlocklist(userIds)
  }

  /** 刷新联系人列表（重新拉取） */
  async function refresh() {
    await fetchContacts()
    contactStore.setContactCount(contactStore.contactList.length)
  }

  /**
   * 加载更多联系人（分页数据源场景）。
   * SDK 本地联系人为全量内存态，无分页；仅在配置了分页数据源时才有更多数据。
   */
  async function loadMore() {
    if (!contactStore.hasMore)
      return
    if (dataSource.fetchContacts) {
      // 携带 store 中的游标请求下一页，fetchContacts 内部走 append 合并
      await fetchContacts({ cursor: contactStore.cursor })
    }
  }

  /** 轻量获取好友总数（不强制拉取完整列表） */
  async function fetchContactCount(): Promise<number> {
    const count = contactStore.loaded
      ? contactStore.contactList.length
      : domains.contact.syncLocal().length
    contactStore.setContactCount(count)
    return count
  }

  return {
    contactList,
    blackList,
    inviteList,
    loaded,
    loading,
    filterText,
    activeId,
    selectedIds,
    hasMore,
    contactCount,
    setFilterText,
    setActiveId,
    isSelected,
    toggleSelect,
    setSelectedIds,
    syncLocalContacts,
    fetchContacts,
    fetchBlocklist,
    fetchContactCount,
    refresh,
    loadMore,
    addContact,
    deleteContact,
    setContactRemark,
    acceptContactInvite,
    declineContactInvite,
    addToBlocklist,
    removeFromBlocklist,
  }
}
