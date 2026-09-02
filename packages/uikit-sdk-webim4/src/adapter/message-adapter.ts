import type { EasemobChat } from 'easemob-websdk-4'
import { markRaw } from 'vue'
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  STREAM_MESSAGE_STATUS,
  createLogger,
  isStreamTerminal,
  normalizeUserId,
} from '@easemob/uikit-sdk-contract'
import type {
  CombineMessageBody,
  ConversationTypeValue,
  MessageBody,
  MessageType,
  SdkMessage,
  StreamMessageMeta,
  StreamMessageStatusValue,
  UiMessage,
} from '@easemob/uikit-sdk-contract'

const adapterLog = createLogger('UIKit:Webim4MessageAdapter')

/**
 * 4.x 消息体（判别联合，剔除 read/delivery/channel 回执体——它们走独立事件回调）。
 * 4.x namespace 的 MessageBody 含 StreamMsgBody（extends TextMsgBody），
 * 因此流式消息分片也在本联合内，经 `stream` 字段判别。
 */
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

/**
 * 4.x StreamStatus 数字 enum → 中立字符串状态。
 * 4.x: START=0 / START_AND_COMPLETED=1 / IN_PROGRESS=2 / COMPLETED=3 / ERROR=4
 */
const STREAM_STATUS_MAP: Record<number, StreamMessageStatusValue> = {
  0: STREAM_MESSAGE_STATUS.START,
  1: STREAM_MESSAGE_STATUS.START_COMPLETED,
  2: STREAM_MESSAGE_STATUS.IN_PROGRESS,
  3: STREAM_MESSAGE_STATUS.COMPLETED,
  4: STREAM_MESSAGE_STATUS.ERROR,
}

/**
 * 流式分片累计状态（按消息 ID）。
 * 4.x `stream.text` 是**增量**文本且回调分片不带 `seq`（`StreamMsgBody.stream` 为
 * `Omit<StreamChunk, 'seq'>`），adapter 负责自增 seq 对齐 5.x `StreamMessageMeta` 语义。
 * `fullText` 优先取 SDK 回调的 `msg` 字段（源码已核：handleStreamMsg 内部按 seq
 * 排序合并，回调消息的 `msg` 即累计全量文本）；本 Map 仅在 `msg` 缺失时作自累计兜底。
 */
const streamStateMap = new Map<string, { seq: number, fullText: string }>()

export { normalizeUserId } from '@easemob/uikit-sdk-contract'

/** 判断 4.x 消息体是否携带流式分片信息（StreamMsgBody） */
function isStreamMsgBody(msg: MessagesType): msg is EasemobChat.StreamMsgBody {
  return msg.type === 'txt' && 'stream' in msg && !!msg.stream
}

/**
 * 把 4.x 流式分片映射为中立 StreamMessageMeta。
 * - `stream.text`（增量）→ `deltaText`；
 * - `fullText` 优先取 SDK 回调的 `msg` 字段（handleStreamMsg 合并后的累计全量，
 *   丢片/乱序由 SDK 侧补偿）；`msg` 为空时回退 adapter 自累计兜底；
 * - 终态（完成/单分片完成/异常）后清理累计状态，避免模块级 Map 泄漏。
 */
function mapStreamChunk(
  msgId: string,
  chunk: EasemobChat.StreamMsgBody['stream'],
  mergedText?: string,
): StreamMessageMeta {
  const prev = streamStateMap.get(msgId) || { seq: 0, fullText: '' }
  const status = STREAM_STATUS_MAP[chunk.status as number] ?? STREAM_MESSAGE_STATUS.ERROR
  const deltaText = chunk.text || ''
  const fullText = mergedText || prev.fullText + deltaText
  const seq = prev.seq + 1
  if (isStreamTerminal(status))
    streamStateMap.delete(msgId)
  else
    streamStateMap.set(msgId, { seq, fullText })
  return {
    customType: chunk.customType,
    seq,
    status,
    errorType: chunk.errorType ?? 0,
    finishReason: chunk.finishReason,
    deltaText,
    fullText,
  }
}

/** 清空流式累计状态（登出/事件反注册时调用，防止跨登录会话残留） */
export function resetStreamState(): void {
  streamStateMap.clear()
}

/**
 * 推导 4.x 消息所属会话 ID。
 * 4.x 消息体无 `conversationId` 字段，只有 `chatType` + `to`/`from`：
 * - 群聊/聊天室取 `to`（群 ID）；
 * - 单聊取对端 ID（自己发的取 `to`，对方发的取 `from`）。
 */
function deriveConversationId(msg: MessagesType, currentUserId: string): string {
  if (msg.chatType === CONVERSATION_TYPE.GROUPCHAT || msg.chatType === 'chatRoom')
    return msg.to
  const self = normalizeUserId(msg.from || '') === normalizeUserId(currentUserId)
  return self ? msg.to : (msg.from || msg.to)
}

/** 4.x 在线状态枚举值（ONLINESTATETYPE：OFFLINE=0 / ONLINE=1 / UNKNOWN=2 / NONE=3）→ 中立 isOnline */
function mapOnlineState(onlineState: number | undefined): boolean | undefined {
  if (onlineState === 1)
    return true
  if (onlineState === 0)
    return false
  return undefined
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
      return {
        content: msg.msg || '',
        // 4.x translations: { translations: [{ text, to }] } → 中立 Record<语言, 译文>
        ...(msg.translations?.translations
          ? { translations: Object.fromEntries(msg.translations.translations.map(t => [t.to, t.text])) }
          : {}),
      }
    case 'img':
      return {
        // 远端消息无本地地址；本地发送中的消息由 store 侧补 localUrl
        localUrl: '',
        filename: msg.file?.filename,
        filetype: msg.file?.filetype,
        width: msg.width,
        height: msg.height,
        isOriginalImage: msg.isOriginalImage,
        originalImageUrl: msg.originalImageUrl,
        bigImageUrl: msg.bigImageUrl,
        thumbnailUrl: msg.thumb,
        secret: msg.secret,
        fileLength: msg.file_length,
      }
    case 'audio':
      return {
        url: msg.url,
        filename: msg.filename,
        filetype: msg.filetype,
        duration: msg.length || 0,
        fileLength: msg.file_length,
        secret: msg.secret,
      }
    case 'video':
      return {
        url: msg.url,
        filename: msg.filename,
        filetype: msg.filetype,
        duration: msg.length || 0,
        fileLength: msg.file_length,
        secret: msg.secret,
        thumbnailUrl: msg.thumb,
      }
    case 'file':
      return {
        url: msg.url,
        filename: msg.filename || '',
        filetype: msg.filetype,
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
        params: msg.customExts as Record<string, string> | undefined,
      }
    case 'combine':
      return {
        title: msg.title,
        summary: msg.summary,
        url: msg.url,
        filename: msg.filename,
        // 4.x CombineMsgBody 无 filetype 字段，中立契约为必填，兜底空串
        filetype: '',
        fileLength: msg.file_length,
        secret: msg.secret,
        combineLevel: msg.combineLevel ?? 0,
      }
    default:
      // 未识别类型兜底为文本空消息，避免渲染崩溃
      return { content: '' }
  }
}

/**
 * 将 4.x 消息体转换为中立 UiMessage。
 * - 4.x `id` → `msgServerId`（接收消息单 ID；发送结果的双 ID 在 domain 层用 SendMsgResult 覆盖）
 * - `chatType` → `conversationType`；`time` → `timestamp`
 * - 4.x `isRead`/`isDelivered`（仅单聊消息携带）→ `isPeerRead`/`isPeerDelivered`
 * - 4.x 无 `sender` 字段，用 `from` 合成
 * - 流式分片（StreamMsgBody）经 `stream` 字段判别，fullText（优先取回调 `msg` 的 SDK 合并全量）写入 body.content
 */
export function toUiMessage(sdkMsg: MessagesType, currentUserId: string): UiMessage {
  if (!currentUserId) {
    adapterLog.warn('[toUiMessage] currentUserId is empty, isSelf may be inaccurate', {
      from: sdkMsg.from,
      to: sdkMsg.to,
      type: sdkMsg.type,
    })
  }
  const isSelf = normalizeUserId(sdkMsg.from || '') === normalizeUserId(currentUserId)
  const type = MESSAGE_TYPE_MAP[sdkMsg.type] || MESSAGE_TYPE.TEXT
  const isGroup = sdkMsg.chatType === CONVERSATION_TYPE.GROUPCHAT
  const body = mapBody(sdkMsg)

  const uiMsg: UiMessage = {
    msgServerId: sdkMsg.id || '',
    msgLocalId: sdkMsg.id || '',
    from: sdkMsg.from || currentUserId,
    to: sdkMsg.to,
    sender: { userId: sdkMsg.from || currentUserId },
    conversationId: deriveConversationId(sdkMsg, currentUserId),
    conversationType: sdkMsg.chatType === 'chatRoom'
      ? 'chatRoom'
      : isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT,
    type,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: (sdkMsg.ext || {}) as Record<string, unknown>,
    timestamp: sdkMsg.time || Date.now(),
    body,
    isOnline: mapOnlineState(sdkMsg.onlineState),
    receiverList: sdkMsg.receiverList ? [...sdkMsg.receiverList] : undefined,
    deliverOnlineOnly: sdkMsg.deliverOnlineOnly,
    webhookEnv: sdkMsg.webhookEnv,
    priority: sdkMsg.priority,
    isBroadcast: sdkMsg.broadcast,
    isContentReplaced: sdkMsg.isContentReplaced,
    isPeerRead: sdkMsg.isRead,
    isPeerDelivered: sdkMsg.isDelivered,
    needReadReceipt: sdkMsg.msgConfig?.allowGroupAck === true ? true : undefined,
    isChatThread: sdkMsg.isChatThread,
    modifiedInfo: sdkMsg.modifiedInfo ? { ...sdkMsg.modifiedInfo } : undefined,
    reactions: sdkMsg.reactions?.map(r => ({ ...r })),
    isSelf,
    status: isSelf && sdkMsg.isRead === true
      ? MESSAGE_STATUS.READ
      : MESSAGE_STATUS.SENT,
  }

  // Thread 上下文（二期能力，字段名两代基本一致，直接收窄拷贝）
  if (sdkMsg.chatThread) {
    uiMsg.chatThread = {
      messageId: sdkMsg.chatThread.messageId,
      parentId: sdkMsg.chatThread.parentId,
      chatThreadName: sdkMsg.chatThread.chatThreadName as unknown as string | undefined,
    }
  }
  if (sdkMsg.chatThreadOverview) {
    const overview = sdkMsg.chatThreadOverview
    uiMsg.chatThreadOverview = {
      chatThreadId: overview.id,
      parentId: overview.parentId,
      name: overview.name,
      createdAt: overview.createTimestamp,
      updatedAt: overview.updateTimestamp,
      messageCount: overview.messageCount,
    }
  }

  // 合并消息 messageList 仅创建/转发场景出现（4.x CombineMsgBody 不携带，防御性处理），
  // markRaw 避免进入 Vue 响应式系统产生性能问题
  if (type === MESSAGE_TYPE.COMBINE && (body as CombineMessageBody).messageList) {
    uiMsg.body = {
      ...body,
      messageList: markRaw([...(body as CombineMessageBody).messageList!]),
    } as CombineMessageBody
  }

  // 流式分片：映射中立 meta 并以累计全文覆盖 body.content（幂等，不依赖分片到达顺序；
  // fullText 优先取 SDK 回调 msg 字段的合并全量，msg 缺失时由 adapter 自累计兜底）
  if (isStreamMsgBody(sdkMsg)) {
    const meta = mapStreamChunk(sdkMsg.id, sdkMsg.stream, sdkMsg.msg)
    uiMsg.stream = meta
    uiMsg.body = { ...(uiMsg.body as { content: string }), content: meta.fullText }
  }

  return uiMsg
}

/** 批量转换 4.x 消息体 */
export function toUiMessages(sdkMsgs: readonly MessagesType[], currentUserId: string): UiMessage[] {
  return sdkMsgs.map(msg => toUiMessage(msg, currentUserId))
}

/**
 * 中立 SdkMessage → 4.x 消息体（反向映射）。
 * 用于合并转发：`CreateCombineMsgParameters.messageList` 需要 4.x 创建参数形状。
 * CMD/通知等不可合并类型返回 null，由调用方过滤。
 */
export function toWebim4MessageBody(msg: SdkMessage): EasemobChat.CombineMsgList[number] | null {
  const base = {
    id: msg.msgServerId || msg.msgLocalId,
    chatType: msg.conversationType,
    to: msg.to,
    from: msg.from,
    time: msg.timestamp,
    ext: msg.ext,
  }
  const { body } = msg
  switch (msg.type) {
    case MESSAGE_TYPE.TEXT:
      return { ...base, type: 'txt', msg: 'content' in body ? body.content : '' }
    case MESSAGE_TYPE.IMAGE:
      return {
        ...base,
        type: 'img',
        url: ('originalImageUrl' in body && body.originalImageUrl) || undefined,
        thumb: 'thumbnailUrl' in body ? body.thumbnailUrl : undefined,
        width: 'width' in body ? body.width : undefined,
        height: 'height' in body ? body.height : undefined,
        file_length: 'fileLength' in body ? body.fileLength : undefined,
        secret: 'secret' in body ? body.secret : undefined,
      }
    case MESSAGE_TYPE.VOICE: {
      const url = 'url' in body ? body.url : undefined
      const filename = ('filename' in body && body.filename) || ''
      return {
        ...base,
        type: 'audio',
        // Audio/Video/File 的 4.x body 类型要求携带 file: FileObj，按已上传地址重建
        file: { url: url || '', filename, filetype: '', data: undefined as unknown as File },
        url,
        filename,
        length: 'duration' in body ? body.duration : 0,
        file_length: 'fileLength' in body ? body.fileLength : undefined,
        secret: 'secret' in body ? body.secret : undefined,
      }
    }
    case MESSAGE_TYPE.VIDEO: {
      const url = 'url' in body ? body.url : undefined
      const filename = ('filename' in body && body.filename) || ''
      return {
        ...base,
        type: 'video',
        file: { url: url || '', filename, filetype: '', data: undefined as unknown as File },
        url,
        filename,
        length: 'duration' in body ? body.duration : 0,
        file_length: 'fileLength' in body ? body.fileLength : undefined,
        secret: 'secret' in body ? body.secret : undefined,
        thumb: 'thumbnailUrl' in body ? body.thumbnailUrl : undefined,
      }
    }
    case MESSAGE_TYPE.FILE: {
      const url = 'url' in body ? body.url : undefined
      const filename = 'filename' in body ? body.filename : undefined
      return {
        ...base,
        type: 'file',
        file: { url: url || '', filename: filename || '', filetype: '', data: undefined as unknown as File },
        url,
        filename,
        file_length: 'fileLength' in body ? body.fileLength : undefined,
        secret: 'secret' in body ? body.secret : undefined,
      }
    }
    case MESSAGE_TYPE.LOCATION:
      return {
        ...base,
        type: 'loc',
        lat: 'latitude' in body ? body.latitude : 0,
        lng: 'longitude' in body ? body.longitude : 0,
        addr: ('address' in body && body.address) || '',
        buildingName: ('buildingName' in body && body.buildingName) || '',
      }
    case MESSAGE_TYPE.CUSTOM:
      return {
        ...base,
        type: 'custom',
        customEvent: 'event' in body ? body.event : '',
        customExts: ('params' in body && body.params) || {},
      }
    case MESSAGE_TYPE.COMBINE:
      return {
        ...base,
        type: 'combine',
        title: 'title' in body ? body.title : '',
        summary: 'summary' in body ? body.summary : '',
        compatibleText: '',
        combineLevel: msg.combineLevel ?? ('combineLevel' in body ? body.combineLevel : 0),
        url: 'url' in body ? body.url : undefined,
        secret: 'secret' in body ? body.secret : undefined,
        filename: ('filename' in body && body.filename) || '',
      }
    default:
      // cmd / notice 等类型不支持合并转发
      return null
  }
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
