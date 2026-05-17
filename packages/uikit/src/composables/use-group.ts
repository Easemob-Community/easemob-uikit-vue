import { computed, ref } from 'vue'
import { useGroupStore } from '../store/group'
import type { Group } from '../store/group'
import type { JoinedGroupItem } from '../sdk/types'
import { useUIKit } from './use-uikit'

/**
 * 将 SDK 原始群组项映射为 UIKIT Group 模型
 * - getJoinedGroups needAffiliations=true 时返回 GroupInfo（字段为 camelCase）
 * - getGroupInfo 返回 GroupDetailInfo（字段为 snake_case）
 */
function mapSdkGroupItem(item: JoinedGroupItem | Record<string, unknown>): Group {
  const raw = item as Record<string, unknown>
  return {
    groupId: (raw.groupId ?? raw.groupid ?? raw.id ?? '') as string,
    groupName: (raw.groupName ?? raw.groupname ?? raw.name ?? '') as string,
    avatar: raw.avatar as string | undefined,
    owner: (raw.owner ?? '') as string,
    memberCount:
      (raw.memberCount ??
        raw.affiliationsCount ??
        raw.affiliations_count ??
        0) as number,
    description: raw.description as string | undefined,
    public: raw.public as boolean | undefined,
    role: raw.role as Group['role'],
    allowInvites: (raw.allowInvites ?? raw.allowinvites) as boolean | undefined,
    approval: (raw.approval ?? raw.membersonly) as boolean | undefined,
    maxUsers: (raw.maxUsers ?? raw.maxusers) as number | undefined,
    mute: raw.mute as boolean | undefined,
    shieldgroup: raw.shieldgroup as boolean | undefined,
    ext: (raw.ext ?? raw.custom) as string | undefined,
    created: raw.created as number | undefined,
  }
}

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
  const { client, dataSource, features } = useUIKit()
  const groupList = computed(() => groupStore.groupList || [])
  const joinedGroupCount = computed(() => groupStore.joinedGroupCount || 0)

/**
 * 当开启 needAffiliations / needRole 时，SDK 强制每页上限为 20。
 * 外部传入的 pageSize 若超过此限制会被截断，因此内部统一按 20 处理。
 */
const JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL = 20

  /** 轻量获取加入的群组总数（不拉取完整列表） */
  async function fetchJoinedGroupCount() {
    if (!features.enableGroup) return
    try {
      if (client.value) {
        const count = await client.value.getJoinedGroupsCount()
        groupStore.setJoinedGroupCount(count)
      }
    } catch (e) {
      console.warn('[UIKit] fetch joined group count failed:', e)
    }
  }

  /** 首页拉取群组，默认幂等（仅首次），传 force=true 强刷 */
  async function refresh(force = false, pageSize = JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL) {
    if (!features.enableGroup) return
    if (!force && groupStore.loaded) return
    try {
      if (dataSource.fetchGroups) {
        const res = await dataSource.fetchGroups({ pageSize })
        groupStore.setGroupList(res.list || [])
        groupStore.setHasMore(!!res.hasMore)
        groupStore.setCursor(res.cursor || '')
      } else if (client.value) {
        // 开启 needAffiliations 以获取 memberCount / role / description 等字段
        // 注意：SDK 在 needAffiliations=true 或 needRole=true 时，pageSize 上限强制为 20
        const list = await client.value.getJoinedGroups({
          pageSize: JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL,
          pageNum: 0,
          needAffiliations: true,
          needRole: true,
        })
        console.log('[UIKit] getJoinedGroups raw list:', list)
        const mapped: Group[] = list.map(mapSdkGroupItem)
        console.log('[UIKit] getJoinedGroups mapped:', mapped)

        // 异步批量补全群详情（avatar 等字段），不阻塞列表首屏渲染
        const groupIdsNeedDetail = mapped
          .filter((g) => !g.avatar)
          .map((g) => g.groupId)
        if (groupIdsNeedDetail.length > 0) {
          fetchGroupDetails(groupIdsNeedDetail).catch(() => {
            // 静默失败，不影响首屏展示
          })
        }

        groupStore.setGroupList(mapped)
        console.log('[UIKit] groupStore.groupList after set:', groupStore.groupList)
        groupStore.setHasMore(mapped.length >= JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL)
        groupStore.setCursor(String(0))
      }
    } catch (e) {
      console.warn('[UIKit] fetch groups failed:', e)
    }
  }

  /** 加载下一页 */
  async function loadMore(pageSize = JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL) {
    if (!features.enableGroup) return
    if (!groupStore.hasMore) return
    try {
      if (dataSource.fetchGroups) {
        const res = await dataSource.fetchGroups({ pageSize, cursor: groupStore.cursor })
        groupStore.appendGroupList(res.list || [])
        groupStore.setHasMore(!!res.hasMore)
        groupStore.setCursor(res.cursor || '')
      } else if (client.value) {
        const nextPage = (parseInt(groupStore.cursor || '0') || 0) + 1
        const list = await client.value.getJoinedGroups({
          pageSize: JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL,
          pageNum: nextPage,
          needAffiliations: true,
          needRole: true,
        })
        const mapped: Group[] = list.map(mapSdkGroupItem)

        const groupIdsNeedDetail = mapped
          .filter((g) => !g.avatar)
          .map((g) => g.groupId)
        if (groupIdsNeedDetail.length > 0) {
          fetchGroupDetails(groupIdsNeedDetail).catch(() => {
            // 静默失败
          })
        }

        groupStore.appendGroupList(mapped)
        groupStore.setHasMore(mapped.length >= JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL)
        groupStore.setCursor(String(nextPage))
      }
    } catch (e) {
      console.warn('[UIKit] load more groups failed:', e)
    }
  }

  /**
   * 批量获取群详情并合并到 store（用于补全 avatar 等字段）
   * 每次最多并发 10 个请求，避免一次性发过多请求。
   */
  async function fetchGroupDetails(groupIds: string[]) {
    if (!client.value || groupIds.length === 0) return
    const BATCH_SIZE = 10
    for (let i = 0; i < groupIds.length; i += BATCH_SIZE) {
      const batch = groupIds.slice(i, i + BATCH_SIZE)
      try {
        const res = await client.value.getGroupInfo(batch)
        const details: unknown[] = res?.data ?? []
        for (const d of details) {
          const detail = mapSdkGroupItem(d as Record<string, unknown>)
          const idx = groupStore.groupList.findIndex(
            (g) => g.groupId === detail.groupId
          )
          if (idx !== -1) {
            // 仅合并有值的字段，避免覆盖已有数据
            const existing = groupStore.groupList[idx]
            groupStore.groupList[idx] = {
              ...existing,
              ...detail,
              groupName: detail.groupName || existing.groupName,
              owner: detail.owner || existing.owner,
            }
          }
        }
      } catch (e) {
        console.warn('[UIKit] fetchGroupDetails batch failed:', e)
      }
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
    joinedGroupCount,

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
    fetchJoinedGroupCount,
  }
}
