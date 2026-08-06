import type { CustomMessageBody, TextMessageBody, UiMessage } from '../sdk/types'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '../constants'
import type { ConversationTypeValue } from '../constants'
import { useUIKit } from './use-uikit'
import { createLogger } from '../utils/logger'

const logger = createLogger('UIKit:UseMessageSend')

export interface SendMessageOptions {
  /** 是否启用群已读回执 */
  groupReadReceiptEnabled?: boolean
  /** 群已读回执最大群成员数限制 */
  maxGroupSize?: number
}

function shouldEnableGroupAck(
  chatType: ConversationTypeValue,
  groupId: string,
  enabled?: boolean,
  maxGroupSize?: number,
  stores?: any,
): boolean {
  if (!enabled || chatType !== CONVERSATION_TYPE.GROUPCHAT)
    return false
  const memberCount = stores?.group?.getGroupById?.(groupId)?.memberCount || 0
  const limit = maxGroupSize && maxGroupSize > 0 ? maxGroupSize : 200
  return memberCount > 0 && memberCount <= limit
}

export function useMessageSend() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const messageStore = stores.message

  function currentCvs() {
    return conversationStore.currentConversation
  }

  /** 发送文本消息 */
  async function sendTextMessage(text: string, ext?: Record<string, unknown>, options?: SendMessageOptions) {
    const cvs = currentCvs()
    if (!cvs)
      return
    // 群已读回执开关：按会话类型与群规模计算，接通 SDK needReadReceipt（单聊恒为 false）
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendText(cvs.id, cvs.type, text, ext, enableGroupAck)
  }

  /** 发送图片消息，data 支持 File 或图片 URL（如 GIF 表情包） */
  async function sendImageMessage(data: File | string, options?: SendMessageOptions, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs)
      return
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendImage(cvs.id, cvs.type, data, ext, enableGroupAck)
  }

  /** 发送文件消息 */
  async function sendFileMessage(file: File, options?: SendMessageOptions, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs)
      return
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendFile(cvs.id, cvs.type, file, ext, enableGroupAck)
  }

  /** 发送语音消息 */
  async function sendAudioMessage(
    file: File,
    duration: number,
    options?: SendMessageOptions,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs)
      return
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendVoice(cvs.id, cvs.type, file, duration, ext, enableGroupAck)
  }

  /** 发送视频消息 */
  async function sendVideoMessage(
    file: File,
    duration: number,
    options?: SendMessageOptions,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs)
      return
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendVideo(cvs.id, cvs.type, file, duration, ext, enableGroupAck)
  }

  /** 发送位置消息 */
  async function sendLocationMessage(
    latitude: number,
    longitude: number,
    address?: string,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs)
      return
    await domains.message.sendLocation(cvs.id, cvs.type, latitude, longitude, address, ext)
  }

  /** 发送自定义消息 */
  async function sendCustomMessage(
    event: string,
    params?: Record<string, string>,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs)
      return
    await domains.message.sendCustom(cvs.id, cvs.type, event, params, ext)
  }

  /** 发送命令消息 */
  async function sendCmdMessage(action: string, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs)
      return
    await domains.message.sendCmd(cvs.id, cvs.type, action, ext)
  }

  /** 重发失败的消息 */
  async function resendMessage(message: UiMessage) {
    const cvs = currentCvs()
    if (!cvs)
      return

    switch (message.type) {
      case MESSAGE_TYPE.TEXT:
        // 文本/自定义消息：确认能重发后再删除本地失败消息，避免删完发不出去导致丢消息
        messageStore.deleteMessage(message.msgServerId || message.msgLocalId)
        return domains.message.sendText(cvs.id, cvs.type, (message.body as TextMessageBody).content || '', message.ext)
      case MESSAGE_TYPE.CUSTOM:
        messageStore.deleteMessage(message.msgServerId || message.msgLocalId)
        return domains.message.sendCustom(
          cvs.id,
          cvs.type,
          (message.body as CustomMessageBody).event || '',
          (message.body as CustomMessageBody).params,
          message.ext,
        )
      case MESSAGE_TYPE.IMAGE:
      case MESSAGE_TYPE.VOICE:
      case MESSAGE_TYPE.VIDEO:
      case MESSAGE_TYPE.FILE:
        // 媒体消息重发需要原始 File，当前无法重发：保留本地失败消息，不得删除
        logger.warn('[useMessageSend] resendMessage: media resend requires original File')
        return
      default:
        logger.warn('[useMessageSend] resendMessage: unsupported message type', message.type)
    }
  }

  return {
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendAudioMessage,
    sendVideoMessage,
    sendLocationMessage,
    sendCustomMessage,
    sendCmdMessage,
    resendMessage,
  }
}
