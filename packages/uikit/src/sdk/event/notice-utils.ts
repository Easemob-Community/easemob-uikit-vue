import type { UserInfo } from 'easemob-websdk'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '../../constants'
import type { ConversationTypeValue } from '../../constants'
import { t } from '../../locale'
import type { UiMessage, UiNoticeMessage } from '../types'
import type { RootStores } from './types'

/** 从 SDK UserInfo 中提取展示名：昵称优先，其次用户 ID */
export function resolveNoticeUserName(user?: UserInfo | null): string {
  return user?.nickname || user?.userId || ''
}

/** 生成唯一本地通知消息 ID */
function generateNoticeId(): string {
  return `notice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 构建一条本地通知消息。
 * 该消息不会发送到服务端，仅用于在当前设备的聊天页面展示中性灰色提示。
 */
export function createNoticeMessage(
  content: string,
  conversationId: string,
  conversationType: ConversationTypeValue,
  currentUserId: string,
): UiNoticeMessage {
  const id = generateNoticeId()
  return {
    msgLocalId: id,
    msgServerId: '',
    localId: id,
    from: currentUserId,
    to: conversationId,
    conversationId,
    conversationType,
    type: MESSAGE_TYPE.NOTICE,
    body: { content },
    timestamp: Date.now(),
    status: MESSAGE_STATUS.SENT,
    isSelf: false,
    sender: { userId: currentUserId },
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
  } as unknown as UiNoticeMessage
}

/** 类型守卫：判断消息是否为本地通知消息 */
export function isNoticeMessage(message: UiMessage): message is UiNoticeMessage {
  return message.type === MESSAGE_TYPE.NOTICE
}

/**
 * 构建群公告更新的通知文案：内容非空时附上最新公告内容，为空时只显示固定文案。
 * 发布方与接收方共用，保证文案一致。
 */
export function buildAnnouncementNoticeText(announcement: string): string {
  if (!announcement)
    return t('chat.notice.announcementChanged')
  return t('chat.notice.announcementChangedWithContent').replace('{content}', announcement)
}

/**
 * 向指定会话插入一条本地通知消息。
 * content 为空时不插入。
 */
export function insertChatNotice(
  stores: RootStores,
  conversationId: string,
  conversationType: ConversationTypeValue,
  content: string,
) {
  if (!content)
    return
  const notice = createNoticeMessage(
    content,
    conversationId,
    conversationType,
    stores.client.currentUser || '',
  )
  stores.message.addMessage(notice)
}
