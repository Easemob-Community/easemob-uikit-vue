import type {
  CmdMessageBody,
  CombineMessageBody,
  CustomMessageBody,
  FileMessageBody,
  ImageMessageBody,
  LocationMessageBody,
  MessageBody,
  TextMessageBody,
  VideoMessageBody,
  VoiceMessageBody,
} from 'easemob-websdk'

/**
 * 各消息体类型直接复用 SDK 5.0.0 导出，不再本地复刻，避免双份定义漂移。
 * SDK 主入口已单独导出全部 *MessageBody 接口。
 */
export type {
  TextMessageBody,
  ImageMessageBody,
  FileMessageBody,
  VoiceMessageBody,
  VideoMessageBody,
  LocationMessageBody,
  CmdMessageBody,
  CustomMessageBody,
  CombineMessageBody,
} from 'easemob-websdk'

/**
 * UIKit UI 展示层消息状态。
 * 注意与 SDK 区分：SDK 0.20.0 起 `Message.status` 重命名为 `sendStatus`
 * （仅 sending/sent/failed，sent 表示服务端已接受）；
 * 本类型额外包含 delivered/read，由已读/送达回执事件驱动，仅用于 UI 展示。
 */
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
