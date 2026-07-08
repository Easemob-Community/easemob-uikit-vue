import type { ManagerHost } from '../client'
import type { UiGroup, UiGroupMember } from '../types'
import { toUiGroup, toUiGroupMembers, toUiGroups } from '../adapter/group-adapter'

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

  /** 更新群基础资料（名称/描述/头像/扩展字段） */
  async updateGroupInfo(
    groupId: string,
    input: { name?: string, description?: string, avatar?: string, ext?: string },
  ) {
    await this.client.groupManager.getGroup(groupId).updateInfo(input)
    // SDK 字段名映射到 UiGroup 字段名
    const patch: Partial<UiGroup> = {}
    if (input.name !== undefined)
      patch.groupName = input.name
    if (input.description !== undefined)
      patch.description = input.description
    if (input.avatar !== undefined)
      patch.avatar = input.avatar
    this.store.updateGroup(groupId, patch)
  }

  /** 更新群配置（公开/审批/邀请/最大人数等） */
  async updateGroupConfigs(
    groupId: string,
    input: {
      public?: boolean
      joinApprovalRequired?: boolean
      allowInvites?: boolean
      inviteNeedConfirm?: boolean
      maxMembers?: number
    },
  ) {
    await this.client.groupManager.getGroup(groupId).updateConfigs(input)
    // SDK 字段名映射到 UiGroup 字段名
    const patch: Partial<UiGroup> = {}
    if (input.public !== undefined)
      patch.public = input.public
    if (input.joinApprovalRequired !== undefined)
      patch.approval = input.joinApprovalRequired
    if (input.allowInvites !== undefined)
      patch.allowInvites = input.allowInvites
    if (input.maxMembers !== undefined)
      patch.maxUsers = input.maxMembers
    this.store.updateGroup(groupId, patch)
  }

  /** 开启全员禁言 */
  async muteAllGroupMembers(groupId: string) {
    await this.client.groupManager.getGroup(groupId).muteAllMembers()
    this.store.updateGroup(groupId, { mute: true })
  }

  /** 关闭全员禁言 */
  async unmuteAllGroupMembers(groupId: string) {
    await this.client.groupManager.getGroup(groupId).unmuteAllMembers()
    this.store.updateGroup(groupId, { mute: false })
  }

  /** 禁言指定成员 */
  async muteGroupMembers(groupId: string, userIds: string[], muteDuration: number) {
    await this.client.groupManager.getGroup(groupId).muteMembers({ userIds, muteDuration })
  }

  /** 解除指定成员禁言 */
  async unmuteGroupMembers(groupId: string, userIds: string[]) {
    await this.client.groupManager.getGroup(groupId).unmuteMembers({ userIds })
  }

  /** 获取群禁言列表 */
  async getGroupMuteList(groupId: string, pageNum?: number, pageSize?: number) {
    const result = await this.client.groupManager.getGroup(groupId).getMuteList({ pageNum, pageSize })
    return result
  }

  /** 获取群黑名单 */
  async getGroupBlocklist(groupId: string, pageNum?: number, pageSize?: number) {
    const result = await this.client.groupManager.getGroup(groupId).getBlocklist({ pageNum, pageSize })
    return result
  }

  /** 将成员加入群黑名单 */
  async blockGroupMembers(groupId: string, userIds: string[]) {
    await this.client.groupManager.getGroup(groupId).blockMembers({ userIds })
  }

  /** 将成员移出群黑名单 */
  async unblockGroupMembers(groupId: string, userIds: string[]) {
    await this.client.groupManager.getGroup(groupId).unblockMembers({ userIds })
  }

  /** 获取群白名单 */
  async getGroupAllowlist(groupId: string) {
    const result = await this.client.groupManager.getGroup(groupId).getAllowlist()
    return result
  }

  /** 将成员加入群白名单 */
  async addUsersToGroupAllowlist(groupId: string, userIds: string[]) {
    await this.client.groupManager.getGroup(groupId).addUsersToAllowlist({ userIds })
  }

  /** 将成员移出群白名单 */
  async removeUsersFromGroupAllowlist(groupId: string, userIds: string[]) {
    await this.client.groupManager.getGroup(groupId).removeUsersFromAllowlist({ userIds })
  }

  /** 检查当前用户是否在群白名单中 */
  async checkIfInGroupAllowList(groupId: string) {
    return this.client.groupManager.getGroup(groupId).checkIfInAllowList()
  }

  /** 检查当前用户是否在群禁言列表中 */
  async checkIfInGroupMuteList(groupId: string) {
    return this.client.groupManager.getGroup(groupId).checkIfInMuteList()
  }

  /** 获取群共享文件列表 */
  async getGroupSharedFileList(groupId: string, pageNum?: number, pageSize?: number) {
    const result = await this.client.groupManager.getGroup(groupId).getSharedFileList({ pageNum, pageSize })
    console.warn('[GroupDomain] getGroupSharedFileList result:', result)
    return result
  }

  /** 上传群共享文件 */
  async uploadGroupSharedFile(groupId: string, file: File) {
    let response: unknown
    await this.client.groupManager.getGroup(groupId).uploadSharedFile({
      file,
      onFileUploadComplete: (res: unknown) => {
        response = res
      },
    })
    return response
  }

  /** 删除群共享文件 */
  async deleteGroupSharedFile(groupId: string, fileId: string) {
    await this.client.groupManager.getGroup(groupId).deleteSharedFile({ fileId })
  }

  /** 同意入群申请 */
  async acceptGroupJoinRequest(groupId: string, userId: string) {
    await this.client.groupManager.acceptGroupJoinRequest({ groupId, userId })
  }

  /** 拒绝入群申请 */
  async rejectGroupJoinRequest(groupId: string, userId: string, reason: string) {
    await this.client.groupManager.rejectGroupJoinRequest({ groupId, userId, reason })
  }

  /** 获取公开群列表 */
  async getPublicGroupList(params?: { cursor?: string, pageSize?: number }) {
    const result = await this.client.groupManager.getPublicGroupList(params)
    return result
  }

  /** 拒绝群邀请 */
  async declineGroupInvitation(groupId: string) {
    await this.client.groupManager.rejectInvitation({ groupId })
  }
}
