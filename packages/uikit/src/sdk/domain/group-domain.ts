import type { ManagerHost } from '../client'
import type { UiGroup, UiGroupMember } from '../types'
import { toUiGroup, toUiGroups, toUiGroupMember, toUiGroupMembers } from '../adapter/group-adapter'

/**
 * GroupStore 需要暴露给 Domain 的最小接口。
 */
export interface GroupStoreLike {
  setList: (list: UiGroup[]) => void
  addGroup: (group: UiGroup) => void
  removeGroup: (groupId: string) => void
  updateGroup: (groupId: string, patch: Partial<UiGroup>) => void
  setGroupMembers: (groupId: string, members: UiGroupMember[]) => void
  appendGroupMembers: (groupId: string, members: UiGroupMember[]) => void
  removeGroupMembers: (groupId: string, userIds: string[]) => void
  updateGroupMemberRole: (groupId: string, userId: string, role: UiGroupMember['role']) => void
  setGroupAnnouncement: (groupId: string, announcement: string) => void
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

  /** 拉取群成员列表 */
  async fetchGroupMembers(
    groupId: string,
    cursor?: string,
    pageSize = 20,
  ): Promise<{ members: UiGroupMember[], cursor?: string, hasMore?: boolean }> {
    const result = await this.client.groupManager.getGroupMemberList({ groupId, cursor, pageSize })
    const members = toUiGroupMembers(result.items)
    if (cursor) {
      this.store.appendGroupMembers(groupId, members)
    }
    else {
      this.store.setGroupMembers(groupId, members)
    }
    return { members, cursor: result.cursor, hasMore: result.hasMore }
  }

  /** 拉取群公告 */
  async fetchGroupAnnouncement(groupId: string): Promise<string> {
    const result = await this.client.groupManager.getGroupAnnouncement({ groupId })
    const announcement = result.announcement ?? ''
    this.store.setGroupAnnouncement(groupId, announcement)
    return announcement
  }

  /** 更新群公告 */
  async updateGroupAnnouncement(groupId: string, announcement: string) {
    await this.client.groupManager.updateGroupAnnouncement({ groupId, announcement })
    this.store.setGroupAnnouncement(groupId, announcement)
  }

  /** 转让群主 */
  async changeGroupOwner(groupId: string, newOwnerId: string) {
    await this.client.groupManager.changeGroupOwner({ groupId, newOwner: newOwnerId })
  }

  /** 移除群成员 */
  async removeGroupMembers(groupId: string, userIds: string[]) {
    await this.client.groupManager.removeGroupMembers({ groupId, userIds })
    this.store.removeGroupMembers(groupId, userIds)
  }

  /** 邀请用户入群 */
  async inviteUsersToGroup(groupId: string, userIds: string[]) {
    await this.client.groupManager.inviteUsersToGroup({ groupId, userIds })
  }

  /** 设置群管理员 */
  async addGroupAdmin(groupId: string, userId: string) {
    await this.client.groupManager.addGroupAdmin({ groupId, userId })
    this.store.updateGroupMemberRole(groupId, userId, 'admin')
  }

  /** 取消群管理员 */
  async removeGroupAdmin(groupId: string, userId: string) {
    await this.client.groupManager.removeGroupAdmin({ groupId, userId })
    this.store.updateGroupMemberRole(groupId, userId, 'member')
  }

  /** 接受群邀请 */
  async acceptGroupInvitation(groupId: string) {
    await this.client.groupManager.acceptInvitation({ groupId })
  }

  /** 拒绝群邀请 */
  async declineGroupInvitation(groupId: string) {
    await this.client.groupManager.rejectInvitation({ groupId })
  }
}
