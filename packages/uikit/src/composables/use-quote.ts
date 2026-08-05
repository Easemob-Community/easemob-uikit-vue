import { ref } from 'vue'
import type { FileMessageBody, ImageMessageBody, TextMessageBody, UiMessage } from '../sdk/types'

/** 引用消息协议类型（ext.msgQuote） */
export interface MsgQuotePayload {
  /** 原消息 ID（优先 mid，其次 id） */
  msgID: string
  /** 预览文本 */
  msgPreview: string
  /** 发送人显示名 / ID */
  msgSender: string
  /** 原消息类型 */
  msgType: 'text' | 'image' | 'video' | 'file' | 'voice' | 'custom' | 'location' | 'cmd'
  /** 图片/视频类消息的缩略图 URL，用于在引用卡片中直接展示原图/缩略图 */
  msgThumbUrl?: string
}

/** 模块级单例：当前输入框中正在引用的消息 */
const quotedMessage = ref<UiMessage | null>(null)

/** 模块级单例：当前需要闪烁高亮的消息 ID（mid 或 id 任一即可） */
const highlightedMessageId = ref<string>('')

/** 模块级单例：定位请求 token —— 列表端 watch 该值进行滚动定位与未找到提示 */
const locateRequest = ref<{ msgID: string, token: number } | null>(null)

/** 生成引用预览文本（使用【】兜底标签，去掉 emoji/icon 前缀） */
export function getQuotePreview(message: UiMessage): string {
  switch (message.type) {
    case 'text':
      return (message.body as TextMessageBody).content || ''
    case 'image':
      return '【图片】'
    case 'voice':
      return '【语音】'
    case 'video':
      return '【视频】'
    case 'file': {
      const filename = (message.body as FileMessageBody).filename
      return filename || '【文件】'
    }
    case 'location':
      return '【位置】'
    case 'custom':
      return '【自定义消息】'
    case 'cmd':
      return '【指令】'
    default:
      return '【消息】'
  }
}

/** 构造 ext.msgQuote（仅返回 { msgQuote } 片段，调用方可与其他 ext 合并） */
export function buildQuoteExt(message: UiMessage): { msgQuote: MsgQuotePayload } {
  const msgID = message.msgServerId || message.msgLocalId
  const payload: MsgQuotePayload = {
    msgID,
    msgPreview: getQuotePreview(message),
    msgSender: message.from || '',
    msgType: message.type as MsgQuotePayload['msgType'],
  }

  // 图片/视频消息：把可展示的原图/缩略图 URL 带入引用卡片，接收方无需加载原消息也能看到缩略图
  if (message.type === 'image') {
    const body = message.body as ImageMessageBody
    payload.msgThumbUrl = body.originalImageUrl || body.thumbnailUrl || body.localUrl || ''
  }
  else if (message.type === 'video') {
    const body = message.body as { thumbnailUrl?: string }
    payload.msgThumbUrl = body.thumbnailUrl || ''
  }

  return { msgQuote: payload }
}

/**
 * 消息引用全局状态 hook
 * - 列表端通过 setQuote 写入待引用消息
 * - 输入框端通过 quotedMessage 读取并展示 QuoteBar
 * - 发送后调用 clearQuote 清空状态
 * - 气泡内引用卡片点击通过 requestLocate 触发定位/闪烁，列表端 watch locateRequest 处理
 */
export function useQuote() {
  function setQuote(message: UiMessage) {
    quotedMessage.value = message
  }

  function clearQuote() {
    quotedMessage.value = null
  }

  /** 触发一次定位请求：携带递增 token 让列表端 watch 即使相同 msgID 也能触发 */
  function requestLocate(msgID: string) {
    if (!msgID)
      return
    locateRequest.value = { msgID, token: Date.now() }
  }

  /** 设置闪烁的消息 ID；传空字符串则取消闪烁 */
  function setHighlight(msgID: string) {
    highlightedMessageId.value = msgID
  }

  return {
    quotedMessage,
    highlightedMessageId,
    locateRequest,
    setQuote,
    clearQuote,
    requestLocate,
    setHighlight,
    buildQuoteExt,
    getQuotePreview,
  }
}
