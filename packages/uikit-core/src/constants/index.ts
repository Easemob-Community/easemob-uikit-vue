// SDK-wire 中立常量已下沉 `@easemob/uikit-sdk-contract`（单一真相源），
// 此处 re-export 保持 core 既有导入路径与公开 API 兼容；UIKit 专属常量留在本文件。
export {
  ACK_TYPE,
  CONVERSATION_TYPE,
  FORWARD_MODE,
  GROUP_MEMBER_ROLE,
  MESSAGE_EXT_KEY,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  NOTICE_EVENT_TYPE,
  PRESENCE_STATUS,
  STREAM_CUSTOM_TYPE,
  STREAM_MESSAGE_STATUS,
} from '@easemob/uikit-sdk-contract'
export type {
  AckTypeValue,
  ConversationTypeValue,
  ForwardModeValue,
  GroupMemberRoleValue,
  MessageExtKeyValue,
  MessageStatusValue,
  MessageTypeValue,
  NoticeEventTypeValue,
  PresenceStatusValue,
  StreamCustomTypeValue,
  StreamMessageStatusValue,
} from '@easemob/uikit-sdk-contract'

/** Header 对齐方式常量 */
export const HEADER_ALIGN = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const

export type HeaderAlignValue =
  (typeof HEADER_ALIGN)[keyof typeof HEADER_ALIGN]

/** 组件注入（provide/inject）键常量 */
export const INJECTION_KEY = {
  /** 文本消息配置（链接识别 & 拦截器），chat.vue provide / text-message.vue inject */
  TEXT_MESSAGE_CONFIG: 'textMessageConfig',
  /** 气泡形状（config.messageList.bubbleShape），message-bubble-wrapper.vue provide / 气泡组件 inject */
  BUBBLE_SHAPE: 'bubbleShape',
  /**
   * 语音未读红点开关（config.messageList.voiceUnreadDot），message-bubble-wrapper.vue provide / voice-message.vue inject。
   * 值为 ComputedRef<boolean | undefined>：undefined 回落默认 true；
   * 在消息项级插槽（如 #message-voice）内对同一 key 深一层 provide 可实现单条消息覆盖。
   */
  VOICE_UNREAD_DOT: 'voiceUnreadDot',
} as const

/** 群组资料字段长度限制（与后端约束对齐） */
export const GROUP_INFO_LIMIT = {
  /** 群名称最大长度 */
  NAME_MAX_LENGTH: 255,
  /** 群介绍最大长度 */
  DESCRIPTION_MAX_LENGTH: 2048,
  /** 群公告最大长度 */
  ANNOUNCEMENT_MAX_LENGTH: 512,
} as const
