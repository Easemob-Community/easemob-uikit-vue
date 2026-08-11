/** 会话类型常量 */
export const CONVERSATION_TYPE = {
  SINGLECHAT: 'singleChat',
  GROUPCHAT: 'groupChat',
} as const

export type ConversationTypeValue =
  (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE]

/** 消息类型常量（与环信 SDK MessageType 对齐；NOTICE 为 UIKit 本地通知类型，非 SDK 类型） */
export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  VIDEO: 'video',
  FILE: 'file',
  CMD: 'cmd',
  CUSTOM: 'custom',
  LOCATION: 'location',
  COMBINE: 'combine',
  NOTICE: 'notice', // UIKit 本地通知消息（不走 SDK 消息流）
} as const

export type MessageTypeValue =
  (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE]

/** 消息发送状态常量 */
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const

export type MessageStatusValue =
  (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS]

/** 回执消息类型常量 */
export const ACK_TYPE = {
  CHANNEL: 'channel',
  READ: 'read',
  GROUP_READ: 'read', // 群已读与单聊 read 共用 type，区别在 chatType
} as const

export type AckTypeValue = (typeof ACK_TYPE)[keyof typeof ACK_TYPE]

/** 群成员角色常量（与 SDK GroupMemberRole 对齐） */
export const GROUP_MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export type GroupMemberRoleValue =
  (typeof GROUP_MEMBER_ROLE)[keyof typeof GROUP_MEMBER_ROLE]

/** 消息转发模式常量：oneByOne 逐条转发 | combine 合并转发 */
export const FORWARD_MODE = {
  ONE_BY_ONE: 'oneByOne',
  COMBINE: 'combine',
} as const

export type ForwardModeValue =
  (typeof FORWARD_MODE)[keyof typeof FORWARD_MODE]

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
} as const

/** 在线状态常量（与多端保持一致，publish 时使用对应 ext） */
export const PRESENCE_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  AWAY: 'Away',
  BUSY: 'Busy',
  DO_NOT_DISTURB: 'Do Not Disturb',
  CUSTOM: 'Custom',
} as const

export type PresenceStatusValue =
  (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS]
