import { MESSAGE_TYPE } from '../../constants'
import type {
  MessageBody,
  CmdMessageBody,
  CombineMessageBody,
  CustomMessageBody,
  FileMessageBody,
  ImageMessageBody,
  LocationMessageBody,
  MultiBody,
  MultiBodySegment,
  TextMessageBody,
  VideoMessageBody,
  VoiceMessageBody,
} from './body'

/**
 * 将 MessageBody 联合类型窄化为具体 body 的类型守卫。
 * 由于 wire 层未提供 discriminant 字段，守卫采用组合字段判定，降低不同 body 之间的误匹配风险。
 */

/** 文本消息体：包含 content 字段 */
export function isTextBody(body: MessageBody): body is TextMessageBody {
  return 'content' in body
}

/** 图片消息体：包含 localUrl，且至少包含一个图片特有字段 */
export function isImageBody(body: MessageBody): body is ImageMessageBody {
  return 'localUrl' in body
    && (
      'width' in body
      || 'height' in body
      || 'originalImageUrl' in body
      || 'bigImageUrl' in body
      || 'thumbnailUrl' in body
    )
}

/** 文件消息体：包含 url，且不含音视频/位置特有字段 */
export function isFileBody(body: MessageBody): body is FileMessageBody {
  return 'url' in body
    && !('duration' in body)
    && !('width' in body)
    && !('latitude' in body)
    && !('localUrl' in body)
}

/** 语音消息体：包含 duration，且不含视频/图片特有字段 */
export function isVoiceBody(body: MessageBody): body is VoiceMessageBody {
  return 'duration' in body
    && !('thumbnailUrl' in body)
    && !('width' in body)
}

/** 视频消息体：包含 duration，且包含缩略图或宽高信息 */
export function isVideoBody(body: MessageBody): body is VideoMessageBody {
  return 'duration' in body
    && ('thumbnailUrl' in body || 'width' in body)
}

/** 位置消息体：同时包含 latitude 与 longitude */
export function isLocationBody(body: MessageBody): body is LocationMessageBody {
  return 'latitude' in body && 'longitude' in body
}

/** 自定义消息体：包含 event，且不含其他 body 类型的判别字段 */
export function isCustomBody(body: MessageBody): body is CustomMessageBody {
  return 'event' in body
    && !('duration' in body)
    && !('localUrl' in body)
    && !('content' in body)
    && !('title' in body)
}

/** 合并消息体：同时包含 title、summary、filename */
export function isCombineBody(body: MessageBody): body is CombineMessageBody {
  return 'title' in body && 'summary' in body && 'filename' in body
}

/** 命令消息体：包含 action，且不含其他 body 类型的判别字段 */
export function isCmdBody(body: MessageBody): body is CmdMessageBody {
  return 'action' in body
    && !('content' in body)
    && !('localUrl' in body)
    && !('event' in body)
}

/** 复合消息分段：以 segment.type 判别，再复用普通 body 的结构守卫 */
export function isMultiBodySegment(segment: unknown): segment is MultiBodySegment {
  if (!segment || typeof segment !== 'object' || Array.isArray(segment) || !('type' in segment))
    return false

  const body = segment as MessageBody
  switch (segment.type) {
    case MESSAGE_TYPE.TEXT:
      return isTextBody(body)
    case MESSAGE_TYPE.IMAGE:
      return isImageBody(body)
    case MESSAGE_TYPE.FILE:
      return isFileBody(body)
    case MESSAGE_TYPE.VOICE:
      return isVoiceBody(body)
    case MESSAGE_TYPE.VIDEO:
      return isVideoBody(body)
    case MESSAGE_TYPE.LOCATION:
      return isLocationBody(body)
    case MESSAGE_TYPE.CUSTOM:
      return isCustomBody(body)
    default:
      return false
  }
}

/** 复合消息正文：至少两个合法分段；接收侧不施加 20 段上限 */
export function isMultiBody(body: unknown): body is MultiBody {
  return Array.isArray(body) && body.length >= 2 && body.every(isMultiBodySegment)
}
