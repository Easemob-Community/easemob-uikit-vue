import type { EasemobChat } from 'easemob-websdk'

/**
 * UIKIT 的客户端配置
 * 基于 SDK 的 ConnectionParameters 扩展，增加 UIKIT 专属配置项
 */
export type ClientConfig = EasemobChat.ConnectionParameters & {
  /** 是否开启 SDK 调试模式 */
  debug?: boolean
}

/** 直接复用 SDK 的 Connection 类型 */
export type ChatClient = EasemobChat.Connection

/** 直接复用 SDK 的事件处理器类型 */
export type ChatEventHandler = EasemobChat.EventHandlerType

/** 直接复用 SDK 的消息体类型 */
export type ChatMessage = EasemobChat.MessageBody

/** 直接复用 SDK 的错误事件类型 */
export type ChatError = EasemobChat.ErrorEvent

/**
 * UIKIT 内部消息模型
 * 在 SDK MessageBody 基础上扩展 UI 状态字段
 */
export type UIKitMessage = EasemobChat.MessageBody & {
  /** 消息在 UI 中的发送状态 */
  status?: 'sending' | 'sent' | 'failed'
  /** 附件上传进度（0-100） */
  progress?: number
}
