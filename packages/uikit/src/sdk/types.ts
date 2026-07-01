import type {
  ChatClient as SdkChatClient,
  ChatManager,
  ContactManager,
  GroupManager,
  PresenceManager,
  InitConfig,
} from 'easemob-websdk'

/**
 * UIKIT 的客户端配置
 * 基于 SDK InitConfig 扩展，增加 UIKIT 专属配置项
 */
export type ClientConfig = InitConfig & {
  /** 是否开启 SDK 调试模式 */
  debug?: boolean
}

/** getJoinedGroups 返回的群组项（BaseGroupInfo / GroupInfo 的并集） */
export interface JoinedGroupItem {
  groupId: string
  groupName?: string
  disabled?: boolean
  public?: boolean
  role?: string
  memberCount?: number
  affiliationsCount?: number
  description?: string
  avatar?: string
  maxUsers?: number
  allowInvites?: boolean
  approval?: boolean
  mute?: boolean
  shieldgroup?: boolean
  created?: number
}

/** 管理器类型映射 */
export interface ManagerRegistry {
  chatManager: ChatManager
  contactManager: ContactManager
  groupManager: GroupManager
  presenceManager: PresenceManager
}

/** 带管理器的 ChatClient 类型 */
export type ChatClient = SdkChatClient & ManagerRegistry

/** 连接事件处理器类型 */
export interface ChatEventHandler {
  onConnected?: () => void
  onDisconnected?: () => void
  onConnecting?: () => void
  onReconnectFailed?: () => void
  onTokenWillExpire?: () => void
  onTokenExpired?: () => void
  onOfflineMessageSyncStart?: () => void
  onOfflineMessageSyncFinish?: () => void
}

/** 错误事件类型 */
export interface ChatError {
  code: number
  message: string
}

/**
 * UIKIT 内部消息模型
 * 在 SDK Message 基础上扩展 UI 状态字段
 */
export interface UIKitMessage {
  /** 消息在 UI 中的发送状态 */
  status?: 'sending' | 'sent' | 'failed'
  /** 附件上传进度（0-100） */
  progress?: number
}
