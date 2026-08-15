import type { UserInfo } from 'easemob-websdk'
import { MESSAGE_STATUS, MESSAGE_TYPE } from '../../constants'
import type { ConversationTypeValue, NoticeEventTypeValue } from '../../constants'
import { t } from '../../locale'
import type { UiMessage, UiNoticeMessage } from '../types'

/**
 * insertChatNotice 依赖的最小 Store 集合（结构类型）。
 * 场景包（uikit-im / uikit-chatroom）传入的完整 RootStores 只要结构兼容即可，
 * core 不依赖具体场景 store 定义。
 */
export interface NoticeStores {
  client: {
    currentUser: string
  }
  message: {
    addMessage: (message: UiMessage) => void
  }
}

/** 通知插入上下文：调用点提供事件类型/参数/默认文案，conversationId/conversationType 由管线自动补全 */
export interface NoticeInsertContext {
  /** 通知事件类型 */
  eventType: NoticeEventTypeValue
  /** 结构化参数（成员名/群名/数量等），供自定义文案与条件过滤使用 */
  params: Record<string, string | number | boolean>
  /** 内置文案（已按当前语言解析），renderText 返回空值时回落 */
  defaultText: string
}

/** 通知事件完整上下文：插入上下文 + 会话信息，供 renderText / filter 消费 */
export interface NoticeContext extends NoticeInsertContext {
  /** 目标会话 ID */
  conversationId: string
  /** 目标会话类型 */
  conversationType: ConversationTypeValue
}

/**
 * 系统通知自定义配置。
 * 通过 <UIKitProvider :notice-config="..." /> 传入；默认全开，所有通知按内置文案展示。
 */
export interface NoticeConfig {
  /** 自定义文案：返回非空字符串覆盖内置文案；返回 null/undefined/'' 回落 defaultText */
  renderText?: (context: NoticeContext) => string | null | undefined
  /** 是否展示：返回 false 时该通知不上屏（不插入消息） */
  filter?: (context: NoticeContext) => boolean
  /** 直接禁用的通知事件类型 */
  disabledEvents?: NoticeEventTypeValue[]
}

/** 模块级配置解析器：由 useUIKitProvider 注册（对齐 locale 的模块级 currentLocale 模式） */
let noticeConfigResolver: () => NoticeConfig = () => ({})

/** 注册通知配置解析器（内部使用，Provider 装配时调用） */
export function setNoticeConfigResolver(resolver: () => NoticeConfig) {
  noticeConfigResolver = resolver
}

/** 获取当前通知配置（无配置时回落空实现） */
export function getNoticeConfig(): NoticeConfig {
  return noticeConfigResolver()
}

/** 获取当前注册的解析器本身（内部使用：Provider 卸载时用于判断解析器是否仍属于自己） */
export function getNoticeConfigResolver(): () => NoticeConfig {
  return noticeConfigResolver
}

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
  eventType?: NoticeEventTypeValue,
  params?: Record<string, string | number | boolean>,
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
    body: { content, ...(eventType ? { eventType } : {}), ...(params ? { params } : {}) },
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
 * content 可为纯文本（向后兼容）或结构化 NoticeContext：
 * 结构化上下文会统一流经 noticeConfig 管线（disabledEvents → filter → renderText），
 * 最终文案为空时不插入。
 */
export function insertChatNotice(
  stores: NoticeStores,
  conversationId: string,
  conversationType: ConversationTypeValue,
  content: string | NoticeInsertContext,
) {
  // 纯文本：无事件类型的通知（不参与管线过滤，向后兼容）
  if (typeof content === 'string') {
    if (!content)
      return
    const notice = createNoticeMessage(
      content,
      conversationId,
      conversationType,
      stores.client.currentUser || '',
    )
    stores.message.addMessage(notice)
    return
  }

  // 补全完整上下文（会话信息由管线补充）
  const context: NoticeContext = { ...content, conversationId, conversationType }

  // 结构化管线：禁用事件 / 条件过滤 / 自定义文案
  const config = getNoticeConfig()
  if (config.disabledEvents?.includes(context.eventType))
    return
  if (config.filter && !config.filter(context))
    return
  const customText = config.renderText?.(context)
  const finalText = typeof customText === 'string' && customText !== ''
    ? customText
    : context.defaultText
  if (!finalText)
    return

  const notice = createNoticeMessage(
    finalText,
    conversationId,
    conversationType,
    stores.client.currentUser || '',
    context.eventType,
    context.params,
  )
  stores.message.addMessage(notice)
}
