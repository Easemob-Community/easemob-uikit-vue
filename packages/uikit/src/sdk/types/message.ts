import type { Message as SdkMessage, MessageBody } from 'easemob-websdk'

/**
 * 本地复刻 SDK 各消息体结构，便于 UIKit 组件按类型精确访问 body 字段。
 * SDK 主入口仅导出 MessageBody 联合类型，不单独导出各 body 接口。
 */
export interface TextMessageBody {
  content: string
  targetLanguages?: string[]
  translations?: Record<string, string>
}

export interface ImageMessageBody {
  localUrl: string
  filename?: string
  filetype?: string
  width?: number
  height?: number
  isGif: boolean
  isOriginalImage: boolean
  originalImageUrl?: string
  bigImageUrl?: string
  secret?: string
  fileLength?: number
  thumbnailUrl?: string
}

export interface FileMessageBody {
  url?: string
  filename?: string
  filetype?: string
  fileSize?: number
  fileLength?: number
  secret?: string
}

export interface VoiceMessageBody {
  url?: string
  filename?: string
  filetype?: string
  duration: number
  fileLength?: number
  secret?: string
}

export interface VideoMessageBody {
  url?: string
  filename?: string
  filetype?: string
  duration: number
  width?: number
  height?: number
  fileLength?: number
  secret?: string
  thumbnailUrl?: string
}

export interface LocationMessageBody {
  latitude: number
  longitude: number
  address?: string
  buildingName?: string
}

export interface CmdMessageBody {
  action: string
  params?: Record<string, string>
  deliverOnlineOnly?: boolean
}

export interface CustomMessageBody {
  event: string
  params?: Record<string, string>
}

export interface CombineMessageBody {
  title: string
  summary: string
  compatibleText: string
  messageList?: ReadonlyArray<SdkMessage>
  url?: string
  filename: string
  filetype: string
  fileLength?: number
  secret?: string
  combineLevel: number
}

/** 与 SDK MessageStatus 对齐 */
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'delivered' | 'read'

/** 将 MessageBody 联合类型窄化为具体 body 的便捷类型守卫 */
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
