import type {
  GroupAdminAddedEventPayload,
  GroupAdminRemovedEventPayload,
  GroupAllMemberMuteStateChangedEventPayload,
  GroupAllowListAddedEventPayload,
  GroupAllowListRemovedEventPayload,
  GroupAnnouncementChangedEventPayload,
  GroupAutoAcceptInvitationEventPayload,
  GroupDestroyedEventPayload,
  GroupDisabledChangedEventPayload,
  GroupEventHandlerMap,
  GroupInfoChangedEventPayload,
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
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE } from '../../constants'
import { createLogger } from '../../utils/logger'
import type { UiContactInvite } from '../types'
import type { RootStores } from './types'
import { buildAnnouncementNoticeText, insertChatNotice, resolveNoticeUserName } from './notice-utils'

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
      groupLog.info('onInvitationReceived raw payload', payload)
      const invite = toUiGroupInvite(payload, isJoinedGroup(payload.groupId) ? 'accepted' : 'pending')
      stores.contact.addInvite(invite)
    },
    onInvitationAccepted: (payload) => {
      groupLog.info('onInvitationAccepted raw payload', payload)
      stores.contact.updateInviteStatus(payload.groupId, 'accepted')
    },
    onInvitationDeclined: (payload) => {
      groupLog.info('onInvitationDeclined raw payload', payload)
      stores.contact.updateInviteStatus(payload.groupId, 'declined')
    },
    onAutoAcceptInvitationFromGroup: (payload) => {
      groupLog.info('onAutoAcceptInvitationFromGroup raw payload', payload)
      stores.contact.addInvite(toUiGroupInvite(payload, 'accepted'))
    },
    onMembersJoined: (payload: GroupMembersJoinedEventPayload) => {
      groupLog.info('onMembersJoined raw payload', payload)
      const members = payload.members || []
      const currentUser = stores.client.currentUser
      const isSelfJoining = members.some(m => m.userId === currentUser)
      if (isSelfJoining) {
        if (stores.contact.getInvite(payload.groupId)) {
          stores.contact.updateInviteStatus(payload.groupId, 'accepted')
        }
        if (!stores.group.getGroupById(payload.groupId)) {
          stores.group.addGroup({ groupId: payload.groupId, groupName: payload.groupName })
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
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onMembersExited: (payload: GroupMembersExitedEventPayload) => {
      const members = payload.members || []
      groupLog.info('onMembersExited raw payload', payload)
      stores.group.decrementMemberCount(payload.groupId, members.length)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        members,
        stores.client.currentUser || '',
        'chat.notice.memberExited',
        'chat.notice.memberExitedMultiple',
      )
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onGroupInfoChanged: (payload: GroupInfoChangedEventPayload) => {
      groupLog.info('onGroupInfoChanged raw payload', payload)
      // 兼容两种载荷结构：SDK 5.0.0 为 { groupId, groupInfo: GroupDetail }，旧版本字段在顶层
      const info: any = (payload as any).groupInfo ?? payload
      const newName: string | undefined = info.name ?? info.groupName
      const prevGroup = stores.group.getGroupById(payload.groupId)
      stores.group.updateGroup(payload.groupId, {
        groupName: newName,
        description: info.description,
        avatar: info.avatarUrl ?? info.avatar,
      })
      // 仅群名称实际变更时插入系统通知（描述/头像变更不提示，避免刷屏）
      if (newName && prevGroup?.groupName && newName !== prevGroup.groupName) {
        insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, t('chat.notice.groupNameChanged').replace('{name}', newName))
        // 同步会话名称：会话列表/聊天头部/详情抽屉均展示 conversation.name，
        // 否则需刷新（重新同步会话）才能看到新群名
        stores.conversation.updateConversation(payload.groupId, { name: newName })
      }
    },
    onOwnerChanged: (payload: GroupOwnerChangedEventPayload) => {
      groupLog.info('onOwnerChanged raw payload', payload)
      const newOwnerId = payload.newOwner?.userId || ''
      stores.group.updateGroup(payload.groupId, { owner: newOwnerId })
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = newOwnerId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.newOwner)
      const noticeText = t('chat.notice.ownerChanged').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onAdminAdded: (payload: GroupAdminAddedEventPayload) => {
      groupLog.info('onAdminAdded raw payload', payload)
      const userId = payload.administrator?.userId
      if (userId)
        stores.group.updateGroupMemberRole(payload.groupId, userId, GROUP_MEMBER_ROLE.ADMIN)
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.administrator)
      const noticeText = t('chat.notice.adminAdded').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onAdminRemoved: (payload: GroupAdminRemovedEventPayload) => {
      groupLog.info('onAdminRemoved raw payload', payload)
      const userId = payload.administrator?.userId
      if (userId)
        stores.group.updateGroupMemberRole(payload.groupId, userId, GROUP_MEMBER_ROLE.MEMBER)
      // 插入系统通知到群聊
      const currentUser = stores.client.currentUser || ''
      const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(payload.administrator)
      const noticeText = t('chat.notice.adminRemoved').replace('{name}', name)
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onUserRemoved: (payload: GroupUserRemovedEventPayload) => {
      groupLog.info('onUserRemoved raw payload', payload)
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
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onGroupDestroyed: (payload: GroupDestroyedEventPayload) => {
      groupLog.info('onGroupDestroyed raw payload', payload)
      stores.group.removeGroup(payload.groupId)
      // 群被解散：按 SDK 初始化配置 deleteConversationOnGroupDestroyed 决定是否删除会话并清空本地消息，
      // 避免 UIKit 无条件覆盖 SDK 行为。
      if (stores.client.client?.deleteConversationOnGroupDestroyed ?? true) {
        stores.conversation.deleteConversation(payload.groupId)
        stores.message.clearConversationMessages(payload.groupId)
      }
      // 插入系统通知到群聊（在清空消息之前插入）
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, t('chat.notice.groupDestroyed'))
    },
    onAnnouncementChanged: (payload: GroupAnnouncementChangedEventPayload) => {
      groupLog.info('onAnnouncementChanged raw payload', payload)
      stores.group.updateGroup(payload.groupId, { announcement: payload.announcement })
      // 同步到独立的公告缓存，保证聊天页顶部 group-announcement-banner 实时刷新
      stores.group.setGroupAnnouncement(payload.groupId, payload.announcement)
      // 插入系统通知到群聊（带上最新公告内容，SDK 事件不回推操作者本人）
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, buildAnnouncementNoticeText(payload.announcement))
    },
    onMuteListAdded: (payload: GroupMuteListAddedEventPayload) => {
      groupLog.info('onMuteListAdded raw payload', payload)
      const members = (payload.mutes || []).map((u: any) => ({
        userId: u.userId,
        muteExpire: payload.muteExpire,
      }))
      stores.group.addGroupMuteMembers(payload.groupId, members)
      // 插入系统通知到群聊
      const muteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const muteNoticeText = muteNames.map(name => t('group.mutelist.muteNotice').replace('{name}', name)).join('、')
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, muteNoticeText)
    },
    onMuteListRemoved: (payload: GroupMuteListRemovedEventPayload) => {
      groupLog.info('onMuteListRemoved raw payload', payload)
      const userIds = (payload.mutes || []).map((u: any) => u.userId)
      stores.group.removeGroupMuteMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const unmuteNames = (payload.mutes || []).map((u: any) => u.nickname || u.userId || '')
      const unmuteNoticeText = unmuteNames.map(name => t('group.mutelist.unmuteNotice').replace('{name}', name)).join('、')
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, unmuteNoticeText)
    },
    onAllMemberMuteStateChanged: (payload: GroupAllMemberMuteStateChangedEventPayload) => {
      groupLog.info('onAllMemberMuteStateChanged raw payload', payload)
      stores.group.updateGroup(payload.groupId, { mute: payload.isMuted })
      // 插入系统通知到群聊
      const muteAllNotice = t(payload.isMuted ? 'group.mutelist.muteAllNotice' : 'group.mutelist.unmuteAllNotice')
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, muteAllNotice)
    },
    onAllowListAdded: (payload: GroupAllowListAddedEventPayload) => {
      groupLog.info('onAllowListAdded raw payload', payload)
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.addGroupAllowlistMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        payload.allowlist || [],
        stores.client.currentUser || '',
        'chat.notice.allowlistAdded',
        'chat.notice.allowlistAddedMultiple',
      )
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onAllowListRemoved: (payload: GroupAllowListRemovedEventPayload) => {
      groupLog.info('onAllowListRemoved raw payload', payload)
      const userIds = (payload.allowlist || []).map((u: any) => u.userId)
      stores.group.removeGroupAllowlistMembers(payload.groupId, userIds)
      // 插入系统通知到群聊
      const noticeText = formatMemberNotice(
        payload.allowlist || [],
        stores.client.currentUser || '',
        'chat.notice.allowlistRemoved',
        'chat.notice.allowlistRemovedMultiple',
      )
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
    },
    onGroupDisabledChanged: (payload: GroupDisabledChangedEventPayload) => {
      groupLog.info('onGroupDisabledChanged raw payload', payload)
      stores.group.updateGroup(payload.groupId, { disabled: payload.disabled })
      // 插入系统通知到群聊
      insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, t(payload.disabled ? 'chat.notice.groupDisabled' : 'chat.notice.groupEnabled'))
    },
    onSharedFileAdded: (payload: GroupSharedFileAddedEventPayload) => {
      groupLog.info('onSharedFileAdded raw payload', payload)
      if (payload.sharedFile) {
        stores.group.addGroupSharedFile(payload.groupId, payload.sharedFile)
        // 插入系统通知到群聊（带上传者与文件名；操作者本人收不到该事件，由上传处本地插入）
        const uploader = payload.sharedFile.fileOwner
        const name = uploader?.userId === stores.client.currentUser
          ? t('chat.notice.you')
          : resolveNoticeUserName(uploader)
        const noticeText = t('chat.notice.sharedFileAdded')
          .replace('{name}', name || uploader?.userId || '')
          .replace('{fileName}', payload.sharedFile.fileName)
        insertChatNotice(stores, payload.groupId, CONVERSATION_TYPE.GROUPCHAT, noticeText)
      }
    },
    onSharedFileDeleted: (payload: GroupSharedFileDeletedEventPayload) => {
      groupLog.info('onSharedFileDeleted raw payload', payload)
      stores.group.removeGroupSharedFile(payload.groupId, payload.fileId)
    },
    onRequestToJoinReceived: (payload: GroupRequestToJoinReceivedEventPayload) => {
      groupLog.info('onRequestToJoinReceived raw payload', payload)
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
      groupLog.info('onRequestToJoinAccepted raw payload', payload)
      // 该事件载荷只有 accepter（同意申请的管理员），没有申请人字段。
      // 取舍：收到此事件意味着当前登录用户的申请被同意，因此清除本用户
      // 在该群的 pending 申请；其他申请人的记录等待下次拉取刷新。
      const currentUser = stores.client.currentUser
      const list = stores.group.getGroupJoinRequests(payload.groupId)
        .filter(r => !(r.status === 'pending' && (r.applicantId === currentUser || r.applicant?.userId === currentUser)))
      stores.group.setGroupJoinRequests(payload.groupId, list)
    },
    onRequestToJoinDeclined: (payload: GroupRequestToJoinDeclinedEventPayload) => {
      groupLog.info('onRequestToJoinDeclined raw payload', payload)
      stores.group.updateGroupJoinRequest(
        payload.groupId,
        payload.applicant?.userId || '',
        'declined',
      )
    },
  }
}
