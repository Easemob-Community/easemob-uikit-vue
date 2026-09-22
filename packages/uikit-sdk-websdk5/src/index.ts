// @easemob-community/uikit-sdk-websdk5 —— easemob-websdk@5.x 适配器
// 职责：SDK5 的 client / domain / event / adapter 实现（唯一 import easemob-websdk 的地方）。

export * from './adapter'
export * from './client'

// SDK5 专属来源/条目类型（SdkContactSource / SdkGroupSource / GroupMemberEntry / GroupMuteEntry）
export * from './sdk-types'

// 事件层（连接级 + 各 manager 事件 + 注册器 + 显示名解析 + 依赖注入）
export * from './event/connection-events'
export * from './event/registry'
export * from './event/chat-events'
export * from './event/contact-events'
export * from './event/group-events'
export * from './event/presence-events'
export * from './event/resolve-display-name'
export { setEventHandlerDeps } from './event/deps'
export type { EventHandlerDeps } from './event/deps'

// 通知引擎 / 同步状态
export * from './notification-engine'
export * from './use-sync-status'

// 工具
export * from './utils/sdk-error'
export * from './utils/sdk-log-capture'

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
