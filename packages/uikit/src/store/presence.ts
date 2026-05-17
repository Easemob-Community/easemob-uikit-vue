import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 在线状态枚举
 * - online   在线
 * - offline  离线
 * - away     离开
 * - busy     忙碌
 * - custom   自定义状态（具体值在 ext 中）
 */
export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'custom'

export interface PresenceInfo {
  userId: string
  status: PresenceStatus
  /** SDK 透传的扩展信息（自定义状态描述等） */
  ext?: string
  /** 最近变更时间戳 */
  lastTime?: number
}

export const usePresenceStore = defineStore('presence', () => {
  /**
   * userId -> PresenceInfo
   * 使用 ref<Map> 配合 triggerRef 模式：每次写操作创建新 Map 引用，确保响应性。
   */
  const presenceMap = ref<Map<string, PresenceInfo>>(new Map())

  /** 单条更新 */
  function update(info: PresenceInfo) {
    const next = new Map(presenceMap.value)
    next.set(info.userId, { ...info, lastTime: info.lastTime ?? Date.now() })
    presenceMap.value = next
  }

  /** 批量更新（事件回调走批量，避免多次触发响应） */
  function updateBatch(list: PresenceInfo[]) {
    if (!list || list.length === 0) return
    const next = new Map(presenceMap.value)
    const now = Date.now()
    for (const info of list) {
      next.set(info.userId, { ...info, lastTime: info.lastTime ?? now })
    }
    presenceMap.value = next
  }

  /** 获取单个用户的在线状态 */
  function get(userId: string): PresenceInfo | undefined {
    return presenceMap.value.get(userId)
  }

  /** 计算属性：返回当前所有在线用户 ID */
  const onlineUserIds = computed(() => {
    const ids: string[] = []
    presenceMap.value.forEach((info, id) => {
      if (info.status === 'online') ids.push(id)
    })
    return ids
  })

  /** 重置（退登 / 切换 client 时调用） */
  function clear() {
    presenceMap.value = new Map()
  }

  return {
    presenceMap,
    onlineUserIds,
    update,
    updateBatch,
    get,
    clear,
  }
})
