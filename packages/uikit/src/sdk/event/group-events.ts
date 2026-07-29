import type { GroupAllMemberMuteStateChangedEventPayload, GroupAllowListAddedEventPayload, GroupAllowListRemovedEventPayload, GroupAutoAcceptInvitationEventPayload, GroupEventHandlerMap, GroupInvitationAcceptedEventPayload, GroupInvitationDeclinedEventPayload, GroupInvitationReceivedEventPayload, GroupMembersJoinedEventPayload, GroupMuteListAddedEventPayload, GroupMuteListRemovedEventPayload, GroupRequestToJoinAcceptedEventPayload, GroupRequestToJoinDeclinedEventPayload, GroupRequestToJoinReceivedEventPayload, GroupSharedFileAddedEventPayload, GroupSharedFileDeletedEventPayload } from 'easemob-websdk'
import { t } from '../../locale'
import { createLogger } from '../../utils/logger'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'

const groupLog = createLogger('UIKit:GroupEvents')

function toUiGroupInvite(payload: GroupInvitationReceivedEventPayload | GroupAutoAcceptInvitationEventPayload, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  const groupId = payload.groupId
  const inviter = 'inviter' in payload ? payload.inviter : undefined
  const groupName = 'groupName' in payload ? payload.groupName : undefined
  return {
    id: groupId,
    type: 'group',
    groupId,
    groupName,
    inviterId: inviter?.userId,
    inviterName: inviter?.nickname,
    reason: 'reason' in payload ? payload.reason : undefined,
    status,
    timestamp: Date.now(),
  }
}

/** 创建 GroupManager 事件处理器。 */
export function createGroupHandlers(stores: RootStores): GroupEventHandlerMap {
  function isJoinedGroup(groupId: string): boolean {
    return stores.group.groupList.some(g => g.groupId === groupId)
  }

  /** 插入群操作的系统通知消息到群聊 */
  function insertGroupNotice(
    s: RootStores,
    groupId: string,
    content: string,
  ) {
    if (!content)
      return
    const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    s.message.addMessage({
      msgLocalId: id,
      msgServerId: '',
      type: 'notice' as any,
      body: { content } as any,
      from: s.client.currentUser ?? '',
      to: groupId,
      conversationId: groupId,
      conversationType: 'groupChat' as const,
      timestamp: Date.now(),
      status: 'sent' as const,
      isSelf: false,
      localId: id,
    } as any)
  }

  return {
    onInvitationReceived: (payload) => {
      groupLog.info('onInvitationReceived', { groupId: payload.groupId })
      const invite = toUiGroupInvite(payload, isJoinedGroup(payload.groupId) ? 'accepted' : 'pending')
      stores.contact.addInvite(invite)
    },
    onInvitationAccepted: (payload) => {
      groupLog.info('onInvitationAccepted', { groupId: payload.groupId })
      stores.contact.updateInviteStatus(payload.groupId, 'accepted')
    },
    onInvitationDeclined: (payload) => {
      groupLog.info('onInvitationDeclined', { groupId: payload.groupId })
      stores.contact.updateInviteStatus(payload.groupId, 'declined')
    },
    onAutoAcceptInvitationFromGroup: (payload) => {
      groupLog.info('onAutoAcceptInvitationFromGroup', { groupId: payload.groupId })
      stores.contact.addInvite(toUiGroupInvite(payload, 'accepted'))
    },
    onMembersJoined: (payload: GroupMembersJoinedEventPayload) => {
      groupLog.info('onMembersJoined', { groupId: payload.groupId, count: (payload.members || []).length })
      const members = payload.members || []
      const currentUser = stores.client.currentUser
      const isSelfJoining = members.some((m: any) => (typeof m === 'string' ? m : m?.userId) === currentUser)
      if (isSelfJoining) {
        if (stores.contact.getInvite(payload.groupId)) {
          stores.contact.updateInviteStatus(payload.groupId, 'accepted')
        }
        if (!stores.group.getGroupById(payload.groupId)) {
          stores.group.addGroup({ groupId: payload.groupId, groupName: (payload as any).groupName })
        }
      }
      stores.group.incrementMemberCount(payload.groupId, members.length)
    },
    onMembersExited: (payload) => {
      const p = payload as any
      // 与 onMembersJoined 对齐：members 可能为空，先兜底再取长度
      const members = (p.members || []) as unknown[]
      groupLog.info('onMembersExited', { groupId: p.groupId, count: members.length })
      stores.group.decrementMemberCount(p.groupId, members.length)
    },
    onGroupInfoChanged: (payload) => {
      const p = payload as any
      groupLog.info('onGroupInfoChanged', { groupId: p.groupId })
      stores.group.updateGroup(p.groupId, {
        groupName: p.groupName,
        description: p.description,
        avatar: p.avatar,
      })
    },
    onOwnerChanged: (payload) => {
      const p = payload as any
      groupLog.info('onOwnerChanged', { groupId: p.groupId })
      stores.group.updateGroup(p.groupId, {
        owner: typeof p.newOwner === 'string' ? p.newOwner : p.newOwner?.userId || '',
      })
    },
    onAdminAdded: () => {
      groupLog.info('onAdminAdded')
    },
    onAdminRemoved: () => {
      groupLog.info('onAdminRemoved')
    },
    onUserRemoved: (payload) => {
      const p = payload as any
      groupLog.info('onUserRemoved', { groupId: p.groupId, userId: p.userId })
      if (p.userId === stores.client.currentUser) {
        stores.group.removeGroup(p.groupId)
        // 自己被移出群：同时删除会话并清空本地消息，避免僵尸会话残留
        // （deleteConversation 内部会在被删会话是当前会话时把 currentConversationId 置 null）
        stores.conversation.deleteConversation(p.groupId)
        stores.message.clearConversationMessages(p.groupId)
      }
    },
    onGroupDestroyed: (payload) => {
      const p = payload as any
      groupLog.info('onGroupDestroyed', { groupId: p.groupId })
      stores.group.removeGroup(p.groupId)
      // 群被解散：同上删除会话并清空本地消息
      stores.conversation.deleteConversation(p.groupId)
      stores.message.clearConversationMessages(p.groupId)
    },
    onAnnouncementChanged: (payload) => {
      const p = payload as any
      groupLog.info('onAnnouncementChanged', { groupId: p.groupId })
      stores.group.updateGroup(p.groupId, { announcement: p.announcement })
    },
    onMuteListAdded: (payload: GroupMuteListAddedEventPayload) => {
      groupLog.info('onMuteListAdded', { groupId: payload.groupId, count: (payload.mutes || []).length })
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.addGroupMuteMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const muteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const muteNoticeText = muteNames.map(name => t('group.mutelist.muteNotice').replace('{name}', name)).join('、')
      insertGroupNotice(stores, payload.groupId, muteNoticeText)
    },
    onMuteListRemoved: (payload: GroupMuteListRemovedEventPayload) => {
      groupLog.info('onMuteListRemoved', { groupId: payload.groupId, count: (payload.mutes || []).length })
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.removeGroupMuteMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const unmuteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const unmuteNoticeText = unmuteNames.map(name => t('group.mutelist.unmuteNotice').replace('{name}', name)).join('、')
      insertGroupNotice(stores, payload.groupId, unmuteNoticeText)
    },
    onAllMemberMuteStateChanged: (payload: GroupAllMemberMuteStateChangedEventPayload) => {
      groupLog.info('onAllMemberMuteStateChanged', { groupId: payload.groupId, isMuted: payload.isMuted })
      stores.group.updateGroup(payload.groupId, { mute: payload.isMuted })
      // 插入系统通知到群聊
      const muteAllNotice = t(payload.isMuted ? 'group.mutelist.muteAllNotice' : 'group.mutelist.unmuteAllNotice')
      insertGroupNotice(stores, payload.groupId, muteAllNotice)
    },
    onAllowListAdded: (payload: GroupAllowListAddedEventPayload) => {
      groupLog.info('onAllowListAdded', { groupId: payload.groupId, count: (payload.allowlist || []).length })
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.addGroupAllowlistMembers(payload.groupId, userIds)
    },
    onAllowListRemoved: (payload: GroupAllowListRemovedEventPayload) => {
      groupLog.info('onAllowListRemoved', { groupId: payload.groupId, count: (payload.allowlist || []).length })
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.removeGroupAllowlistMembers(payload.groupId, userIds)
    },
    onSharedFileAdded: (payload: GroupSharedFileAddedEventPayload) => {
      groupLog.info('onSharedFileAdded', { groupId: payload.groupId, fileId: payload.sharedFile?.fileId })
      if (payload.sharedFile) {
        stores.group.addGroupSharedFile(payload.groupId, payload.sharedFile)
      }
    },
    onSharedFileDeleted: (payload: GroupSharedFileDeletedEventPayload) => {
      groupLog.info('onSharedFileDeleted', { groupId: payload.groupId, fileId: payload.fileId })
      stores.group.removeGroupSharedFile(payload.groupId, payload.fileId)
    },
    onRequestToJoinReceived: (payload: GroupRequestToJoinReceivedEventPayload) => {
      groupLog.info('onRequestToJoinReceived', { groupId: payload.groupId, applicant: payload.applicant?.userId })
      const list = stores.group.getGroupJoinRequests(payload.groupId)
      stores.group.setGroupJoinRequests(payload.groupId, [
        ...list,
        {
          groupId: payload.groupId,
          groupName: payload.groupName,
          // 扁平化申请人 ID，供 accepted/declined 状态匹配使用
          applicantId: payload.applicant?.userId,
          applicant: payload.applicant,
          reason: payload.reason,
          status: 'pending',
          timestamp: Date.now(),
        },
      ])
    },
    onRequestToJoinAccepted: (payload: GroupRequestToJoinAcceptedEventPayload) => {
      groupLog.info('onRequestToJoinAccepted', { groupId: payload.groupId, accepter: payload.accepter?.userId })
      // 该事件载荷只有 accepter（同意申请的管理员），没有申请人字段。
      // 取舍：收到此事件意味着当前登录用户的申请被同意，因此清除本用户
      // 在该群的 pending 申请；其他申请人的记录等待下次拉取刷新。
      const currentUser = stores.client.currentUser
      const list = stores.group.getGroupJoinRequests(payload.groupId)
        .filter(r => !(r.status === 'pending' && (r.applicantId === currentUser || r.applicant?.userId === currentUser)))
      stores.group.setGroupJoinRequests(payload.groupId, list)
    },
    onRequestToJoinDeclined: (payload: GroupRequestToJoinDeclinedEventPayload) => {
      groupLog.info('onRequestToJoinDeclined', { groupId: payload.groupId, applicant: payload.applicant?.userId })
      stores.group.updateGroupJoinRequest(
        payload.groupId,
        payload.applicant?.userId || '',
        'declined',
      )
    },
  }
}

