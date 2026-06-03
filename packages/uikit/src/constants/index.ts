/** 会话类型常量 */
export const CONVERSATION_TYPE = {
  SINGLECHAT: 'singleChat',
  GROUPCHAT: 'groupChat',
} as const

export type ConversationTypeValue =
  (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE]

/** 消息类型常量（与环信 SDK MessageType 对齐） */
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
