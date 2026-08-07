import type { Message as SdkMessage, SessionMessageSnippet } from 'easemob-websdk'
import { markRaw } from 'vue'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '../../constants'
import type { ConversationTypeValue } from '../../constants'
import {
  isCmdBody as isCmdMessageBody,
  isCombineBody as isCombineMessageBody,
  isCustomBody as isCustomMessageBody,
  isFileBody as isFileMessageBody,
  isImageBody as isImageMessageBody,
  isLocationBody as isLocationMessageBody,
  isTextBody as isTextMessageBody,
  isVideoBody as isVideoMessageBody,
  isVoiceBody as isVoiceMessageBody,
} from '../types/message'
import type { UiMessage } from '../types'
import type { CombineMessageBody } from '../types/message'
import { customEventPreviewMap } from '../../utils/resolve-last-message-text'
import { createLogger } from '../../utils/logger'

const adapterLog = createLogger('UIKit:MessageAdapter')

/**
 * 归一化用户标识，用于跨设备/资源后缀场景下的身份比较。
 * Easemob SDK 中，自己其他设备发给当前设备时 from 为 `当前用户ID/来源设备ID`，
 * 多端登录时若直接做字符串相等比较会把己方消息误判为对方消息。
 */
export function normalizeUserId(id: string): string {
  if (!id)
    return id
  // 优先处理多设备后缀 `/deviceId`，再处理历史可能的 `@appKey`/`#appKey` 后缀
  return id.split('/')[0]!.split('@')[0]!.split('#')[0]!
}

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
export function extractLastMessageText(sdkMsg: SdkMessage | null | undefined): string {
  if (!sdkMsg)
    return ''

  const { body } = sdkMsg
  if (isTextMessageBody(body))
    return body.content || ''
  if (isImageMessageBody(body))
    return '[图片]'
  if (isVoiceMessageBody(body))
    return '[语音]'
  if (isVideoMessageBody(body))
    return '[视频]'
  if (isFileMessageBody(body))
    return body.filename || '[文件]'
  if (isLocationMessageBody(body))
    return '[位置]'
  if (isCustomMessageBody(body))
    // 自定义消息按 event 查共享映射（与消息驱动摘要一致，如名片 userCard → [名片]）
    return customEventPreviewMap[body.event || ''] || '[自定义]'
  if (isCmdMessageBody(body))
    return '[命令]'
  if (isCombineMessageBody(body))
    return body.summary || '[聊天记录]'
  return ''
}

/** 从会话最后一条消息摘要（SessionMessageSnippet）提取文本 */
export function extractSnippetText(snippet: SessionMessageSnippet | null | undefined): string {
  if (!snippet)
    return ''

  const body = snippet.body || {}
  switch (snippet.type) {
    case MESSAGE_TYPE.TEXT:
      // combine 经 WS 会话同步会被 payload-decoder 降级为 text（title/summary 丢失），
      // content 为空时尝试 summary，避免预览空白
      return (body.content as string) || (body.summary as string) || ''
    case MESSAGE_TYPE.IMAGE:
      return '[图片]'
    case MESSAGE_TYPE.VOICE:
      return '[语音]'
    case MESSAGE_TYPE.VIDEO:
      return '[视频]'
    case MESSAGE_TYPE.FILE:
      return (body.filename as string) || '[文件]'
    case MESSAGE_TYPE.LOCATION:
      return '[位置]'
    case MESSAGE_TYPE.CUSTOM: {
      // 自定义消息按 event 查共享映射（与消息驱动摘要一致，如名片 userCard → [名片]）
      const event = extractCustomEvent(body)
      return customEventPreviewMap[event] || '[自定义]'
    }
    case MESSAGE_TYPE.CMD:
      return '[命令]'
    case MESSAGE_TYPE.COMBINE:
      return (body.summary as string) || '[聊天记录]'
    default: {
      // SDK 链路异常时 snippet.type 可能落为 'unknown' 等未知值
      // （如 toConversationSummary 从被 stripBodyType 清空的 body.type 读类型）。
      // 此时仍应展示 body 中的可用文本，避免旧端合并消息
      // （content 为“版本过低”）等场景预览空白。
      // 优先识别自定义 event，避免 userCard 等自定义消息在会话列表空白。
      const event = extractCustomEvent(body)
      if (event)
        return customEventPreviewMap[event] || '[自定义]'
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
