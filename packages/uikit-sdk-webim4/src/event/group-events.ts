import type { EasemobChat } from 'easemob-websdk-4'
import type { UiContactInvite, UiGroup, UserInfo } from '@easemob-community/uikit-sdk-contract'
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE, createLogger } from '@easemob-community/uikit-sdk-contract'
import { getEventHandlerDeps } from './deps'
import type { EventStores } from './types'

const groupLog = createLogger('UIKit:Webim4GroupEvents')

/** 4.x onGroupEvent 事件载荷（类型为 EasemobChat.GroupEvent；运行时扩展字段经 any 防御读取） */
type GroupEventData = EasemobChat.GroupEvent & {
  /** membersPresence / membersAbsence 携带的成员 userId 列表（运行时字段，类型未声明） */
  members?: unknown[]
  /** muteMember 携带的禁言到期时间戳（运行时字段，类型未声明） */
  muteTimestamp?: number
}

/** 成员字段兜底解析：members 数组项可能是 userId 字符串或 JID 形态对象 */
function toMemberUserId(item: unknown): string {
  if (typeof item === 'string')
    return item
  if (item && typeof item === 'object') {
    const jid = item as { name?: string, userId?: string }
    return jid.userId || jid.name || ''
  }
  return ''
}

/** 提取成员变动事件的成员 userId 列表（单成员走 from，多成员走 members） */
function extractMemberIds(payload: GroupEventData): string[] {
  if (Array.isArray(payload.members) && payload.members.length > 0) {
    return payload.members.map(toMemberUserId).filter(Boolean)
  }
  return payload.from ? [payload.from] : []
}

function toUiGroupInvite(payload: GroupEventData, status: UiContactInvite['status'] = 'pending'): UiContactInvite {
  return {
    id: payload.id,
    type: 'group',
    groupId: payload.id,
    groupName: payload.name,
    inviterId: payload.from,
    reason: payload.reason,
    status,
    timestamp: Date.now(),
  }
}

/** 解析成员变动通知中的展示名：单成员直接展示，多成员取首位非当前用户并带总数 */
function formatMemberNotice(
  memberIds: readonly string[],
  currentUserId: string,
  singleKey: string,
  multipleKey: string,
): string {
  const { t, resolveNoticeUserName } = getEventHandlerDeps()
  if (memberIds.length === 0)
    return ''
  if (memberIds.length === 1) {
    const name = memberIds[0] === currentUserId ? t('chat.notice.you') : resolveNoticeUserName({ userId: memberIds[0] } as UserInfo)
    return t(singleKey).replace('{name}', name)
  }
  const nonSelf = memberIds.find(id => id !== currentUserId)
  const name = resolveNoticeUserName({ userId: nonSelf ?? memberIds[0] } as UserInfo)
  return t(multipleKey).replace('{name}', name).replace('{count}', String(memberIds.length))
}

/** 成员变动通知的结构化参数：展示名 + 数量 + 成员 ID 列表（供自定义文案/过滤使用） */
function buildMemberNoticeParams(
  memberIds: readonly string[],
  currentUserId: string,
): Record<string, string | number | boolean> {
  const { t, resolveNoticeUserName } = getEventHandlerDeps()
  const nonSelf = memberIds.find(id => id !== currentUserId) ?? memberIds[0]
  const name = nonSelf === currentUserId ? t('chat.notice.you') : resolveNoticeUserName(nonSelf ? { userId: nonSelf } as UserInfo : undefined)
  return {
    name,
    count: memberIds.length,
    userIds: memberIds.join(','),
  }
}

/**
 * 创建 4.x 群组事件处理器（`onGroupEvent` 单入口，按 `operation` 分发）。
 *
 * 与 5.x 事件模型的差异（已核对 4.24.3 EventHandlerType / handleMucMsg 源码）：
 * - 5.x 是 GroupManager 上按语义拆分的回调（onMembersJoined/onAdminAdded/...），
 *   4.x 收敛为 connection 级 `onGroupEvent({ operation, id, from, userId?, name?, detail?, ... })`；
 * - 载荷普遍不含 UserInfo 对象（仅 userId 字符串），展示名走注入的 resolveNoticeUserName；
 * - 4.24.3 起 removeAdmin / changeOwner / unblockMember / removeMember / inviteToJoin
 *   载荷携带 `userId`（目标用户）；`uploadFile` / `deleteFile` 等事件载荷仍缺关键字段（见各分支注释）。
 */
export function createGroupHandlers(stores: EventStores): Partial<EasemobChat.EventHandlerType> {
  const { t, insertChatNotice, buildAnnouncementNoticeText, resolveNoticeUserName } = getEventHandlerDeps()

  function isJoinedGroup(groupId: string): boolean {
    return stores.group.groupList.some(g => g.groupId === groupId)
  }

  /** 自己被拉进群/申请通过后的通用收尾：更新邀请状态 + 确保群在列表 */
  function handleSelfJoined(groupId: string, groupName?: string) {
    if (stores.contact.getInvite(groupId)) {
      stores.contact.updateInviteStatus(groupId, 'accepted')
    }
    if (!stores.group.getGroupById(groupId)) {
      stores.group.addGroup({ groupId, groupName })
    }
  }

  function onGroupEvent(payload: GroupEventData) {
    const groupId = payload.id
    const currentUser = stores.client.currentUser || ''
    groupLog.info('onGroupEvent raw payload', payload)

    switch (payload.operation) {
      // ===== 邀请与申请 =====
      case 'inviteToJoin': {
        // 收到入群邀请（邀请人为 from，群名为 name）
        const invite = toUiGroupInvite(payload, isJoinedGroup(groupId) ? 'accepted' : 'pending')
        stores.contact.addInvite(invite)
        break
      }
      case 'directJoined': {
        // 被直接拉进群（无需确认）
        stores.contact.addInvite(toUiGroupInvite(payload, 'accepted'))
        handleSelfJoined(groupId, payload.name)
        break
      }
      case 'acceptInvite': {
        // 对方接受了入群邀请
        stores.contact.updateInviteStatus(groupId, 'accepted')
        break
      }
      case 'rejectInvite': {
        // 对方拒绝了入群邀请
        stores.contact.updateInviteStatus(groupId, 'declined')
        break
      }
      case 'requestToJoin': {
        // 收到入群申请（群主/管理员收；申请人为 from，附言为 reason）
        const list = stores.group.getGroupJoinRequests(groupId)
        stores.group.setGroupJoinRequests(groupId, [
          ...list,
          {
            groupId,
            groupName: payload.name,
            applicantId: payload.from,
            applicant: { userId: payload.from },
            reason: payload.reason,
            status: 'pending',
            timestamp: Date.now(),
          },
        ])
        break
      }
      case 'acceptRequest': {
        // 自己的入群申请被同意（仅申请人收）：清除本用户在该群的 pending 申请
        const list = stores.group.getGroupJoinRequests(groupId)
          .filter(r => !(r.status === 'pending' && (r.applicantId === currentUser || r.applicant?.userId === currentUser)))
        stores.group.setGroupJoinRequests(groupId, list)
        handleSelfJoined(groupId, payload.name)
        break
      }
      case 'joinPublicGroupDeclined': {
        // 自己的入群申请被拒绝（仅申请人收；userId 为申请人）
        stores.group.updateGroupJoinRequest(groupId, payload.userId || currentUser, 'declined')
        break
      }

      // ===== 成员进出 =====
      case 'memberPresence':
      case 'membersPresence': {
        const memberIds = extractMemberIds(payload)
        if (memberIds.includes(currentUser))
          handleSelfJoined(groupId, payload.name)
        stores.group.incrementMemberCount(groupId, memberIds.length)
        const noticeText = formatMemberNotice(memberIds, currentUser, 'chat.notice.memberJoined', 'chat.notice.memberJoinedMultiple')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.MEMBER_JOINED,
          params: buildMemberNoticeParams(memberIds, currentUser),
          defaultText: noticeText,
        })
        break
      }
      case 'memberAbsence':
      case 'membersAbsence': {
        const memberIds = extractMemberIds(payload)
        stores.group.decrementMemberCount(groupId, memberIds.length)
        const noticeText = formatMemberNotice(memberIds, currentUser, 'chat.notice.memberExited', 'chat.notice.memberExitedMultiple')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.MEMBER_EXITED,
          params: buildMemberNoticeParams(memberIds, currentUser),
          defaultText: noticeText,
        })
        break
      }
      case 'removeMember': {
        // 4.24.3 起 payload.userId 标识被移出者；无 userId（旧包）按仅当事人收的语义回落为「自己」
        const removedUserId = payload.userId || currentUser
        if (removedUserId === currentUser) {
          // 自己被移出群（或被加入黑名单）：移除群 + 删会话 + 清消息
          stores.group.removeGroup(groupId)
          stores.conversation.deleteConversation(groupId)
          stores.message.clearConversationMessages(groupId)
        }
        else {
          // 其他成员被移出：只减成员数，不动群/会话
          stores.group.decrementMemberCount(groupId, 1)
        }
        const name = removedUserId === currentUser ? t('chat.notice.you') : resolveNoticeUserName({ userId: removedUserId } as UserInfo)
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.USER_REMOVED,
          params: { name, userId: removedUserId },
          defaultText: t('chat.notice.userRemoved').replace('{name}', name),
        })
        break
      }
      case 'unblockMember': {
        // 被移出群黑名单：无 store 语义（不会自动回群），仅记录；4.24.3 起 userId 标识被移出者
        groupLog.info('onGroupEvent unblockMember（被移出黑名单），不自动回群', { groupId, userId: payload.userId })
        break
      }

      // ===== 群资料与配置 =====
      case 'create': {
        // 当前用户在其他设备创建了群
        if (!stores.group.getGroupById(groupId)) {
          stores.group.addGroup({ groupId, groupName: payload.name })
        }
        break
      }
      case 'updateInfo': {
        // 群信息修改（detail 为 GroupModifyInfo：name/description/avatar/public/approval/allowInvites/maxUsers/inviteNeedConfirm）
        const detail = payload.detail ?? {}
        const prevGroup = stores.group.getGroupById(groupId)
        const patch: Record<string, unknown> = {}
        if (detail.name !== undefined)
          patch.groupName = detail.name
        if (detail.description !== undefined)
          patch.description = detail.description
        if (detail.avatar !== undefined)
          patch.avatar = detail.avatar
        if (detail.public !== undefined)
          patch.public = detail.public
        if (detail.approval !== undefined)
          patch.approval = detail.approval
        if (detail.allowInvites !== undefined)
          patch.allowInvites = detail.allowInvites
        if (detail.maxUsers !== undefined)
          patch.maxUsers = detail.maxUsers
        stores.group.updateGroup(groupId, patch)
        // 仅群名称实际变更时插入系统通知（描述/头像变更不提示，避免刷屏）
        if (detail.name && prevGroup?.groupName && detail.name !== prevGroup.groupName) {
          insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
            eventType: NOTICE_EVENT_TYPE.GROUP_NAME_CHANGED,
            params: { name: detail.name },
            defaultText: t('chat.notice.groupNameChanged').replace('{name}', detail.name),
          })
          // 同步会话名称：会话列表/聊天头部/详情抽屉均展示 conversation.name
          stores.conversation.updateConversation(groupId, { name: detail.name })
        }
        break
      }
      case 'destroy': {
        stores.group.removeGroup(groupId)
        // 群被解散：按 SDK 初始化配置 deleteConversationOnGroupDestroyed 决定是否删除会话并清空本地消息
        if (stores.client.client?.deleteConversationOnGroupDestroyed ?? true) {
          stores.conversation.deleteConversation(groupId)
          stores.message.clearConversationMessages(groupId)
        }
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.GROUP_DESTROYED,
          params: {},
          defaultText: t('chat.notice.groupDestroyed'),
        })
        break
      }

      // ===== 角色变更 =====
      case 'changeOwner': {
        // 4.24.3 起 payload.userId 直接给出新群主；旧包无此字段时回落：
        // payload.from 是旧群主（操作者），真正的新群主从 UIKit 飞行中的 pending 标记读取；
        // 若 pending 已清除但当前用户是旧群主且本地 group.owner 已变化，说明是本设备刚完成转让。
        const prevOwnerId = payload.from || ''
        const pendingNewOwner = stores.group.getPendingOwnerTransfer?.(groupId)
        const localOwner = stores.group.getGroupById(groupId)?.owner
        let newOwnerId = payload.userId || pendingNewOwner
        if (!newOwnerId && currentUser && currentUser === prevOwnerId && localOwner && localOwner !== currentUser) {
          newOwnerId = localOwner
        }
        if (newOwnerId) {
          const patch: Partial<UiGroup> = { owner: newOwnerId }
          if (currentUser) {
            if (currentUser === newOwnerId)
              patch.role = GROUP_MEMBER_ROLE.OWNER
            else if (currentUser === prevOwnerId)
              patch.role = GROUP_MEMBER_ROLE.MEMBER
          }
          stores.group.updateGroup(groupId, patch)
          stores.group.updateGroupMemberRole(groupId, newOwnerId, GROUP_MEMBER_ROLE.OWNER)
          // 旧群主降级为普通成员，避免视图权限残留
          if (prevOwnerId && prevOwnerId !== newOwnerId)
            stores.group.updateGroupMemberRole(groupId, prevOwnerId, GROUP_MEMBER_ROLE.MEMBER)
          stores.group.clearPendingOwnerTransfer?.(groupId)
        }
        // 系统通知：展示名优先用新 owner；无法确定时回落到旧 owner
        const noticeOwnerId = newOwnerId || prevOwnerId
        const name = noticeOwnerId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(noticeOwnerId ? { userId: noticeOwnerId } as UserInfo : undefined)
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.OWNER_CHANGED,
          params: { name, ownerId: noticeOwnerId },
          defaultText: t('chat.notice.ownerChanged').replace('{name}', name),
        })
        break
      }
      case 'setAdmin': {
        // 成为管理员（当事人与其他管理员收；userId 为被设置者）
        const userId = payload.userId || ''
        if (userId)
          stores.group.updateGroupMemberRole(groupId, userId, GROUP_MEMBER_ROLE.ADMIN)
        const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(userId ? { userId } as UserInfo : undefined)
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ADMIN_ADDED,
          params: { name, userId },
          defaultText: t('chat.notice.adminAdded').replace('{name}', name),
        })
        break
      }
      case 'removeAdmin': {
        // 被取消管理员。4.24.3 起 payload.userId 标识被移除者，可可靠定位目标管理员并更新角色；
        // 旧包无 userId（from 为操作者）时跳过角色更新，仅发通知。
        const userId = payload.userId || ''
        if (userId)
          stores.group.updateGroupMemberRole(groupId, userId, GROUP_MEMBER_ROLE.MEMBER)
        const name = userId === currentUser ? t('chat.notice.you') : resolveNoticeUserName(userId ? { userId } as UserInfo : undefined)
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ADMIN_REMOVED,
          params: { name, userId },
          defaultText: t('chat.notice.adminRemoved').replace('{name}', name),
        })
        break
      }

      // ===== 禁言 =====
      case 'muteMember': {
        const userId = payload.userId || ''
        if (userId) {
          stores.group.addGroupMuteMembers(groupId, [{ userId, muteExpire: payload.muteTimestamp }])
        }
        const name = userId === currentUser ? t('chat.notice.you') : (userId || payload.from || '')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.MUTE_ADDED,
          params: { names: name, count: 1 },
          defaultText: t('group.mutelist.muteNotice').replace('{name}', name),
        })
        break
      }
      case 'unmuteMember': {
        const userId = payload.userId || ''
        if (userId)
          stores.group.removeGroupMuteMembers(groupId, [userId])
        const name = userId === currentUser ? t('chat.notice.you') : (userId || payload.from || '')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.MUTE_REMOVED,
          params: { names: name, count: 1 },
          defaultText: t('group.mutelist.unmuteNotice').replace('{name}', name),
        })
        break
      }
      case 'muteAllMembers':
      case 'unmuteAllMembers': {
        const isMuted = payload.operation === 'muteAllMembers'
        stores.group.updateGroup(groupId, { mute: isMuted })
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ALL_MEMBER_MUTE_CHANGED,
          params: { muted: isMuted },
          defaultText: t(isMuted ? 'group.mutelist.muteAllNotice' : 'group.mutelist.unmuteAllNotice'),
        })
        break
      }

      // ===== 公告 =====
      case 'updateAnnouncement':
      case 'deleteAnnouncement': {
        // deleteAnnouncement 无 announcement 字段，按空公告处理
        const announcement = payload.operation === 'updateAnnouncement' ? (payload.announcement ?? '') : ''
        stores.group.updateGroup(groupId, { announcement })
        // 同步到独立的公告缓存，保证聊天页顶部 group-announcement-banner 实时刷新
        stores.group.setGroupAnnouncement(groupId, announcement)
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ANNOUNCEMENT_CHANGED,
          params: { announcement },
          defaultText: buildAnnouncementNoticeText(announcement),
        })
        break
      }

      // ===== 白名单 =====
      case 'addUserToAllowlist': {
        const userId = payload.userId || ''
        if (userId)
          stores.group.addGroupAllowlistMembers(groupId, [userId])
        const memberIds = userId ? [userId] : []
        const noticeText = formatMemberNotice(memberIds, currentUser, 'chat.notice.allowlistAdded', 'chat.notice.allowlistAddedMultiple')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ALLOWLIST_ADDED,
          params: buildMemberNoticeParams(memberIds, currentUser),
          defaultText: noticeText,
        })
        break
      }
      case 'removeAllowlistMember': {
        const userId = payload.userId || ''
        if (userId)
          stores.group.removeGroupAllowlistMembers(groupId, [userId])
        const memberIds = userId ? [userId] : []
        const noticeText = formatMemberNotice(memberIds, currentUser, 'chat.notice.allowlistRemoved', 'chat.notice.allowlistRemovedMultiple')
        insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
          eventType: NOTICE_EVENT_TYPE.ALLOWLIST_REMOVED,
          params: buildMemberNoticeParams(memberIds, currentUser),
          defaultText: noticeText,
        })
        break
      }

      // ===== 共享文件 =====
      case 'uploadFile':
      case 'deleteFile': {
        // 4.x 事件载荷不含文件详情（无 fileId/fileName/fileOwner），无法精确维护 store；
        // 消费方在展示共享文件列表前重新拉取即可，此处仅记录日志。
        groupLog.info(`onGroupEvent ${payload.operation}（载荷无文件详情，跳过 store 写入）`, { groupId })
        break
      }

      // ===== 其他 =====
      case 'memberAttributesUpdate': {
        // 群成员自定义属性更新：UIKit 当前无消费方，仅记录
        groupLog.info('onGroupEvent memberAttributesUpdate', { groupId, userId: payload.userId })
        break
      }
      default: {
        groupLog.warn('onGroupEvent 未识别的 operation', payload.operation)
        break
      }
    }
  }

  return { onGroupEvent }
}
