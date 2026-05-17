import { computed, ref } from 'vue'
import { useGroupStore } from '../store/group'
import type { Group } from '../store/group'

/**
 * 群组列表 UI 状态：当前激活项 / 多选集合 / 搜索词
 *
 * 数据本身仍然由 Pinia store 管理，这里只承载视图层的临时状态，
 * 在 group-list / group-item 子组件之间共享。
 */
const activeId = ref<string>('')
const selectedIds = ref<Set<string>>(new Set())
const filterText = ref<string>('')

export function useGroup() {
  const groupStore = useGroupStore()
  const groupList = computed(() => groupStore.groupList || [])

  /** 设置当前激活群组（单选定位） */
  function setActiveId(id: string) {
    activeId.value = id
  }

  /** 重置当前激活群组 */
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

  /** 根据 id 获取群组（便于上层 emit 时填充） */
  function getGroupById(id: string): Group | undefined {
    return groupList.value.find((g) => g.groupId === id)
  }

  return {
    // store data
    groupList,

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
    getGroupById,
  }
}
