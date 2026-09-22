/**
 * 中立 SDK 契约常量。
 * 与 `@easemob-community/uikit-core` 的 constants 中 SDK-wire 相关枚举同源（core 从本包 re-export 保持向后兼容）。
 * 仅保留「SDK 语义中立」的枚举字符串；UIKit 组件专属常量（MESSAGE_EXT_KEY / INJECTION_KEY / GROUP_INFO_LIMIT 等）
 * 仍留在 core，不进入本包。
 */

/** 会话类型常量（仅单群聊场景；聊天室 wire 值 'chatRoom' 由 chatroom 包 constants 定义） */
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
 * `STREAM_FULL` 为 SDK 内部全文兜底状态，不通过 onStreamMessage 对外派发，
 * 类型上保留以兼容 SDK wire 值，避免 SDK5 → 中立消息的结构型赋值报错）。
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
  /** SDK 内部全文兜底状态（不通过 onStreamMessage 对外派发，类型上保留以兼容 SDK wire 值） */
  STREAM_FULL: 'STREAM_FULL',
} as const

export type StreamMessageStatusValue =
  (typeof STREAM_MESSAGE_STATUS)[keyof typeof STREAM_MESSAGE_STATUS]

/**
 * 流式消息业务自定义类型（`stream.customType`）常量。
 * 内核仅处理纯文本流（text / 缺省）；markdown 等富格式类型由插件接管。
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

/** 消息 ext 扩展字段键常量（UIKit 自有 wire 约定，随消息透传收发双端） */
export const MESSAGE_EXT_KEY = {
  /** 表情包（sticker/GIF）图片消息标记：值为 true 时按表情渲染，不启用图片三级预览 */
  IS_STICKER: 'isSticker',
} as const

export type MessageExtKeyValue =
  (typeof MESSAGE_EXT_KEY)[keyof typeof MESSAGE_EXT_KEY]

/** 全量用户资料属性列表（拉取自身资料时使用） */
export const ALL_USER_INFO_ATTRIBUTES: Array<
  'nickname' | 'avatarUrl' | 'mail' | 'phone' | 'gender' | 'sign' | 'birth' | 'ext'
> = [
  'nickname',
  'avatarUrl',
  'mail',
  'phone',
  'gender',
  'sign',
  'birth',
  'ext',
]

export type AllUserInfoAttributes = typeof ALL_USER_INFO_ATTRIBUTES

/**
 * 连接断开错误码：账号被踢/失效类（websdk 两代同码，见 4.x status.ts / 5.x error-codes）。
 * 此类断开是账号态终态（retryable=false，SDK 不再自动重连），UI 不得展示「网络异常」，
 * 应提示账号在其他设备登录/被踢并引导重新登录。
 */
export const KICK_ERROR_CODE = {
  /** 账号在其他设备登录（多端互踢） */
  USER_LOGIN_ANOTHER_DEVICE: 206,
  /** 账号已被注销 */
  USER_REMOVED: 207,
  /** 登录设备数超过限制，当前设备被踢 */
  USER_LOGIN_TOO_MANY_DEVICES: 214,
  /** 修改密码导致被踢下线 */
  USER_KICKED_BY_CHANGE_PASSWORD: 216,
  /** 被其他设备主动踢下线 */
  USER_KICKED_BY_OTHER_DEVICE: 217,
} as const

export type KickErrorCodeValue =
  (typeof KICK_ERROR_CODE)[keyof typeof KICK_ERROR_CODE]

/** 判断断开错误码是否为被踢/账号失效类（5.x 取 payload.errorCode，4.x 取 error.type） */
export function isKickErrorCode(code: number | undefined | null): code is KickErrorCodeValue {
  return code !== undefined
    && code !== null
    && (Object.values(KICK_ERROR_CODE) as number[]).includes(code)
}
