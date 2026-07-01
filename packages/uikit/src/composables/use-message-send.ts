import { computed } from 'vue'
import { useUIKit } from './use-uikit'
import { MESSAGE_STATUS } from '../constants'
import type { UiMessage, TextMessageBody, CustomMessageBody } from '../sdk/types'

export interface SendMessageOptions {
  /** 是否启用群已读回执 */
  groupReadReceiptEnabled?: boolean
  /** 群已读回执最大群成员数限制 */
  maxGroupSize?: number
}

function shouldEnableGroupAck(
  chatType: 'singleChat' | 'groupChat',
  groupId: string,
  enabled?: boolean,
  maxGroupSize?: number,
  stores?: any,
): boolean {
  if (!enabled || chatType !== 'groupChat') return false
  const memberCount = stores?.group?.getGroupById?.(groupId)?.memberCount || 0
  const limit = maxGroupSize && maxGroupSize > 0 ? maxGroupSize : 200
  return memberCount > 0 && memberCount <= limit
}

export function useMessageSend() {
  const { domains, stores } = useUIKit()
  const conversationStore = stores.conversation
  const messageStore = stores.message
  const currentUser = computed(() => stores.client.currentUser)

  function currentCvs() {
    return conversationStore.currentConversation
  }

  /** 发送文本消息 */
  async function sendTextMessage(text: string, ext?: Record<string, unknown>, options?: SendMessageOptions) {
    const cvs = currentCvs()
    if (!cvs) return
    const enableGroupAck = shouldEnableGroupAck(
      cvs.type,
      cvs.id,
      options?.groupReadReceiptEnabled,
      options?.maxGroupSize,
      stores,
    )
    await domains.message.sendText(cvs.id, cvs.type, text, ext)
  }

  /** 发送图片消息 */
  async function sendImageMessage(file: File, options?: SendMessageOptions, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendImage(cvs.id, cvs.type, file, ext)
  }

  /** 发送文件消息 */
  async function sendFileMessage(file: File, options?: SendMessageOptions, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendFile(cvs.id, cvs.type, file, ext)
  }

  /** 发送语音消息 */
  async function sendAudioMessage(
    file: File,
    duration: number,
    options?: SendMessageOptions,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendVoice(cvs.id, cvs.type, file, duration, ext)
  }

  /** 发送视频消息 */
  async function sendVideoMessage(
    file: File,
    duration: number,
    options?: SendMessageOptions,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendVideo(cvs.id, cvs.type, file, duration, ext)
  }

  /** 发送位置消息 */
  async function sendLocationMessage(
    latitude: number,
    longitude: number,
    address?: string,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendLocation(cvs.id, cvs.type, latitude, longitude, address, ext)
  }

  /** 发送自定义消息 */
  async function sendCustomMessage(
    event: string,
    params?: Record<string, string>,
    ext?: Record<string, unknown>,
  ) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendCustom(cvs.id, cvs.type, event, params, ext)
  }

  /** 发送命令消息 */
  async function sendCmdMessage(action: string, ext?: Record<string, unknown>) {
    const cvs = currentCvs()
    if (!cvs) return
    await domains.message.sendCmd(cvs.id, cvs.type, action, ext)
  }

  /** 重发失败的消息 */
  async function resendMessage(message: UiMessage) {
    const cvs = currentCvs()
    if (!cvs) return

    messageStore.deleteMessage(message.msgServerId || message.msgLocalId)

    switch (message.type) {
      case 'text':
        return domains.message.sendText(cvs.id, cvs.type, (message.body as TextMessageBody).content || '', message.ext)
      case 'custom':
        return domains.message.sendCustom(
          cvs.id,
          cvs.type,
          (message.body as CustomMessageBody).event || '',
          (message.body as CustomMessageBody).params,
          message.ext,
        )
      case 'image':
      case 'voice':
      case 'video':
      case 'file':
        console.warn('[useMessageSend] resendMessage: media resend requires original File')
        return
      default:
        console.warn('[useMessageSend] resendMessage: unsupported message type', message.type)
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
