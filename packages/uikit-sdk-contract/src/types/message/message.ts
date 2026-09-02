import type { MessageStatusValue, NoticeEventTypeValue } from '../../constants'
import type { SdkMessage } from './body'

/** UIKit 对中立 SdkMessage 的扩展字段 */
export interface UiMessageExtension {
  /** 是否为自己发送的消息 */
  isSelf: boolean
  /** UI 展示层消息状态（sending/sent/delivered/read/failed），非 SDK 字段 */
  status: MessageStatusValue
  /** 本地消息 ID 别名，方便 UI 层引用 */
  localId?: string
  /** 该消息是否请求群已读回执 */
  requireGroupAck?: boolean
  /** 群成员总数（仅群消息展示用） */
  groupMemberCount?: number
  /** 消息是否已被撤回 */
  recalled?: boolean
  /** 撤回操作者 ID */
  recalledBy?: string
  /** 文本消息撤回后保留的原始内容，用于重新编辑 */
  originalMsg?: string
  /** 是否被置顶（仅用于置顶消息列表展示） */
  pinned?: boolean
  /** 置顶时间 */
  pinTime?: number
  /** 置顶操作人 ID */
  pinOperatorId?: string
  /** 翻译结果 */
  translation?: { text: string, to: string }
  /** 是否优先展示译文 */
  showTranslation?: boolean
  /** 是否正在翻译中 */
  translating?: boolean
  /** 语音转文字结果 */
  voiceText?: { text: string }
  /** 是否优先展示语音转文字结果 */
  showVoiceText?: boolean
  /** 是否正在语音转文字中 */
  voiceTranscribing?: boolean
  /** 发送失败原因 */
  failReason?: string
  /** 附件上传进度（0-100） */
  progress?: number
  /** 消息是否被编辑过 */
  modified?: boolean
  /** 流式消息状态（中立 StreamMessageMeta） */
  stream?: import('./body').StreamMessageMeta
}

/** 通知类型消息体（本地系统通知，非 SDK 消息类型） */
export interface NoticeMessageBody {
  /** 通知文案 */
  content: string
  /** 通知事件类型（结构化管线引入；旧消息无此字段，向后兼容） */
  eventType?: NoticeEventTypeValue
  /** 事件参数（成员名/群名/数量等），供自定义文案与过滤使用 */
  params?: Record<string, string | number | boolean>
}

/**
 * UIKit 本地通知消息。
 * 不来自 SDK 消息流，用于在聊天页面展示中性灰色系统提示
 * （如好友关系变更、群成员变动、群主/管理员变更等）。
 */
export interface UiNoticeMessage extends Omit<SdkMessage, 'type' | 'body'>, UiMessageExtension {
  type: 'notice'
  body: NoticeMessageBody
}

/** UIKit 层消息：中立 SdkMessage 加上 UI 扩展，或本地通知消息 */
export type UiMessage = (SdkMessage & UiMessageExtension) | UiNoticeMessage

/** 简化后的本地发送消息标识 */
export interface SendingMessageMeta {
  localId: string
  sdkMessage: SdkMessage
  timestamp: number
}

/** UIKit UI 展示层消息状态（含 delivered/read，由回执事件驱动） */
export type MessageStatus = MessageStatusValue
