/** 会话类型常量（仅单群聊场景；聊天室 wire 值 'chatRoom' 由 chatroom 包 constants 定义——
 * 注意：本联合不可直接加入 CHATROOM，im 多处把 ConversationTypeValue 收窄为 SDK
 * MessageChatConversationType（不含 chatRoom），扩大联合会破坏这些收窄点） */
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

/** 本地系统通知事件类型常量（供 noticeConfig 自定义文案 / 过滤 / 禁用使用） */
export const NOTICE_EVENT_TYPE = {
  CONTACT_ADDED: 'contactAdded',
  CONTACT_DELETED: 'contactDeleted',
  GROUP_CREATED: 'groupCreated',
  GROUP_NAME_CHANGED: 'groupNameChanged',
  OWNER_CHANGED: 'ownerChanged',
  ADMIN_ADDED: 'adminAdded',
  ADMIN_REMOVED: 'adminRemoved',
  MEMBER_JOINED: 'memberJoined',
  MEMBER_EXITED: 'memberExited',
  USER_REMOVED: 'userRemoved',
  GROUP_DESTROYED: 'groupDestroyed',
  ANNOUNCEMENT_CHANGED: 'announcementChanged',
  MUTE_ADDED: 'muteAdded',
  MUTE_REMOVED: 'muteRemoved',
  ALL_MEMBER_MUTE_CHANGED: 'allMemberMuteChanged',
  ALLOWLIST_ADDED: 'allowlistAdded',
  ALLOWLIST_REMOVED: 'allowlistRemoved',
  GROUP_DISABLED_CHANGED: 'groupDisabledChanged',
  SHARED_FILE_ADDED: 'sharedFileAdded',
} as const

export type NoticeEventTypeValue =
  (typeof NOTICE_EVENT_TYPE)[keyof typeof NOTICE_EVENT_TYPE]

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

/**
 * 流式消息状态常量（与 SDK `StreamMessageStatus` 对齐；
 * `STREAM_FULL` 为 SDK 内部全文兜底状态，不通过 onStreamMessage 对外派发，故不收录）。
 */
export const STREAM_MESSAGE_STATUS = {
  /** 流开始 */
  START: 'STREAM_START',
  /** 单分片即完成（整条消息在一个分片内下发完成） */
  START_COMPLETED: 'STREAM_START_COMPLETED',
  /** 传输中（后续仍有分片） */
  IN_PROGRESS: 'STREAM_IN_PROGRESS',
  /** 正常完成 */
  COMPLETED: 'STREAM_COMPLETED',
  /** 流式处理异常 */
  ERROR: 'STREAM_ERROR',
} as const

export type StreamMessageStatusValue =
  (typeof STREAM_MESSAGE_STATUS)[keyof typeof STREAM_MESSAGE_STATUS]

/**
 * 流式消息业务自定义类型（`stream.customType`）常量。
 * 内核仅处理纯文本流（text / 缺省）；markdown 等富格式类型由插件通过
 * `#message-txt` / `#message-custom` 插槽接管渲染。
 */
export const STREAM_CUSTOM_TYPE = {
  TEXT: 'text',
} as const

export type StreamCustomTypeValue =
  (typeof STREAM_CUSTOM_TYPE)[keyof typeof STREAM_CUSTOM_TYPE]

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

/** 消息 ext 扩展字段键常量（UIKit 自有 wire 约定，随消息透传收发双端） */
export const MESSAGE_EXT_KEY = {
  /** 表情包（sticker/GIF）图片消息标记：值为 true 时按表情渲染，不启用图片三级预览 */
  IS_STICKER: 'isSticker',
} as const

export type MessageExtKeyValue = (typeof MESSAGE_EXT_KEY)[keyof typeof MESSAGE_EXT_KEY]

/** 组件注入（provide/inject）键常量 */
export const INJECTION_KEY = {
  /** 文本消息配置（链接识别 & 拦截器），chat.vue provide / text-message.vue inject */
  TEXT_MESSAGE_CONFIG: 'textMessageConfig',
  /** 气泡形状（config.messageList.bubbleShape），message-bubble-wrapper.vue provide / 气泡组件 inject */
  BUBBLE_SHAPE: 'bubbleShape',
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
