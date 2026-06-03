import type { ClientCore } from './index'

/**
 * 群组相关 API 服务
 */
export class GroupService {
  constructor(private core: ClientCore) {}

  /** 拉取已加入的群组（分页） */
  async getJoinedGroupList(
    options?: {
      pageSize?: number
      needMemberCount?: boolean
      needRole?: boolean
    },
  ) {
    return this.core.groupManager.getJoinedGroupList({
      pageSize: options?.pageSize ?? 50,
      needMemberCount: options?.needMemberCount ?? false,
      needRole: options?.needRole ?? false,
    })
  }

  /** 获取当前用户加入的群组总数（轻量接口，无需拉取完整列表） */
  async getJoinedGroupsCount() {
    try {
      const res = await this.core.groupManager.getJoinedGroupList({ pageSize: 1 })
      /**
       * @see SDK_DEFICIENCY: GroupListResult 类型未声明 total 字段，
       * 但服务端实际返回中包含该字段。
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (res as any)?.total === 'number' ? (res as any).total : 0
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
