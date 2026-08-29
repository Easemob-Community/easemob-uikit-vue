// @easemob/uikit-sdk-websdk5 —— easemob-websdk@5.x 适配器
// 职责：SDK5 的 client / domain / event / adapter 实现（唯一 import easemob-websdk 的地方）。

export * from './adapter'
export * from './client'

// 连接级事件
export * from './event/connection-events'

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
