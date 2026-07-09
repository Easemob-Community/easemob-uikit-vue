import type { Message as SdkMessage, SessionMessageSnippet } from 'easemob-websdk'
import { markRaw } from 'vue'
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

/**
 * 将 SDK Message 转换为 UIKit Message。
 * - 保留 SDK Message 全部字段作为真相源
 * - 仅添加 UI 层需要的计算/状态字段
 * - 合并消息的 messageList 仅用于创建/转发，UI 渲染不需要，
 *   标记为 raw 避免进入 Vue 响应式系统产生性能问题。
 */
export function toUiMessage(sdkMsg: SdkMessage, currentUserId: string): UiMessage {
  const uiMsg: UiMessage = {
    ...sdkMsg,
    isSelf: sdkMsg.from === currentUserId,
    localId: sdkMsg.msgLocalId,
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
    return '[自定义]'
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
    case 'text':
      return (body.content as string) || ''
    case 'image':
      return '[图片]'
    case 'voice':
      return '[语音]'
    case 'video':
      return '[视频]'
    case 'file':
      return (body.filename as string) || '[文件]'
    case 'location':
      return '[位置]'
    case 'custom':
      return '[自定义]'
    case 'cmd':
      return '[命令]'
    case 'combine':
      return (body.summary as string) || '[聊天记录]'
    default:
      return ''
  }
}

/** 判断消息是否属于指定会话 */
export function isMessageInConversation(
  sdkMsg: SdkMessage,
  conversationId: string,
  conversationType: 'singleChat' | 'groupChat',
): boolean {
  return sdkMsg.conversationId === conversationId && sdkMsg.conversationType === conversationType
}

/** 从 SDK Message 计算单聊场景下的对方用户 ID */
export function resolvePeerUserId(sdkMsg: SdkMessage, currentUserId: string): string {
  if (sdkMsg.conversationType === 'groupChat')
    return sdkMsg.to
  return sdkMsg.from === currentUserId ? sdkMsg.to : sdkMsg.from
}
