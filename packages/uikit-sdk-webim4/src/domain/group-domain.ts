import type { EasemobChat } from 'easemob-websdk'
import type { CreateGroupParams, UiGroup, UiGroupMember } from '@easemob/uikit-sdk-contract'
import { GROUP_MEMBER_ROLE, createLogger } from '@easemob/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import type { GroupStoreLike } from '../event/types'
import {
  toUiGroup,
  toUiGroupMembers,
  toUiGroupMembersFromIds,
  toUiGroupMuteMembers,
  toUiGroups,
} from '../adapter/group-adapter'

const groupDomainLog = createLogger('UIKit:Webim4GroupDomain')

/** 飞行中的 fetchGroupInfo Promise，避免多个消息气泡/组件并发请求同一群详情 */
const pendingGroupInfoRequests = new Map<string, Promise<UiGroup>>()

/** 飞行中的 syncGroupAdmins Promise，避免多个组件并发请求同一群管理员 */
const pendingGroupAdminRequests = new Map<string, Promise<void>>()

/** 飞行中的 fetchGroupAnnouncement Promise，避免多个组件并发请求同一群公告 */
const pendingGroupAnnouncementRequests = new Map<string, Promise<string>>()

/** 已加入群组列表同步（服务端分页拉取）飞行中的 Promise */
let pendingJoinedGroupsSync: Promise<UiGroup[]> | null = null

/** 解包 4.x AsyncResult（data/entities 二选一承载，见 4.24.2 common.d.ts） */
function unwrap<T>(res: EasemobChat.AsyncResult<T>): T {
  return (res?.data ?? res?.entities) as T
}

/**
 * 群组业务域（4.x）：全部 API 挂单一 `connection`（无 GroupManager 拆分）。
 * 行为镜像 websdk5 GroupDomain；参数形状差异（pageNum/cursor、字段命名）在本层收敛。
 */
export class GroupDomain {
  constructor(
    private client: Webim4Client,
    private store: GroupStoreLike,
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4GroupDomain] connection 尚未初始化')
    return conn
  }

  /**
   * 获取已加入群组列表。
   * 4.x 无本地群组缓存（localCache 为可选插件，不作为主链路），
   * 这里触发服务端分页拉取并回填 store，同步返回当前 store 快照。
   */
  syncLocal(): UiGroup[] {
    void this.refreshJoinedGroups().catch((err) => {
      groupDomainLog.warn('syncLocal refreshJoinedGroups failed:', err)
    })
    return this.store.groupList ?? []
  }

  /**
   * 只读：获取当前已缓存的已加入群组数量（不写 store）。
   */
  getLocalCount(): number {
    return this.store.groupList?.length ?? 0
  }

  /** 服务端分页拉取已加入群组（needRole/needAffiliations 时 pageNum 从 0 起、pageSize 上限 20）；adapter 登录后预取也走此方法 */
  async refreshJoinedGroups(): Promise<UiGroup[]> {
    if (pendingJoinedGroupsSync)
      return pendingJoinedGroupsSync

    pendingJoinedGroupsSync = (async () => {
      const pageSize = 20
      const all: EasemobChat.GroupInfo[] = []
      let pageNum = 0
      // 逐页拉满为止（返回不足一页即最后一页）
      for (;;) {
        const res = await this.connection.getJoinedGroups({
          pageNum,
          pageSize,
          needAffiliations: true,
          needRole: true,
        })
        const items = (unwrap(res) ?? []) as EasemobChat.GroupInfo[]
        all.push(...items)
        if (items.length < pageSize)
          break
        pageNum += 1
      }
      const list = toUiGroups(all)
      this.store.setList(list)
      return list
    })()

    try {
      return await pendingJoinedGroupsSync
    }
    finally {
      pendingJoinedGroupsSync = null
    }
  }

  /** 获取单个群详情 */
  async fetchGroupInfo(groupId: string): Promise<UiGroup> {
    const existing = pendingGroupInfoRequests.get(groupId)
    if (existing)
      return existing

    const promise = (async () => {
      const res = await this.connection.getGroupInfo({ groupId })
      const detail = (unwrap(res) ?? [])[0]
      if (!detail)
        throw new Error(`[Webim4GroupDomain] getGroupInfo 未返回群详情: ${groupId}`)
      const group = toUiGroup(detail)
      this.store.updateGroup(groupId, group)
      return group
    })()

    pendingGroupInfoRequests.set(groupId, promise)
    try {
      return await promise
    }
    finally {
      pendingGroupInfoRequests.delete(groupId)
    }
  }

  /** 批量获取群详情（4.x getGroupInfo 原生支持 groupId 数组） */
  async fetchGroupInfoList(groupIds: string[]): Promise<UiGroup[]> {
    const res = await this.connection.getGroupInfo({ groupId: groupIds })
    const groups = toUiGroups(unwrap(res) ?? [])
    groups.forEach(g => this.store.updateGroup(g.groupId, g))
    return groups
  }

  /** 创建群组 */
  async createGroup(params: CreateGroupParams): Promise<{ groupId: string }> {
    const res = await this.connection.createGroupVNext({
      groupName: params.name,
      description: params.description ?? '',
      members: params.memberIds,
      isPublic: params.public ?? false,
      needApprovalToJoin: params.joinApprovalRequired ?? false,
      allowMemberToInvite: params.allowInvites ?? false,
      inviteNeedConfirm: params.inviteNeedConfirm ?? false,
      maxMemberCount: params.maxMembers,
    })
    const groupId = unwrap(res)?.groupId
    if (!groupId)
      throw new Error('[Webim4GroupDomain] createGroupVNext 未返回 groupId')
    // 创建者即群主：立即写入本地群组缓存，保证抽屉/群管理/共享文件的权限判定不依赖后续同步
    this.store.addGroup({
      groupId,
      groupName: params.name,
      description: params.description,
      role: GROUP_MEMBER_ROLE.OWNER,
      memberCount: (params.memberIds?.length ?? 0) + 1,
      maxUsers: params.maxMembers,
      public: params.public ?? false,
      allowInvites: params.allowInvites ?? false,
      approval: params.joinApprovalRequired ?? false,
    })
    // 拉取权威详情（群主、角色、成员数等），失败不阻塞创建流程
    try {
      await this.fetchGroupInfo(groupId)
    }
    catch {
      // 忽略：进入群聊后抽屉会按需重新拉取
    }
    return { groupId }
  }

  /** 加入群组（申请入群，需审批时等待管理员同意） */
  async joinGroup(groupId: string, message?: string) {
    await this.connection.joinGroup({ groupId, message: message ?? '' })
  }

  /** 离开群组 */
  async leaveGroup(groupId: string) {
    await this.connection.leaveGroup({ groupId })
    this.store.removeGroup(groupId)
  }

  /** 解散群组 */
  async destroyGroup(groupId: string) {
    await this.connection.destroyGroup({ groupId })
    this.store.removeGroup(groupId)
  }

  /** 拉取群成员列表（4.x getGroupMembers 原生游标分页） */
  async fetchGroupMembers(
    groupId: string,
    cursor?: string,
    pageSize = 20,
  ): Promise<{ members: UiGroupMember[], cursor?: string, hasMore?: boolean }> {
    const res = await this.connection.getGroupMembers({ groupId, cursor, limit: pageSize })
    const data = unwrap(res)
    const members = toUiGroupMembers(data?.members ?? [])
    const nextCursor = data?.cursor || undefined
    if (cursor) {
      this.store.appendGroupMembers(groupId, members)
    }
    else {
      this.store.setGroupMembers(groupId, members)
      // 首屏单独拉取管理员列表并合并角色（与 websdk5 行为对齐）
      try {
        await this.syncGroupAdmins(groupId)
      }
      catch {
        // 管理员列表失败不应阻塞成员列表展示
      }
    }
    return { members, cursor: nextCursor, hasMore: !!nextCursor }
  }

  /** 拉取并合并群管理员到成员缓存（4.x getGroupAdmin 仅返回 userId 列表） */
  private async syncGroupAdmins(groupId: string) {
    const existing = pendingGroupAdminRequests.get(groupId)
    if (existing)
      return existing

    // 已同步过管理员列表的群不再重复拉取；增删管理员事件会增量更新角色。
    if (this.store.isGroupAdminSynced?.(groupId))
      return

    const promise = (async () => {
      const res = await this.connection.getGroupAdmin({ groupId })
      const adminIds = (unwrap(res) ?? []).filter(Boolean)
      const adminMembers = toUiGroupMembersFromIds(adminIds, GROUP_MEMBER_ROLE.ADMIN)
      // 先追加缺失的管理员，再统一把角色置为 admin（已存在时仅更新角色）
      this.store.appendGroupMembers(groupId, adminMembers)
      for (const admin of adminMembers) {
        this.store.updateGroupMemberRole(groupId, admin.userId, GROUP_MEMBER_ROLE.ADMIN)
      }
      this.store.markGroupAdminSynced?.(groupId)
    })()

    pendingGroupAdminRequests.set(groupId, promise)
    try {
      return await promise
    }
    finally {
      pendingGroupAdminRequests.delete(groupId)
    }
  }

  /** 拉取群公告 */
  async fetchGroupAnnouncement(groupId: string): Promise<string> {
    const existing = pendingGroupAnnouncementRequests.get(groupId)
    if (existing)
      return existing

    const promise = (async () => {
      const res = await this.connection.fetchGroupAnnouncement({ groupId })
      const announcement = unwrap(res)?.announcement ?? ''
      this.store.setGroupAnnouncement(groupId, announcement)
      return announcement
    })()

    pendingGroupAnnouncementRequests.set(groupId, promise)
    try {
      return await promise
    }
    finally {
      pendingGroupAnnouncementRequests.delete(groupId)
    }
  }

  /** 更新群公告 */
  async updateGroupAnnouncement(groupId: string, announcement: string) {
    await this.connection.updateGroupAnnouncement({ groupId, announcement })
    this.store.setGroupAnnouncement(groupId, announcement)
  }

  /** 转让群主 */
  async changeGroupOwner(groupId: string, newOwnerId: string) {
    await this.connection.changeGroupOwner({ groupId, newOwner: newOwnerId })
  }

  /** 移除群成员 */
  async removeGroupMembers(groupId: string, userIds: string[]) {
    await this.connection.removeGroupMembers({ groupId, users: userIds })
    this.store.removeGroupMembers(groupId, userIds)
  }

  /** 邀请用户入群 */
  async inviteUsersToGroup(groupId: string, userIds: string[]) {
    await this.connection.inviteUsersToGroup({ groupId, users: userIds })
  }

  /** 设置群管理员 */
  async addGroupAdmin(groupId: string, userId: string) {
    await this.connection.setGroupAdmin({ groupId, username: userId })
    this.store.updateGroupMemberRole(groupId, userId, GROUP_MEMBER_ROLE.ADMIN)
  }

  /** 取消群管理员 */
  async removeGroupAdmin(groupId: string, userId: string) {
    await this.connection.removeGroupAdmin({ groupId, username: userId })
    this.store.updateGroupMemberRole(groupId, userId, GROUP_MEMBER_ROLE.MEMBER)
  }

  /** 接受群邀请（4.x 需显式传被邀请人即当前用户 ID） */
  async acceptGroupInvitation(groupId: string) {
    await this.connection.acceptGroupInvite({ invitee: this.client.currentUserId, groupId })
  }

  /** 拒绝群邀请 */
  async declineGroupInvitation(groupId: string) {
    await this.connection.rejectGroupInvite({ invitee: this.client.currentUserId, groupId })
  }

  /** 同意入群申请 */
  async acceptGroupJoinRequest(groupId: string, userId: string) {
    await this.connection.acceptGroupJoinRequest({ applicant: userId, groupId })
  }

  /** 拒绝入群申请 */
  async rejectGroupJoinRequest(groupId: string, userId: string, reason: string) {
    await this.connection.rejectGroupJoinRequest({ applicant: userId, groupId, reason })
  }

  /** 更新群基础资料（名称/描述/头像/扩展字段；4.x modifyGroup 仅支持这四项） */
  async updateGroupInfo(
    groupId: string,
    input: { name?: string, description?: string, avatar?: string, ext?: string },
  ) {
    await this.connection.modifyGroup({
      groupId,
      groupName: input.name,
      description: input.description,
      avatar: input.avatar,
      ext: input.ext,
    })
    const patch: Partial<UiGroup> = {}
    if (input.name !== undefined)
      patch.groupName = input.name
    if (input.description !== undefined)
      patch.description = input.description
    if (input.avatar !== undefined)
      patch.avatar = input.avatar
    this.store.updateGroup(groupId, patch)
  }

  /**
   * 更新群配置（公开/审批/邀请/最大人数等）。
   * 4.24.2 无修改群配置 API（已核对源码：modifyGroup 仅支持 name/avatar/description/ext），
   * 这些配置只能在 createGroupVNext 创建时指定。此处仅告警并跳过，不做乐观更新避免误导 UI。
   */
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
    groupDomainLog.warn('updateGroupConfigs 4.x 不支持（无对应 API），已跳过', { groupId, input })
  }

  /** 开启全员禁言 */
  async muteAllGroupMembers(groupId: string) {
    await this.connection.disableSendGroupMsg({ groupId })
    this.store.updateGroup(groupId, { mute: true })
  }

  /** 关闭全员禁言 */
  async unmuteAllGroupMembers(groupId: string) {
    await this.connection.enableSendGroupMsg({ groupId })
    this.store.updateGroup(groupId, { mute: false })
  }

  /**
   * 禁言指定成员。
   * @param groupId 群组 ID
   * @param userIds 被禁言成员 ID 列表
   * @param muteDuration 禁言时长，单位为毫秒；传 -1 表示永久禁言（4.x 语义同 5.x）。
   */
  async muteGroupMembers(groupId: string, userIds: string[], muteDuration: number) {
    groupDomainLog.info('muteGroupMembers request raw', { groupId, userIds, muteDuration })
    const res = await this.connection.muteGroupMember({ groupId, username: userIds, muteDuration })
    groupDomainLog.info('muteGroupMembers response raw', unwrap(res))
    this.store.addGroupMuteMembers(groupId, userIds)
  }

  /** 解除指定成员禁言 */
  async unmuteGroupMembers(groupId: string, userIds: string[]) {
    groupDomainLog.info('unmuteGroupMembers request raw', { groupId, userIds })
    const res = await this.connection.unmuteGroupMember({ groupId, username: userIds })
    groupDomainLog.info('unmuteGroupMembers response raw', unwrap(res))
    this.store.removeGroupMuteMembers(groupId, userIds)
  }

  /** 获取群禁言列表（4.x 不支持分页参数，pageNum/pageSize 仅为接口对齐保留） */
  async getGroupMuteList(groupId: string, _pageNum?: number, _pageSize?: number) {
    const res = await this.connection.getGroupMuteList({ groupId })
    const result = unwrap(res) ?? []
    // 同步 store 缓存，确保管理入口的计数 badge 正确显示
    this.store.setGroupMuteList(groupId, toUiGroupMuteMembers(result))
    return result
  }

  /** 获取群黑名单（4.x 返回 userId 数组、不支持分页参数） */
  async getGroupBlocklist(groupId: string, _pageNum?: number, _pageSize?: number) {
    const res = await this.connection.getGroupBlocklist({ groupId })
    const result = (unwrap(res) ?? []).filter(Boolean)
    // 同步 store 缓存，确保管理入口的计数 badge 正确显示
    this.store.setGroupBlocklist(groupId, toUiGroupMembersFromIds(result))
    return result
  }

  /** 将成员加入群黑名单 */
  async blockGroupMembers(groupId: string, userIds: string[]) {
    await this.connection.blockGroupMembers({ groupId, usernames: userIds })
    this.store.addGroupBlocklistMembers(groupId, userIds)
  }

  /** 将成员移出群黑名单 */
  async unblockGroupMembers(groupId: string, userIds: string[]) {
    await this.connection.unblockGroupMembers({ groupId, usernames: userIds })
    this.store.removeGroupBlocklistMembers(groupId, userIds)
  }

  /** 获取群白名单（4.x 返回 userId 数组） */
  async getGroupAllowlist(groupId: string) {
    const res = await this.connection.getGroupAllowlist({ groupId })
    const result = (unwrap(res) ?? []).filter(Boolean)
    // 同步 store 缓存，确保管理入口的计数 badge 正确显示
    this.store.setGroupAllowlist(groupId, toUiGroupMembersFromIds(result))
    return result
  }

  /** 将成员加入群白名单 */
  async addUsersToGroupAllowlist(groupId: string, userIds: string[]) {
    await this.connection.addUsersToGroupAllowlist({ groupId, users: userIds })
  }

  /** 将成员移出群白名单（4.x 仅支持单人移除，批量逐次调用） */
  async removeUsersFromGroupAllowlist(groupId: string, userIds: string[]) {
    for (const userId of userIds) {
      await this.connection.removeGroupAllowlistMember({ groupId, userName: userId })
    }
  }

  /** 检查当前用户是否在群白名单中 */
  async checkIfInGroupAllowList(groupId: string) {
    const res = await this.connection.isInGroupAllowlist({
      groupId,
      userName: this.client.currentUserId,
    })
    return unwrap(res)?.white ?? false
  }

  /** 检查当前用户是否在群禁言列表中 */
  async checkIfInGroupMuteList(groupId: string) {
    const res = await this.connection.isInGroupMutelist({ groupId })
    return unwrap(res) ?? false
  }

  /** 获取群共享文件列表 */
  async getGroupSharedFileList(groupId: string, pageNum = 1, pageSize = 10) {
    const res = await this.connection.getGroupSharedFilelist({ groupId, pageNum, pageSize })
    return unwrap(res)
  }

  /** 上传群共享文件（4.x uploadGroupSharedFile 无 Promise 返回，用回调包装） */
  async uploadGroupSharedFile(groupId: string, file: File) {
    return new Promise((resolve, reject) => {
      this.connection.uploadGroupSharedFile({
        groupId,
        file,
        onFileUploadComplete: (res: unknown) => {
          resolve(res)
        },
        onFileUploadError: (err: unknown) => {
          reject(err)
        },
      })
    })
  }

  /** 删除群共享文件 */
  async deleteGroupSharedFile(groupId: string, fileId: string) {
    await this.connection.deleteGroupSharedFile({ groupId, fileId })
  }

  /** 下载群共享文件（4.x 回调直接返回 Blob） */
  async downloadGroupSharedFile(groupId: string, fileId: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.connection.downloadGroupSharedFile({
        groupId,
        fileId,
        onFileDownloadComplete: (data: Blob) => {
          resolve(data)
        },
        onFileDownloadError: (err: unknown) => reject(err),
      })
    })
  }
}

export type { GroupStoreLike }
