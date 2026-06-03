import type {
  UpdateMessageParams,
  MessageTranslationResult,
  PinnedMessageListResult,
} from 'im-sdk-web'
import type { ConversationTypeValue } from '../../constants'
import type { ClientCore } from './index'

/**
 * 消息相关 API 服务
 */
export class MessageService {
  constructor(private core: ClientCore) {}

  /**
   * 发送文本消息
   */
  async sendText(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      content: string
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createTextMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送图片消息 */
  async sendImage(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      file: File
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createImageMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送文件消息 */
  async sendFile(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      file: File
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createFileMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送自定义消息 */
  async sendCustom(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      customEvent: string
      customExts?: Record<string, unknown>
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createCustomMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      event: options.customEvent,
      ext: options.ext,
    })
    return this.core._sendWithStatus(msg)
  }

  /** 发送语音消息 */
  async sendAudio(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      file: File
      duration: number
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createVoiceMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送视频消息 */
  async sendVideo(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      file: File
      duration: number
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createVideoMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送位置消息 */
  async sendLocation(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      latitude: number
      longitude: number
      address?: string
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createLocationMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 发送命令消息 */
  async sendCmd(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      action: string
      ext?: Record<string, unknown>
    },
  ) {
    const msg = this.core.chatManager.createCmdMessage(options)
    return this.core._sendWithStatus(msg)
  }

  /** 撤回消息 */
  async recallMessage(
    options: {
      messageId: string
      conversationId: string
      conversationType: ConversationTypeValue
    },
  ) {
    return this.core.chatManager.recallMessage({
      messageId: options.messageId,
      conversationId: options.conversationId,
      conversationType: options.conversationType,
    })
  }

  /** 修改已发送的消息 */
  async modifyMessage(options: UpdateMessageParams) {
    return this.core.chatManager.modifyMessage(options)
  }

  /** 置顶消息 */
  async pinMessage(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      messageId: string
    },
  ) {
    return this.core.chatManager.pinMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      messageId: options.messageId,
    })
  }

  /** 取消置顶消息 */
  async unpinMessage(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      messageId: string
    },
  ) {
    return this.core.chatManager.unpinMessage({
      conversationId: options.conversationId,
      conversationType: options.conversationType,
      messageId: options.messageId,
    })
  }

  /** 分页拉取会话置顶消息列表 */
  async getPinnedMessageList(
    options: {
      conversationId: string
      conversationType: ConversationTypeValue
      pageSize?: number
      cursor?: string
    },
  ): Promise<PinnedMessageListResult> {
    /**
     * @see SDK_DEFICIENCY: getPinnedMessageList 参数类型仅包含 ConversationIdentifier，
     * 不支持 pageSize/cursor 分页参数，但我们仍透传以确保向后兼容。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.core.chatManager.getPinnedMessageList(options as any)
  }

  /** 翻译文本（支持多目标语言；UIKIT 当前仅使用单目标） */
  async translateMessage(
    options: { text: string; languages: string[] },
  ): Promise<MessageTranslationResult> {
    const fakeMsg = this.core.chatManager.createTextMessage({
      conversationId: '',
      conversationType: 'singleChat' as const,
      content: options.text,
    })
    return this.core.chatManager.translateMessage({
      message: fakeMsg,
      targetLanguages: options.languages,
    })
  }

  /** 获取翻译服务支持的语言列表 */
  async getSupportedTranslationLanguages() {
    return this.core.chatManager.getSupportedTranslationLanguages()
  }

  /** 获取群消息已读用户列表 */
  async getGroupMessageReadUsers(
    options: {
      messageId: string
      groupId: string
    },
  ) {
    return this.core.chatManager.getGroupMessageReadUsers(options)
  }
}
