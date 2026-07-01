import type { ClientCore } from './index'

/**
 * 群组相关 API 服务
 */
export class GroupService {
  constructor(private core: ClientCore) {}

  /** 拉取已加入的群组（轻量摘要列表，无分页） */
  async getJoinedGroupList() {
    return this.core.groupManager.getJoinedGroupList()
  }

  /** 获取当前用户加入的群组总数（轻量接口，无需拉取完整列表） */
  async getJoinedGroupsCount() {
    try {
      const res = await this.core.groupManager.getJoinedGroupList()
      return res.length
    } catch (e) {
      console.warn('[UIKitClient] getJoinedGroupsCount failed:', e)
      return 0
    }
  }

  /** 获取单个/多个群详情（支持批量） */
  async getGroupInfo(groupId: string | string[]) {
    const id = Array.isArray(groupId) ? groupId[0] : groupId
    return this.core.groupManager.getGroupInfo({ groupId: id })
  }
}
