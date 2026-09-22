import type { CustomMessageBody, TextMessageBody, UiMessage } from '@easemob-community/uikit-core'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { ConversationTypeValue } from '@easemob-community/uikit-core'
import { createLogger } from '@easemob-community/uikit-core'
import { useUIKit } from './use-uikit'

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
  if (!enabled || chatType !== CONVERSATION_TYPE.GROUPCHAT) {
    logger.info('[GroupAck] shouldEnableGroupAck 判定', { chatType, groupId, enabled, result: false })
    return false
  }
  const memberCount = stores?.group?.getGroupById?.(groupId)?.memberCount || 0
  const limit = maxGroupSize && maxGroupSize > 0 ? maxGroupSize : 200
  const result = memberCount > 0 && memberCount <= limit
  logger.info('[GroupAck] shouldEnableGroupAck 判定', { chatType, groupId, enabled, memberCount, limit, result })
  return result
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

    // 媒体/未知类型不进入删旧逻辑（下方 switch 单独处理）
    const resendId = message.msgServerId || message.msgLocalId
    const isTextLike = message.type === MESSAGE_TYPE.TEXT || message.type === MESSAGE_TYPE.CUSTOM
    // 先发后删的补偿式实现：_send 被调用时同步插入新 sending 气泡，
    // 若先删旧消息再发，发送前同步抛错会导致该条消息静默丢失；
    // 故先删旧消息（避免双气泡），失败时回补旧消息并上抛。
    if (isTextLike)
      messageStore.deleteMessage(resendId)

    try {
      switch (message.type) {
        case MESSAGE_TYPE.TEXT:
          return await domains.message.sendText(cvs.id, cvs.type, (message.body as TextMessageBody).content || '', message.ext)
        case MESSAGE_TYPE.CUSTOM:
          return await domains.message.sendCustom(
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
          // 抛标识错误由调用方（message-list onResend）转为 toast，避免静默无反馈
          logger.warn('[useMessageSend] resendMessage: media resend requires original File')
          throw new Error('MEDIA_RESEND_UNSUPPORTED')
        default:
          logger.warn('[useMessageSend] resendMessage: unsupported message type', message.type)
      }
    }
    catch (error) {
      // 发送未成功：回补旧失败消息，避免从列表静默消失
      if (isTextLike)
        messageStore.addMessage(message)
      throw error
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
