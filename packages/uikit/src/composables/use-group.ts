import { computed, ref } from 'vue'
import { useGroupStore } from '../store/group'
import type { Group } from '../store/group'
import { useUIKit } from './use-uikit'

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
  const { client, dataSource } = useUIKit()
  const groupList = computed(() => groupStore.groupList || [])

  /** 首页拉取群组，默认幂等（仅首次），传 force=true 强刷 */
  async function refresh(force = false, pageSize = 50) {
    if (!force && groupStore.loaded) return
    try {
      if (dataSource.fetchGroups) {
        const res = await dataSource.fetchGroups({ pageSize })
        groupStore.setGroupList(res.list || [])
        groupStore.setHasMore(!!res.hasMore)
        groupStore.setCursor(res.cursor || '')
      } else if (client.value) {
        const list = await client.value.getJoinedGroups({ pageSize, pageNum: 0 })
        const mapped: Group[] = list.map((item: any) => ({
          groupId: item.groupId,
          groupName: item.groupName || item.groupId,
          owner: item.owner || '',
          memberCount: item.memberCount || 0,
        }))
        groupStore.setGroupList(mapped)
        groupStore.setHasMore(mapped.length >= pageSize)
        groupStore.setCursor(String(1))
      }
    } catch (e) {
      console.warn('[UIKit] fetch groups failed:', e)
    }
  }

  /** 加载下一页 */
  async function loadMore(pageSize = 50) {
    if (!groupStore.hasMore) return
    try {
      if (dataSource.fetchGroups) {
        const res = await dataSource.fetchGroups({ pageSize, cursor: groupStore.cursor })
        groupStore.appendGroupList(res.list || [])
        groupStore.setHasMore(!!res.hasMore)
        groupStore.setCursor(res.cursor || '')
      } else if (client.value) {
        const nextPage = (parseInt(groupStore.cursor || '0') || 0) + 1
        const list = await client.value.getJoinedGroups({ pageSize, pageNum: nextPage })
        const mapped: Group[] = list.map((item: any) => ({
          groupId: item.groupId,
          groupName: item.groupName || item.groupId,
          owner: item.owner || '',
          memberCount: item.memberCount || 0,
        }))
        groupStore.appendGroupList(mapped)
        groupStore.setHasMore(mapped.length >= pageSize)
        groupStore.setCursor(String(nextPage))
      }
    } catch (e) {
      console.warn('[UIKit] load more groups failed:', e)
    }
  }

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

    // actions
    refresh,
    loadMore,
  }
}
