// @easemob/uikit-sdk-webim4 —— easemob-websdk@4.x 适配器（私有化 / 存量 4.x）
// 职责：4.x 的 client / domain / event / adapter 实现，把 4.x API/wire/事件
// 翻译成中立契约，UI 与下游零改动。

export * from './adapter'
export * from './client'

// 4.x 专属类型别名（EasemobChat.* 关键类型 re-export）
export * from './sdk-types'

// 事件层（连接级 + 各域事件 + 注册器 + 依赖注入）
export * from './event/connection-events'
export * from './event/registry'
export * from './event/chat-events'
export * from './event/contact-events'
export * from './event/conversation-events'
export * from './event/group-events'
export * from './event/presence-events'
export { setEventHandlerDeps } from './event/deps'
export type { EventHandlerDeps } from './event/deps'
// store 最小结构类型（下游 core/im 注入 adapterConfig.stores 时对齐用）；
// 显式导出以避免与 domain 模块的同名 re-export 产生歧义
export type {
  EventStores,
  MessageStoreLike,
  ConversationStoreLike,
  ContactStoreLike,
  GroupStoreLike,
  PresenceStoreLike,
  ClientStoreLike,
  UserInfoStoreLike,
} from './event/types'

// 同步状态
export * from './use-sync-status'

// 新消息通知判定引擎（browser/in-app，对齐 websdk5）
export * from './notification-engine'

// 展示适配器（SDK wire → 中立 UiX）
export * from './adapter/message-adapter'
export * from './adapter/conversation-adapter'
export * from './adapter/contact-adapter'
export * from './adapter/group-adapter'

// 业务域（消息 / 会话 / 联系人 / 群 / 在线状态 / 用户资料）
export * from './domain/message-domain'
export * from './domain/conversation-domain'
export * from './domain/contact-domain'
export * from './domain/group-domain'
export * from './domain/presence-domain'
export * from './domain/user-info-domain'
