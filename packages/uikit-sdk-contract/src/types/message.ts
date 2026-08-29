import type {
  ConversationTypeValue,
  MessageStatusValue,
  MessageTypeValue,
  NoticeEventTypeValue,
  StreamMessageStatusValue,
} from '../constants'

/**
 * 会话类型（wire 层，含 chatRoom）。
 * UIKit 业务侧用 `ConversationTypeValue`（singleChat/groupChat）收窄单群聊；
 * SDK 消息的 `conversationType` 用本三值联合（与 SDK5 `ChatConversationType` 对齐）。
 */
export type ChatConversationType = 'singleChat' | 'groupChat' | 'chatRoom'

/** 消息类型（wire 层，与 SDK MessageType 对齐；不含 UIKit 本地 NOTICE） */
export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'voice'
  | 'video'
  | 'location'
  | 'custom'
  | 'cmd'
  | 'combine'

/** 消息发送状态（wire 层；`sent` 表示服务端已接受，不代表对端已读） */
export type SdkSendStatus = 'sending' | 'sent' | 'failed'

/** 消息方向 */
export type MessageDirect = 'SEND' | 'RECEIVE'

/** 消息优先级 */
export type MessagePriority = 'high' | 'normal' | 'low'

/** 发送者资料摘要 */
export interface Sender {
  /** 发送者用户 ID */
  userId: string
  /** 发送者昵称 */
  nickname?: string
  /** 发送者头像地址 */
  avatarUrl?: string
}

/** 消息修改信息（消息被编辑后返回或下发） */
export interface MessageModifiedInfo {
  /** 最后一次修改操作者用户 ID */
  operatorId: string
  /** 消息已被修改的次数 */
  operationCount: number
  /** 最后一次修改时间戳（毫秒） */
  operationTime: number
}

/** 消息表情回应 */
export interface MessageReaction {
  /** 表情标识 */
  reaction: string
  /** 该表情的回应人数 */
  count: number
  /** Reaction 更新操作列表 */
  op?: ReadonlyArray<{
    /** 操作者用户 ID */
    operator: string
    /** 操作类型：create 添加 / delete 删除 */
    reactionType: 'create' | 'delete'
  }>
  /** 回应的用户 ID 列表 */
  userList: string[]
  /** 当前用户是否已添加该表情 */
  isAddedBySelf?: boolean
}

/**
 * 流式消息元信息（中立化，替代 SDK `StreamMessageMeta`）。
 * 字段名沿用 5.x 语义；4.x adapter 负责把 `stream.text`（增量）映射为 `deltaText`。
 */
export interface StreamMessageMeta {
  /** 业务自定义流类型 */
  customType?: string
  /** 当前分片序号 */
  seq: number
  /** 当前对外流式消息状态 */
  status: StreamMessageStatusValue
  /** 流式处理错误码；0 表示无错误 */
  errorType: number
  /** 服务端返回的结束原因 */
  finishReason?: number
  /** 当前分片新增的文本（增量） */
  deltaText: string
  /** 截至当前分片累计的完整文本 */
  fullText: string
}

/** Thread 消息上下文（本期暂未接入，保留类型位） */
export interface ChatThreadMessageContext {
  /** Thread 父消息 ID */
  readonly messageId: string
  /** Thread 所属父群组 ID */
  readonly parentId: string
  /** Thread 名称 */
  readonly chatThreadName?: string
}

/** Thread 概览（本期暂未接入，保留类型位） */
export interface ChatThreadOverview {
  /** Thread ID */
  readonly chatThreadId: string
  /** Thread 所属父群组 ID */
  readonly parentId: string
  /** Thread 名称 */
  readonly name?: string
  /** Thread 最后一条回复消息（引用 SdkMessage，见下方声明） */
  readonly lastMessage?: SdkMessage | null
  /** Thread 创建时间戳（毫秒） */
  readonly createdAt?: number
  /** Thread 更新时间戳（毫秒） */
  readonly updatedAt?: number
  /** Thread 回复消息数量 */
  readonly messageCount?: number
}

/** 文本消息体 */
export interface TextMessageBody {
  /** 消息文本内容 */
  content: string
  /** 目标翻译语言代码列表 */
  targetLanguages?: string[]
  /** 语言代码到翻译文本的映射 */
  translations?: Record<string, string>
}

/** 图片消息体 */
export interface ImageMessageBody {
  /** 本地可用地址；远端消息中为空字符串 */
  localUrl: string
  /** 文件名 */
  filename?: string
  /** 文件 MIME 类型 */
  filetype?: string
  /** 图片宽度（像素） */
  width?: number
  /** 图片高度（像素） */
  height?: number
  /** 是否为 GIF 图片 */
  isGif?: boolean
  /** 是否按原图语义发送 */
  isOriginalImage?: boolean
  /** 原图远程地址 */
  originalImageUrl?: string
  /** 大图远程地址 */
  bigImageUrl?: string
  /** 附件下载密钥 */
  secret?: string
  /** 文件大小（字节） */
  fileLength?: number
  /** 缩略图地址 */
  thumbnailUrl?: string
}

/** 文件消息体 */
export interface FileMessageBody {
  /** 服务端或本地可用的文件地址 */
  url?: string
  /** 文件名 */
  filename?: string
  /** 文件 MIME 类型 */
  filetype?: string
  /** 待发送文件大小（字节） */
  fileSize?: number
  /** 服务端返回的文件大小（字节） */
  fileLength?: number
  /** 附件下载密钥 */
  secret?: string
}

/** 语音消息体 */
export interface VoiceMessageBody {
  /** 服务端或本地可用的语音地址 */
  url?: string
  /** 文件名 */
  filename?: string
  /** 文件 MIME 类型 */
  filetype?: string
  /** 语音时长（秒） */
  duration: number
  /** 文件大小（字节） */
  fileLength?: number
  /** 附件下载密钥 */
  secret?: string
}

/** 视频消息体 */
export interface VideoMessageBody {
  /** 服务端或本地可用的视频地址 */
  url?: string
  /** 文件名 */
  filename?: string
  /** 文件 MIME 类型 */
  filetype?: string
  /** 视频时长（秒） */
  duration: number
  /** 视频宽度（像素） */
  width?: number
  /** 视频高度（像素） */
  height?: number
  /** 文件大小（字节） */
  fileLength?: number
  /** 附件下载密钥 */
  secret?: string
  /** 视频缩略图地址 */
  thumbnailUrl?: string
}

/** 位置消息体 */
export interface LocationMessageBody {
  /** 纬度 */
  latitude: number
  /** 经度 */
  longitude: number
  /** 地址描述 */
  address?: string
  /** 建筑名称 */
  buildingName?: string
}

/** 命令消息体 */
export interface CmdMessageBody {
  /** 命令动作名称 */
  action: string
  /** 是否仅投递给在线用户 */
  deliverOnlineOnly?: boolean
}

/** 自定义消息体 */
export interface CustomMessageBody {
  /** 自定义事件名称 */
  event: string
  /** 自定义字符串参数 */
  params?: Record<string, string>
}

/** 合并消息体 */
export interface CombineMessageBody {
  /** 合并消息标题 */
  title: string
  /** 合并消息摘要 */
  summary: string
  /** 子消息列表，仅在发送或详情解码场景提供 */
  messageList?: ReadonlyArray<SdkMessage>
  /** 合并消息详情下载地址 */
  url?: string
  /** 合并消息详情文件名 */
  filename: string
  /** 合并消息详情文件类型 */
  filetype: string
  /** 合并消息详情文件大小（字节） */
  fileLength?: number
  /** 合并消息详情下载密钥 */
  secret?: string
  /** 当前合并消息嵌套层级 */
  combineLevel: number
}

/** 所有消息体的联合类型（结构型，无统一 `type` 判别字段） */
export type MessageBody =
  | TextMessageBody
  | ImageMessageBody
  | FileMessageBody
  | VoiceMessageBody
  | VideoMessageBody
  | LocationMessageBody
  | CmdMessageBody
  | CustomMessageBody
  | CombineMessageBody

/**
 * 中立消息对象：两代 SDK 都映射到该形状；字段名以 5.x 为基准。
 * 4.x adapter 负责把 4.x `body` 判别联合映射到这套命名（详见主计划「八、4.x 能力映射」）。
 */
export interface SdkMessage {
  /** 服务端消息 ID：4.x `id` → msgServerId；5.x `msgServerId` */
  msgServerId: string
  /** 本地消息 ID：5.x `msgLocalId`；4.x `SendMsgResult.localMsgId` */
  msgLocalId: string
  /** 发送方标识 */
  from: string
  /** 接收方标识（单聊对端 ID / 群组 ID / 聊天室 ID） */
  to: string
  /** 发送者资料摘要 */
  sender: Sender
  /** 会话 ID */
  conversationId: string
  /** 会话类型 */
  conversationType: ChatConversationType
  /** 消息类型 */
  type: MessageType
  /** 消息发送状态 */
  sendStatus: SdkSendStatus
  /** 消息扩展字段 */
  ext: Record<string, unknown>
  /** 消息时间戳（毫秒） */
  timestamp: number
  /** 消息体 */
  body: MessageBody
  /** 消息方向 */
  direct?: MessageDirect
  /** 是否为在线消息；false 表示离线消息 */
  isOnline?: boolean
  /** 群聊或聊天室定向消息的接收者列表 */
  receiverList?: string[]
  /** 是否仅投递给在线用户 */
  deliverOnlineOnly?: boolean
  /** 发送消息协议中的 webhookEnv 字段 */
  webhookEnv?: string
  /** 消息优先级 */
  priority?: MessagePriority
  /** 是否为广播消息 */
  isBroadcast?: boolean
  /** 内容是否被审核替换 */
  isContentReplaced?: boolean
  /** 合并消息层级，仅 type=combine 时有意义 */
  combineLevel?: number
  /** 流式消息元信息，仅流式消息回调场景提供 */
  stream?: StreamMessageMeta
  /** 消息的表情回应列表 */
  reactions?: MessageReaction[]
  /** 群消息已读人数 */
  groupReadCount?: number
  /** 单聊发送消息是否已被对端阅读 */
  isPeerRead?: boolean
  /** 是否需要消息已读回执 */
  needReadReceipt?: boolean
  /** 是否为 Thread 回复消息 */
  isChatThread?: boolean
  /** Thread 消息上下文 */
  chatThread?: ChatThreadMessageContext
  /** Thread 概览 */
  chatThreadOverview?: ChatThreadOverview
  /** 消息修改信息 */
  modifiedInfo?: MessageModifiedInfo
}

/** UIKit 对中立 SdkMessage 的扩展字段 */
export interface UiMessageExtension {
  /** 是否为自己发送的消息 */
  isSelf: boolean
  /** UI 展示层消息状态（sending/sent/delivered/read/failed），非 SDK 字段 */
  status: MessageStatusValue
  /** 本地消息 ID 别名，方便 UI 层引用 */
  localId?: string
  /** 该消息是否请求群已读回执 */
  requireGroupAck?: boolean
  /** 群成员总数（仅群消息展示用） */
  groupMemberCount?: number
  /** 消息是否已被撤回 */
  recalled?: boolean
  /** 撤回操作者 ID */
  recalledBy?: string
  /** 文本消息撤回后保留的原始内容，用于重新编辑 */
  originalMsg?: string
  /** 是否被置顶（仅用于置顶消息列表展示） */
  pinned?: boolean
  /** 置顶时间 */
  pinTime?: number
  /** 置顶操作人 ID */
  pinOperatorId?: string
  /** 翻译结果 */
  translation?: { text: string, to: string }
  /** 是否优先展示译文 */
  showTranslation?: boolean
  /** 是否正在翻译中 */
  translating?: boolean
  /** 语音转文字结果 */
  voiceText?: { text: string }
  /** 是否优先展示语音转文字结果 */
  showVoiceText?: boolean
  /** 是否正在语音转文字中 */
  voiceTranscribing?: boolean
  /** 发送失败原因 */
  failReason?: string
  /** 附件上传进度（0-100） */
  progress?: number
  /** 消息是否被编辑过 */
  modified?: boolean
  /** 流式消息状态（中立 StreamMessageMeta） */
  stream?: StreamMessageMeta
}

/** 通知类型消息体（本地系统通知，非 SDK 消息类型） */
export interface NoticeMessageBody {
  /** 通知文案 */
  content: string
  /** 通知事件类型（结构化管线引入；旧消息无此字段，向后兼容） */
  eventType?: NoticeEventTypeValue
  /** 事件参数（成员名/群名/数量等），供自定义文案与过滤使用 */
  params?: Record<string, string | number | boolean>
}

/**
 * UIKit 本地通知消息。
 * 不来自 SDK 消息流，用于在聊天页面展示中性灰色系统提示
 * （如好友关系变更、群成员变动、群主/管理员变更等）。
 */
export interface UiNoticeMessage extends Omit<SdkMessage, 'type' | 'body'>, UiMessageExtension {
  type: 'notice'
  body: NoticeMessageBody
}

/** UIKit 层消息：中立 SdkMessage 加上 UI 扩展，或本地通知消息 */
export type UiMessage = (SdkMessage & UiMessageExtension) | UiNoticeMessage

/** 简化后的本地发送消息标识 */
export interface SendingMessageMeta {
  localId: string
  sdkMessage: SdkMessage
  timestamp: number
}

/** UIKit UI 展示层消息状态（含 delivered/read，由回执事件驱动） */
export type MessageStatus = MessageStatusValue

/** 将 MessageBody 联合类型窄化为具体 body 的便捷类型守卫（结构型，字段名 = 5.x） */
export function isTextBody(body: MessageBody): body is TextMessageBody {
  return 'content' in body
}

export function isImageBody(body: MessageBody): body is ImageMessageBody {
  return 'localUrl' in body
}

export function isFileBody(body: MessageBody): body is FileMessageBody {
  return 'url' in body && !('duration' in body) && !('localUrl' in body)
}

export function isVoiceBody(body: MessageBody): body is VoiceMessageBody {
  return 'duration' in body && !('thumbnailUrl' in body) && !('width' in body)
}

export function isVideoBody(body: MessageBody): body is VideoMessageBody {
  return 'duration' in body && ('thumbnailUrl' in body || 'width' in body)
}

export function isLocationBody(body: MessageBody): body is LocationMessageBody {
  return 'latitude' in body && 'longitude' in body
}

export function isCustomBody(body: MessageBody): body is CustomMessageBody {
  return 'event' in body
}

export function isCombineBody(body: MessageBody): body is CombineMessageBody {
  return 'title' in body && 'summary' in body
}

export function isCmdBody(body: MessageBody): body is CmdMessageBody {
  return 'action' in body
}
