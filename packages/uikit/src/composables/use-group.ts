import { computed, ref } from 'vue'
import { useGroupStore } from '../store/group'
import type { Group } from '../store/group'
import type { JoinedGroupItem } from '../sdk/types'
import { useUIKit } from './use-uikit'
import type { JoinedGroupSummary } from 'easemob-websdk'

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
        const count = await client.value.group.getJoinedGroupsCount()
        groupStore.setJoinedGroupCount(count)
      }
    } catch (e) {
      console.warn('[UIKit] fetch joined group count failed:', e)
    }
  }

  /** 首页拉取群组，默认幂等（仅首次），传 force=true 强刷 */
  async function refresh(force = false) {
    if (!features.enableGroup) return
    if (!force && groupStore.loaded) return
    try {
      if (dataSource.fetchGroups) {
        const res = await dataSource.fetchGroups({ pageSize: JOINED_GROUPS_PAGE_SIZE_WITH_DETAIL })
        groupStore.setGroupList(res.list || [])
        groupStore.setHasMore(!!res.hasMore)
        groupStore.setCursor(res.cursor || '')
      } else if (client.value) {
        const res = await client.value.group.getJoinedGroupList()
        const list: ReadonlyArray<JoinedGroupSummary> = res
        console.log('[UIKit] getJoinedGroupList raw list:', list)
        const mapped: Group[] = list.map(mapSdkGroupItem)
        console.log('[UIKit] getJoinedGroupList mapped:', mapped)

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
        // getJoinedGroupList 返回全部已加入群组，无分页
        groupStore.setHasMore(false)
        groupStore.setCursor('')
      }
    } catch (e) {
      console.warn('[UIKit] fetch groups failed:', e)
    }
  }

  /** 加载下一页（SDK5 getJoinedGroupList 返回全部，loadMore 不再生效） */
  async function loadMore() {
    if (!features.enableGroup) return
    console.log('[UIKit] SDK5 getJoinedGroupList returns full list; loadMore is no-op.')
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
        const res = await client.value.group.getGroupInfo(batch)
        /**
         * @see SDK_DEFICIENCY: UIKit client.getGroupInfo 仅支持单个 groupId，
         * 未提供 getGroupInfoList 的批量调用封装。
         * GroupDetail 无 .data 字段，此处保留兼容旧代码。
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = res as any
        const details: unknown[] = result?.data ?? (result ? [result] : [])
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
