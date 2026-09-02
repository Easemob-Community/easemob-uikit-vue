import type { Message as SdkMessage, SessionMessageSnippet } from 'easemob-websdk'
import { markRaw } from 'vue'
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  createLogger,
  isCmdBody as isCmdMessageBody,
  isCombineBody as isCombineMessageBody,
  isCustomBody as isCustomMessageBody,
  isFileBody as isFileMessageBody,
  isImageBody as isImageMessageBody,
  isLocationBody as isLocationMessageBody,
  isTextBody as isTextMessageBody,
  isVideoBody as isVideoMessageBody,
  isVoiceBody as isVoiceMessageBody,
  normalizeUserId,
} from '@easemob/uikit-sdk-contract'
import type { CombineMessageBody, ConversationTypeValue, MessagePreviewLabels, UiMessage } from '@easemob/uikit-sdk-contract'
import { customEventPreviewMap, mergeMessagePreviewLabels } from '@easemob/uikit-sdk-contract'

const adapterLog = createLogger('UIKit:MessageAdapter')

/**
 * websdk5 adapter 内部默认摘要标签（中文，与历史 UI 行为保持一致）。
 * 后续可通过 adapterConfig 注入覆盖，实现多语言。
 */
export const defaultAdapterPreviewLabels: MessagePreviewLabels = {
  image: '[图片]',
  sticker: '[表情]',
  voice: '[语音]',
  video: '[视频]',
  file: '[文件]',
  location: '[位置]',
  combine: '[聊天记录]',
  custom: customEventPreviewMap,
  customFallback: '[自定义]',
  unknown: '',
}

/**
 * 归一化用户标识（跨设备/资源后缀场景下的身份比较）。
 * P2 review 上提至 core（uikit-im / uikit-chatroom 共用），此处 re-export
 * 保持既有导入路径兼容（本包 6 处使用点无需改动）。
 */
export { normalizeUserId } from '@easemob/uikit-sdk-contract'

/**
 * 从 custom 消息 body 中提取 event 字段。
 * SDK 不同链路对 custom body 的序列化略有差异：
 * - 正常消息体：body.event
 * - 部分会话摘要/unknown 降级：body.params.event
 */
function extractCustomEvent(body: Record<string, unknown>): string {
  if (body.event && typeof body.event === 'string')
    return body.event
  const params = body.params
  if (params && typeof params === 'object') {
    const event = (params as Record<string, unknown>).event
    if (typeof event === 'string')
      return event
  }
  return ''
}

/**
 * 将 SDK Message 转换为 UIKit Message。
 * - 保留 SDK Message 全部字段作为真相源
 * - 仅添加 UI 层需要的计算/状态字段
 * - UI 层 status 从 SDK 0.20.0 的 sendStatus / isPeerRead 推导：
 *   单聊已发送消息若对端已读（isPeerRead），直接置为 read；
 *   其余取 sendStatus，缺省（接收方向/旧缓存）视为 sent。
 * - 合并消息的 messageList 仅用于创建/转发，UI 渲染不需要，
 *   标记为 raw 避免进入 Vue 响应式系统产生性能问题。
 */
export function toUiMessage(sdkMsg: SdkMessage, currentUserId: string): UiMessage {
  if (!currentUserId) {
    adapterLog.warn('[toUiMessage] currentUserId is empty, isSelf may be inaccurate', {
      from: sdkMsg.from,
      conversationId: sdkMsg.conversationId,
      type: sdkMsg.type,
    })
  }
  const isSelf = normalizeUserId(sdkMsg.from) === normalizeUserId(currentUserId)
  const uiMsg: UiMessage = {
    ...sdkMsg,
    isSelf,
    localId: sdkMsg.msgLocalId,
    status: isSelf && sdkMsg.isPeerRead === true
      ? MESSAGE_STATUS.READ
      : (sdkMsg.sendStatus ?? MESSAGE_STATUS.SENT),
  }
  if (isCombineMessageBody(uiMsg.body) && uiMsg.body.messageList) {
    uiMsg.body = {
      ...uiMsg.body,
      messageList: markRaw([...uiMsg.body.messageList]),
    } as CombineMessageBody
  }
  return uiMsg
}

/** 批量转换 SDK Messages */
export function toUiMessages(sdkMsgs: readonly SdkMessage[], currentUserId: string): UiMessage[] {
  return sdkMsgs.map(msg => toUiMessage(msg, currentUserId))
}

/** 从 SDK Message 提取消息摘要文本 */
export function extractLastMessageText(
  sdkMsg: SdkMessage | null | undefined,
  labels?: Partial<MessagePreviewLabels>,
): string {
  if (!sdkMsg)
    return ''

  const l = mergeMessagePreviewLabels({ ...defaultAdapterPreviewLabels, ...labels })
  const { body } = sdkMsg
  if (isTextMessageBody(body))
    return body.content || ''
  if (isImageMessageBody(body))
    return l.image
  if (isVoiceMessageBody(body))
    return l.voice
  if (isVideoMessageBody(body))
    return l.video
  if (isFileMessageBody(body))
    return body.filename || l.file
  if (isLocationMessageBody(body))
    return l.location
  if (isCustomMessageBody(body))
    // 自定义消息按 event 查共享映射（与消息驱动摘要一致，如名片 userCard → [名片]）
    return l.custom[body.event || ''] || l.customFallback
  if (isCmdMessageBody(body))
    return '[命令]'
  if (isCombineMessageBody(body))
    return body.summary || l.combine
  return ''
}

/** 从会话最后一条消息摘要（SessionMessageSnippet）提取文本 */
export function extractSnippetText(
  snippet: SessionMessageSnippet | null | undefined,
  labels?: Partial<MessagePreviewLabels>,
): string {
  if (!snippet)
    return ''

  const l = mergeMessagePreviewLabels({ ...defaultAdapterPreviewLabels, ...labels })
  const body = snippet.body || {}
  switch (snippet.type) {
    case MESSAGE_TYPE.TEXT:
      // combine 经 WS 会话同步会被 payload-decoder 降级为 text（title/summary 丢失），
      // content 为空时尝试 summary，避免预览空白
      return (body.content as string) || (body.summary as string) || ''
    case MESSAGE_TYPE.IMAGE:
      return l.image
    case MESSAGE_TYPE.VOICE:
      return l.voice
    case MESSAGE_TYPE.VIDEO:
      return l.video
    case MESSAGE_TYPE.FILE:
      return (body.filename as string) || l.file
    case MESSAGE_TYPE.LOCATION:
      return l.location
    case MESSAGE_TYPE.CUSTOM: {
      // 自定义消息按 event 查共享映射（与消息驱动摘要一致，如名片 userCard → [名片]）
      const event = extractCustomEvent(body)
      return l.custom[event] || l.customFallback
    }
    case MESSAGE_TYPE.CMD:
      return '[命令]'
    case MESSAGE_TYPE.COMBINE:
      return (body.summary as string) || l.combine
    default: {
      // SDK 链路异常时 snippet.type 可能落为 'unknown' 等未知值
      // （如 toConversationSummary 从被 stripBodyType 清空的 body.type 读类型）。
      // 此时仍应展示 body 中的可用文本，避免旧端合并消息
      // （content 为“版本过低”）等场景预览空白。
      // 优先识别自定义 event，避免 userCard 等自定义消息在会话列表空白。
      const event = extractCustomEvent(body)
      if (event)
        return l.custom[event] || l.customFallback
      return (body.content as string) || (body.summary as string) || (body.msg as string) || ''
    }
  }
}

/** 判断消息是否属于指定会话 */
export function isMessageInConversation(
  sdkMsg: SdkMessage,
  conversationId: string,
  conversationType: ConversationTypeValue,
): boolean {
  return sdkMsg.conversationId === conversationId && sdkMsg.conversationType === conversationType
}

/** 从 SDK Message 计算单聊场景下的对方用户 ID */
export function resolvePeerUserId(sdkMsg: SdkMessage, currentUserId: string): string {
  if (sdkMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT)
    return sdkMsg.to
  return normalizeUserId(sdkMsg.from) === normalizeUserId(currentUserId) ? sdkMsg.to : sdkMsg.from
}
