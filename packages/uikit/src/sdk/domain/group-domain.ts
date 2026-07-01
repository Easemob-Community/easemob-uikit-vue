import type { ManagerHost } from '../client'
import type { UiGroup } from '../types'
import { toUiGroups, toUiGroup } from '../adapter/group-adapter'

/**
 * GroupStore 需要暴露给 Domain 的最小接口。
 */
export interface GroupStoreLike {
  setList(list: UiGroup[]): void
  addGroup(group: UiGroup): void
  removeGroup(groupId: string): void
  updateGroup(groupId: string, patch: Partial<UiGroup>): void
}

/**
 * 群组业务域：封装 SDK GroupManager 的群组能力。
 */
export class GroupDomain {
  constructor(
    private client: ManagerHost,
    private store: GroupStoreLike,
  ) {}

  /** 获取已加入群组本地列表 */
  syncLocal(): UiGroup[] {
    const items = this.client.groupManager.getJoinedGroupList()
    const list = toUiGroups(items)
    this.store.setList(list)
    return list
  }

  /** 获取单个群详情 */
  async fetchGroupInfo(groupId: string): Promise<UiGroup> {
    const detail = await this.client.groupManager.getGroupInfo({ groupId })
    const group = toUiGroup(detail)
    this.store.updateGroup(groupId, group)
    return group
  }

  /** 批量获取群详情 */
  async fetchGroupInfoList(groupIds: string[]): Promise<UiGroup[]> {
    const result = await this.client.groupManager.getGroupInfoList({ groupIds })
    const groups = toUiGroups(result)
    groups.forEach(g => this.store.updateGroup(g.groupId, g))
    return groups
  }

  /** 创建群组 */
  async createGroup(params: {
    name: string
    description?: string
    memberIds?: string[]
    public?: boolean
    joinApprovalRequired?: boolean
    allowInvites?: boolean
    inviteNeedConfirm?: boolean
    maxMembers?: number
  }) {
    return this.client.groupManager.createGroup({
      name: params.name,
      description: params.description ?? '',
      memberIds: params.memberIds,
      public: params.public ?? false,
      joinApprovalRequired: params.joinApprovalRequired ?? false,
      allowInvites: params.allowInvites ?? false,
      inviteNeedConfirm: params.inviteNeedConfirm ?? false,
      maxMembers: params.maxMembers,
    })
  }

  /** 加入群组 */
  async joinGroup(groupId: string, message?: string) {
    await this.client.groupManager.joinGroup({ groupId, message })
  }

  /** 离开群组 */
  async leaveGroup(groupId: string) {
    await this.client.groupManager.leaveGroup({ groupId })
  }

  /** 解散群组 */
  async destroyGroup(groupId: string) {
    await this.client.groupManager.destroyGroup({ groupId })
  }
}
