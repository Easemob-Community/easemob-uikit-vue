import { MESSAGE_STATUS, CONVERSATION_TYPE } from '../../constants'
import type { ConversationTypeValue } from '../../constants'
import type { Message } from '../../store/message'

/**
 * 新 SDK Message 基础字段（WebSocket 层原始消息结构）
 */
export interface SdkMsgBase {
  msgServerId?: string
  id?: string
  from?: string
  to?: string
  timestamp?: number
  time?: number
  conversationType?: 'singleChat' | 'groupChat'
  chatType?: string
  ext?: { [key: string]: unknown }
  /**
   * @see SDK_DEFICIENCY: MessageBody 联合类型未从 im-sdk-web 主入口导出，
   * 无法在编译期约束 body 的精确类型。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
  type?: string
}

/**
 * 从 SDK 消息中计算 conversationId
 * - 群聊：msg.to 即群 ID
 * - 单聊：取对方 ID（msg.from === 当前用户 ? msg.to : msg.from）
 */
export function resolveConversationId(msg: SdkMsgBase, currentUser: string): string {
  const isGroup = msg.conversationType === 'groupChat' || msg.chatType === 'groupChat'
  return (isGroup ? msg.to : (msg.from === currentUser ? msg.to : msg.from)) || ''
}

/**
 * 从 SDK Message body 中提取 lastMessageText
 */
export function getLastMessageText(sdkMsg: SdkMsgBase): string {
  switch (sdkMsg.type) {
    case 'text':
      return sdkMsg.body?.content || ''
    case 'image':
      return '[图片]'
    case 'voice':
      return '[语音]'
    case 'video':
      return '[视频]'
    case 'file':
      return '[文件]'
    case 'location':
      return '[位置]'
    case 'combine':
      return sdkMsg.body?.summary || '[聊天记录]'
    case 'cmd':
      return '[命令]'
    case 'custom':
      return '[自定义]'
    default:
      return ''
  }
}

/**
 * 将新 SDK Message 转换为 UI Message
 */
export function convertSdkMessageToUiMessage(sdkMsg: SdkMsgBase, currentUser: string): Message {
  const isGroup = sdkMsg.conversationType === 'groupChat' || sdkMsg.chatType === 'groupChat'
  const chatType: ConversationTypeValue = isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT
  const conversationId = resolveConversationId(sdkMsg, currentUser)

  // 解析 allowGroupAck
  /**
   * @see SDK_DEFICIENCY: SDK Message 类型未暴露 msgConfig 字段，
   * 但 WebSocket 层实际下发该字段用于群已读回执标记。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgConfigAllowGroupAck = (sdkMsg as any).msgConfig?.allowGroupAck
  const extMsgConfigAllowGroupAck = sdkMsg.ext
    && typeof sdkMsg.ext === 'object'
    && sdkMsg.ext.msgConfig
    && typeof sdkMsg.ext.msgConfig === 'object'
    && (sdkMsg.ext.msgConfig as Record<string, unknown>).allowGroupAck
  const requireGroupAck = !!(msgConfigAllowGroupAck || extMsgConfigAllowGroupAck)

  const body = sdkMsg.body || {}

  const uiMsg: Message = {
    // 身份
    id: sdkMsg.id || sdkMsg.msgServerId || '',
    serverId: sdkMsg.msgServerId || sdkMsg.id || '',
    // 会话
    from: sdkMsg.from || '',
    to: sdkMsg.to || '',
    conversationType: chatType,
    // 时间
    timestamp: sdkMsg.timestamp || sdkMsg.time || Date.now(),
    // 类型
    type: (sdkMsg.type || 'text') as Message['type'],
    // 扩展
    ext: sdkMsg.ext,
    // 文本消息
    content: body.content,
    // 媒体消息
    url: body.url || body.originalImageUrl,
    thumbnailUrl: body.thumbnailUrl,
    secret: body.secret,
    filename: body.filename,
    fileSize: body.fileSize,
    duration: body.duration,
    width: body.width,
    height: body.height,
    // 位置消息
    latitude: body.latitude,
    longitude: body.longitude,
    address: body.address,
    // 自定义消息
    customEvent: body.customEvent,
    customExts: body.customExts,
    // 合并消息
    title: body.title,
    summary: body.summary,
    compatibleText: body.compatibleText,
    messageList: body.messageList,
    // 命令消息
    action: body.action,
    // UI 扩展
    conversationId,
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
    requireGroupAck: requireGroupAck || undefined,
  }

  return uiMsg
}

/**
 * 检测消息是否@了当前用户
 * - 检查 ext.em_at_list 是否包含当前用户ID
 */
export function isAtMe(msg: SdkMsgBase, currentUser: string): boolean {
  const atList = msg.ext?.em_at_list
  if (Array.isArray(atList)) {
    return atList.includes(currentUser)
  }
  return false
}
