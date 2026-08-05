import type {
  GroupAdminAddedEventPayload,
  GroupAdminRemovedEventPayload,
  GroupAllMemberMuteStateChangedEventPayload,
  GroupAllowListAddedEventPayload,
  GroupAllowListRemovedEventPayload,
  GroupAnnouncementChangedEventPayload,
  GroupAutoAcceptInvitationEventPayload,
  GroupDestroyedEventPayload,
  GroupEventHandlerMap,
  GroupInvitationReceivedEventPayload,
  GroupMembersExitedEventPayload,
  GroupMembersJoinedEventPayload,
  GroupMuteListAddedEventPayload,
  GroupMuteListRemovedEventPayload,
  GroupOwnerChangedEventPayload,
  GroupRequestToJoinAcceptedEventPayload,
  GroupRequestToJoinDeclinedEventPayload,
  GroupRequestToJoinReceivedEventPayload,
  GroupSharedFileAddedEventPayload,
  GroupSharedFileDeletedEventPayload,
  GroupUserRemovedEventPayload,
  UserInfo,
} from 'easemob-websdk'
import { t } from '../../locale'
import { createLogger } from '../../utils/logger'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'
import { insertChatNotice, resolveNoticeUserName } from './notice-utils'

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

/** 解析成员变动通知中的展示名：单成员直接展示，多成员取首位非当前用户并带总数 */
function formatMemberNotice(
  members: ReadonlyArray<UserInfo>,
  currentUserId: string,
  singleKey: string,
  multipleKey: string,
): string {
  if (members.length === 0)
    return ''
  const first = members[0]
  if (members.length === 1) {
    const name = first.userId === currentUserId ? t('chat.notice.you') : resolveNoticeUserName(first)
    return t(singleKey).replace('{name}', name)
  }
  const nonSelf = members.find(m => m.userId !== currentUserId)
  const name = nonSelf ? resolveNoticeUserName(nonSelf) : resolveNoticeUserName(first)
  return t(multipleKey).replace('{name}', name).replace('{count}', String(members.length))
}

/** 创建 GroupManager 事件处理器。 */
export function createGroupHandlers(stores: RootStores): GroupEventHandlerMap {
  function isJoinedGroup(groupId: string): boolean {
    return stores.group.groupList.some(g => g.groupId === groupId)
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
      const isSelfJoining = members.some(m => m.userId === currentUser)
      if (isSelfJoining) {
        if (stores.contact.getInvite(payload.groupId)) {
          stores.contact.updateInviteStatus(payload.groupId, 'accepted')
        }
        if (!stores.group.getGroupById(payload.groupId)) {
          stores.group.addGroup({ groupId: payload.groupId, groupName: (payload as any).groupName })
        }
      }
      stores.group.incrementMemberCount(payload.groupId, members.length)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        members,
        currentUser || '',
        'chat.notice.memberJoined',
        'chat.notice.memberJoinedMultiple',
      )
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onMembersExited: (payload: GroupMembersExitedEventPayload) => {
      const members = payload.members || []
      groupLog.info('onMembersExited', { groupId: payload.groupId, count: members.length })
      stores.group.decrementMemberCount(payload.groupId, members.length)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        members,
        stores.client.currentUser || '',
        'chat.notice.memberExited',
        'chat.notice.memberExitedMultiple',
      )
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
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
    onOwnerChanged: (payload: GroupOwnerChangedEventPayload) => {
      groupLog.info('onOwnerChanged', { groupId: payload.groupId })
      const newOwnerId = payload.newOwner?.userId || ''
      stores.group.updateGroup(payload.groupId, { owner: newOwnerId })
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = newOwnerId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.newOwner)
      const noticeText = t('chat.notice.ownerChanged').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onAdminAdded: (payload: GroupAdminAddedEventPayload) => {
      groupLog.info('onAdminAdded', { groupId: payload.groupId, userId: payload.administrator?.userId })
      const userId = payload.administrator?.userId
      if (userId)
        stores.group.updateGroupMemberRole(payload.groupId, userId, 'admin')
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.administrator)
      const noticeText = t('chat.notice.adminAdded').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onAdminRemoved: (payload: GroupAdminRemovedEventPayload) => {
      groupLog.info('onAdminRemoved', { groupId: payload.groupId, userId: payload.administrator?.userId })
      const userId = payload.administrator?.userId
      if (userId)
        stores.group.updateGroupMemberRole(payload.groupId, userId, 'member')
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.administrator)
      const noticeText = t('chat.notice.adminRemoved').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onUserRemoved: (payload: GroupUserRemovedEventPayload) => {
      groupLog.info('onUserRemoved', { groupId: payload.groupId })
      // SDK 5.0.0 起 onUserRemoved 仅携带 groupId/groupName，不携带被移出者 ID。
      // 该事件只会下发给被移出的当前登录用户，因此可判定为当前用户被移出。
      const name = t('chat.notice.you')
      stores.group.removeGroup(payload.groupId)
      // 自己被移出群：同时删除会话并清空本地消息，避免僵尸会话残留
      // （deleteConversation 内部会在被删会话是当前会话时把 currentConversationId 置 null）
      stores.conversation.deleteConversation(payload.groupId)
      stores.message.clearConversationMessages(payload.groupId)
      // 插入系统通知到群聊（在清空消息之前插入，否则用户看不到提示）
      const noticeText = t('chat.notice.userRemoved').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onGroupDestroyed: (payload: GroupDestroyedEventPayload) => {
      groupLog.info('onGroupDestroyed', { groupId: payload.groupId })
      stores.group.removeGroup(payload.groupId)
      // 群被解散：按 SDK 初始化配置 deleteConversationOnGroupDestroyed 决定是否删除会话并清空本地消息，
      // 避免 UIKit 无条件覆盖 SDK 行为。
      if (stores.client.client?.deleteConversationOnGroupDestroyed ?? true) {
        stores.conversation.deleteConversation(payload.groupId)
        stores.message.clearConversationMessages(payload.groupId)
      }
      // 插入系统通知到群聊（在清空消息之前插入）
      insertChatNotice(stores, payload.groupId, 'groupChat', t('chat.notice.groupDestroyed'))
    },
    onAnnouncementChanged: (payload: GroupAnnouncementChangedEventPayload) => {
      groupLog.info('onAnnouncementChanged', { groupId: payload.groupId })
      stores.group.updateGroup(payload.groupId, { announcement: payload.announcement })
      // 插入系统通知到群聊
      insertChatNotice(stores, payload.groupId, 'groupChat', t('chat.notice.announcementChanged'))
    },
    onMuteListAdded: (payload: GroupMuteListAddedEventPayload) => {
      groupLog.info('onMuteListAdded', { groupId: payload.groupId, count: (payload.mutes || []).length })
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.addGroupMuteMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const muteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const muteNoticeText = muteNames.map(name => t('group.mutelist.muteNotice').replace('{name}', name)).join('、')
      insertChatNotice(stores, payload.groupId, 'groupChat', muteNoticeText)
    },
    onMuteListRemoved: (payload: GroupMuteListRemovedEventPayload) => {
      groupLog.info('onMuteListRemoved', { groupId: payload.groupId, count: (payload.mutes || []).length })
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.removeGroupMuteMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const unmuteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const unmuteNoticeText = unmuteNames.map(name => t('group.mutelist.unmuteNotice').replace('{name}', name)).join('、')
      insertChatNotice(stores, payload.groupId, 'groupChat', unmuteNoticeText)
    },
    onAllMemberMuteStateChanged: (payload: GroupAllMemberMuteStateChangedEventPayload) => {
      groupLog.info('onAllMemberMuteStateChanged', { groupId: payload.groupId, isMuted: payload.isMuted })
      stores.group.updateGroup(payload.groupId, { mute: payload.isMuted })
      // 插入系统通知到群聊
      const muteAllNotice = t(payload.isMuted ? 'group.mutelist.muteAllNotice' : 'group.mutelist.unmuteAllNotice')
      insertChatNotice(stores, payload.groupId, 'groupChat', muteAllNotice)
    },
    onAllowListAdded: (payload: GroupAllowListAddedEventPayload) => {
      groupLog.info('onAllowListAdded', { groupId: payload.groupId, count: (payload.allowlist || []).length })
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.addGroupAllowlistMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        payload.allowlist || [],
        stores.client.currentUser || '',
        'chat.notice.allowlistAdded',
        'chat.notice.allowlistAddedMultiple',
      )
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
    },
    onAllowListRemoved: (payload: GroupAllowListRemovedEventPayload) => {
      groupLog.info('onAllowListRemoved', { groupId: payload.groupId, count: (payload.allowlist || []).length })
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.removeGroupAllowlistMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        payload.allowlist || [],
        stores.client.currentUser || '',
        'chat.notice.allowlistRemoved',
        'chat.notice.allowlistRemovedMultiple',
      )
      insertChatNotice(stores, payload.groupId, 'groupChat', noticeText)
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
