/**
 * 聊天室场景包常量（风格对齐 @easemob/uikit-core constants）。
 * 枚举字符串统一收敛于此，业务代码（sdk/store/composables）禁止硬编码字面量。
 */

/**
 * 聊天室会话类型（websdk wire 值）。
 * core 的 CONVERSATION_TYPE 只覆盖单群聊（singleChat/groupChat），
 * 聊天室 wire 值 'chatRoom' 由本包定义（与 SDK `ChatConversationType` 对齐）。
 */
export const CHATROOM_CONVERSATION_TYPE = {
  CHATROOM: 'chatRoom',
} as const

export type ChatroomConversationTypeValue =
  (typeof CHATROOM_CONVERSATION_TYPE)[keyof typeof CHATROOM_CONVERSATION_TYPE]

/** 聊天室房间状态机：idle → joining → joined → leaving；异常终态 kicked/destroyed */
export const CHATROOM_STATUS = {
  IDLE: 'idle',
  JOINING: 'joining',
  JOINED: 'joined',
  LEAVING: 'leaving',
  KICKED: 'kicked',
  DESTROYED: 'destroyed',
} as const

export type ChatroomStatusValue =
  (typeof CHATROOM_STATUS)[keyof typeof CHATROOM_STATUS]

/** 聊天室成员角色（与 SDK `ChatRoomRole` 对齐） */
export const CHATROOM_MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export type ChatroomMemberRoleValue =
  (typeof CHATROOM_MEMBER_ROLE)[keyof typeof CHATROOM_MEMBER_ROLE]

/** 当前用户在房间内的权限类型（与 SDK `ChatRoomPermissionType` 对齐，含 none 旁观者） */
export const CHATROOM_PERMISSION = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  NONE: 'none',
} as const

export type ChatroomPermissionValue =
  (typeof CHATROOM_PERMISSION)[keyof typeof CHATROOM_PERMISSION]

/** 消息流默认配置（接收侧渲染节流与封顶，见 docs/CHATROOM-UIKIT-DESIGN.md 5.3/5.7） */
export const CHATROOM_MESSAGE_DEFAULTS = {
  /** 渲染列表封顶条数（默认保留最近 200 条，可配） */
  MAX_MESSAGES: 200,
  /** 接收缓冲队列批量合并窗口（ms），与 SDK 发送侧限流是两个层面 */
  FLUSH_INTERVAL: 150,
  /** 进房拉取历史消息的默认条数 */
  HISTORY_PAGE_SIZE: 50,
} as const

/**
 * 房间属性 key 场景前缀约定：变种之间共用房间 KV 命名空间，
 * key 必须加场景前缀防冲突（websdk 属性 key 不支持冒号，故用下划线分隔，
 * 如 `live_productId` / `voice_micQueue`，见设计文档 5.6）。
 */
export const CHATROOM_ATTR_PREFIX = {
  LIVE: 'live_',
  VOICE: 'voice_',
  CLASS: 'class_',
} as const

export type ChatroomAttrPrefixValue =
  (typeof CHATROOM_ATTR_PREFIX)[keyof typeof CHATROOM_ATTR_PREFIX]

/** 内置场景预设名（live / voice / class 三内置 preset 已注册，见 use-chatroom-scene；custom 为业务自定义场景） */
export const CHATROOM_SCENE_NAME = {
  LIVE: 'live',
  VOICE: 'voice',
  CLASS: 'class',
  CUSTOM: 'custom',
} as const

export type ChatroomSceneNameValue =
  (typeof CHATROOM_SCENE_NAME)[keyof typeof CHATROOM_SCENE_NAME]

/**
 * 礼物 custom 消息协议（P3）：`sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName })`，
 * 渲染端识别 event 展示礼物样式；业务自定义礼物消息可扩展 ext（如 url/动画）。
 */
export const CHATROOM_GIFT_EVENT = 'gift'

/** 内置礼物清单（GiftBar 默认数据；业务可用插槽整体覆盖） */
export const CHATROOM_GIFT_ITEMS = [
  { giftId: 'flower', icon: '🌹' },
  { giftId: 'like', icon: '👍' },
  { giftId: 'rocket', icon: '🚀' },
  { giftId: 'car', icon: '🏎️' },
] as const

/** 麦位数量（语聊房场景默认 8 个麦位） */
export const CHATROOM_MIC_QUEUE_SEAT_COUNT = 8
