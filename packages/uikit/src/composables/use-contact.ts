import { computed, ref } from 'vue'
import { useContactStore } from '../store/contact'
import type { Contact } from '../store/contact'

/**
 * 列表 UI 状态：当前激活项 / 多选集合 / 搜索词
 *
 * 数据本身仍然由 Pinia store 管理，这里只承载视图层的临时状态，
 * 在 contact-list / contact-item 子组件之间共享。
 */
const activeId = ref<string>('')
const selectedIds = ref<Set<string>>(new Set())
const filterText = ref<string>('')

export function useContact() {
  const contactStore = useContactStore()
  const contactList = computed(() => contactStore.contactList || [])

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
  }
}
