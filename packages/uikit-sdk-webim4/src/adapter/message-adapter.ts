import type { EasemobChat } from 'easemob-websdk'
import { markRaw } from 'vue'
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  createLogger,
  normalizeUserId,
} from '@easemob/uikit-sdk-contract'
import type {
  CombineMessageBody,
  ConversationTypeValue,
  MessageBody,
  MessageType,
  UiMessage,
} from '@easemob/uikit-sdk-contract'

const adapterLog = createLogger('UIKit:Webim4MessageAdapter')

/** 4.x 消息体（判别联合，剔除 read/delivery/channel 回执体——它们不含 chatType/time/ext） */
type MessagesType = EasemobChat.ExcludeAckMessageBody

/** 4.x 消息类型字面量 → 中立 MessageType（'txt'→'text'、'img'→'image'、'audio'→'voice'、'loc'→'location'） */
const MESSAGE_TYPE_MAP: Record<string, MessageType> = {
  txt: MESSAGE_TYPE.TEXT,
  img: MESSAGE_TYPE.IMAGE,
  audio: MESSAGE_TYPE.VOICE,
  video: MESSAGE_TYPE.VIDEO,
  file: MESSAGE_TYPE.FILE,
  loc: MESSAGE_TYPE.LOCATION,
  cmd: MESSAGE_TYPE.CMD,
  custom: MESSAGE_TYPE.CUSTOM,
  combine: MESSAGE_TYPE.COMBINE,
}

export { normalizeUserId } from '@easemob/uikit-sdk-contract'

/**
 * 推导 4.x 消息所属会话 ID。
 * 4.x 消息体无 `conversationId` 字段，只有 `chatType` + `to`/`from`：
 * - 群聊取 `to`（群 ID）；
 * - 单聊取对端 ID（自己发的取 `to`，对方发的取 `from`）。
 */
function deriveConversationId(msg: MessagesType, currentUserId: string): string {
  if (msg.chatType === CONVERSATION_TYPE.GROUPCHAT)
    return msg.to
  const self = normalizeUserId(msg.from || '') === normalizeUserId(currentUserId)
  return self ? msg.to : (msg.from || msg.to)
}

/**
 * 将 4.x 消息体判别联合映射为中立 MessageBody。
 * ⚠️ 硬约束（主计划风险 #8）：只输出中立字段，不得透传 4.x 原始字段
 * （`msg`/`thumb`/`length`/`addr`/`lat`/`lng`/`customEvent`/`customExts`/`file_length`），
 * 否则结构型守卫（`isImageBody` 判 `localUrl`、`isVoiceBody` 判 `duration` 等）会被多余字段误导判。
 */
function mapBody(msg: MessagesType): MessageBody {
  switch (msg.type) {
    case 'txt':
      return { content: msg.msg || '' }
    case 'img':
      return {
        localUrl: '',
        thumbnailUrl: msg.thumb,
        originalImageUrl: msg.originalImageUrl,
        bigImageUrl: msg.bigImageUrl,
        width: msg.width,
        height: msg.height,
        isOriginalImage: msg.isOriginalImage,
        secret: msg.secret,
        fileLength: msg.file_length,
      }
    case 'audio':
      return {
        url: msg.url,
        filename: msg.filename,
        duration: msg.length || 0,
        fileLength: msg.file_length,
        secret: msg.secret,
      }
    case 'video':
      return {
        url: msg.url,
        filename: msg.filename,
        duration: msg.length || 0,
        fileLength: msg.file_length,
        secret: msg.secret,
        thumbnailUrl: msg.thumb,
      }
    case 'file':
      return {
        url: msg.url,
        filename: msg.filename || '',
        fileSize: msg.file_length,
        fileLength: msg.file_length,
        secret: msg.secret,
      }
    case 'loc':
      return {
        latitude: msg.lat,
        longitude: msg.lng,
        address: msg.addr,
        buildingName: msg.buildingName,
      }
    case 'cmd':
      return { action: msg.action }
    case 'custom':
      return {
        event: msg.customEvent,
        params: msg.customExts,
      }
    case 'combine':
      return {
        title: msg.title,
        summary: msg.summary,
        url: msg.url,
        filename: msg.filename,
        fileLength: msg.file_length,
        secret: msg.secret,
        combineLevel: msg.combineLevel,
      }
    default:
      // 未识别类型兜底为文本空消息，避免渲染崩溃
      return { content: '' }
  }
}

/**
 * 将 4.x 消息体转换为中立 UiMessage。
 * - 4.x `id` → `msgServerId`；`chatType` → `conversationType`；`time` → `timestamp`
 * - 4.x `isRead`/`isDelivered` → `isPeerRead`/`isPeerDelivered`
 * - 4.x 无 `sender` 字段，用 `from` 合成
 * - 合并消息 messageList 仅创建/转发用，markRaw 避免进入 Vue 响应式
 */
export function toUiMessage(sdkMsg: MessagesType, currentUserId: string): UiMessage {
  const isSelf = normalizeUserId(sdkMsg.from || '') === normalizeUserId(currentUserId)
  const type = MESSAGE_TYPE_MAP[sdkMsg.type] || MESSAGE_TYPE.TEXT
  const uiMsg: UiMessage = {
    msgServerId: sdkMsg.id || '',
    msgLocalId: sdkMsg.id || '',
    from: sdkMsg.from || currentUserId,
    to: sdkMsg.to,
    sender: { userId: sdkMsg.from || currentUserId },
    conversationId: deriveConversationId(sdkMsg, currentUserId),
    conversationType: sdkMsg.chatType === CONVERSATION_TYPE.GROUPCHAT
      ? CONVERSATION_TYPE.GROUPCHAT
      : CONVERSATION_TYPE.SINGLECHAT,
    type,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: (sdkMsg.ext || {}) as Record<string, unknown>,
    timestamp: sdkMsg.time || Date.now(),
    body: mapBody(sdkMsg),
    isPeerRead: sdkMsg.isRead,
    isPeerDelivered: sdkMsg.isDelivered,
    isSelf,
    status: isSelf && sdkMsg.isRead === true
      ? MESSAGE_STATUS.READ
      : MESSAGE_STATUS.SENT,
  }
  if (type === MESSAGE_TYPE.COMBINE && (uiMsg.body as CombineMessageBody).messageList) {
    uiMsg.body = {
      ...uiMsg.body,
      messageList: markRaw([...(uiMsg.body as CombineMessageBody).messageList!]),
    } as CombineMessageBody
  }
  return uiMsg
}

/** 批量转换 4.x 消息体 */
export function toUiMessages(sdkMsgs: readonly MessagesType[], currentUserId: string): UiMessage[] {
  return sdkMsgs.map(msg => toUiMessage(msg, currentUserId))
}

/** 判断 4.x 消息是否属于指定会话 */
export function isMessageInConversation(
  sdkMsg: MessagesType,
  conversationId: string,
  conversationType: ConversationTypeValue,
): boolean {
  return deriveConversationId(sdkMsg, '') === conversationId
    && (sdkMsg.chatType === CONVERSATION_TYPE.GROUPCHAT
      ? conversationType === CONVERSATION_TYPE.GROUPCHAT
      : conversationType === CONVERSATION_TYPE.SINGLECHAT)
}

/** 从 4.x 消息计算单聊场景下的对方用户 ID */
export function resolvePeerUserId(sdkMsg: MessagesType, currentUserId: string): string {
  if (sdkMsg.chatType === CONVERSATION_TYPE.GROUPCHAT)
    return sdkMsg.to
  return normalizeUserId(sdkMsg.from || '') === normalizeUserId(currentUserId)
    ? sdkMsg.to
    : (sdkMsg.from || sdkMsg.to)
}

// 记录 4.x 原始类型引用（供其它模块消费，避免 import 4.x 类型散落）
void adapterLog
