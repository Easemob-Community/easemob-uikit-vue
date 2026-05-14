import { ref } from 'vue'
import type { Message } from '../store/message'

/** 引用消息协议类型（ext.msgQuote） */
export interface MsgQuotePayload {
  /** 原消息 ID（优先 mid，其次 id） */
  msgID: string
  /** 预览文本 */
  msgPreview: string
  /** 发送人显示名 / ID */
  msgSender: string
  /** 原消息类型 */
  msgType: 'txt' | 'img' | 'video' | 'file' | 'audio' | 'custom' | 'loc' | 'cmd'
}

/** 模块级单例：当前输入框中正在引用的消息 */
const quotedMessage = ref<Message | null>(null)

/** 模块级单例：当前需要闪烁高亮的消息 ID（mid 或 id 任一即可） */
const highlightedMessageId = ref<string>('')

/** 模块级单例：定位请求 token —— 列表端 watch 该值进行滚动定位与未找到提示 */
const locateRequest = ref<{ msgID: string; token: number } | null>(null)

/** 生成引用预览文本 */
export function getQuotePreview(message: Message): string {
  switch (message.type) {
    case 'txt':
      return 'msg' in message ? String((message as unknown as { msg: string }).msg ?? '') : ''
    case 'img':
      return '[图片]'
    case 'audio':
      return '[语音]'
    case 'video':
      return '[视频]'
    case 'file': {
      const filename = 'filename' in message ? (message as unknown as { filename?: string }).filename : ''
      return filename ? filename : '[文件]'
    }
    case 'loc':
      return '[位置]'
    case 'custom':
      return '[自定义消息]'
    case 'cmd':
      return '[指令]'
    default:
      return '[消息]'
  }
}

/** 构造 ext.msgQuote（仅返回 { msgQuote } 片段，调用方可与其他 ext 合并） */
export function buildQuoteExt(message: Message): { msgQuote: MsgQuotePayload } {
  const msgID = message.mid || message.id
  return {
    msgQuote: {
      msgID,
      msgPreview: getQuotePreview(message),
      msgSender: message.from || '',
      msgType: message.type as MsgQuotePayload['msgType'],
    },
  }
}

/**
 * 消息引用全局状态 hook
 * - 列表端通过 setQuote 写入待引用消息
 * - 输入框端通过 quotedMessage 读取并展示 QuoteBar
 * - 发送后调用 clearQuote 清空状态
 * - 气泡内引用卡片点击通过 requestLocate 触发定位/闪烁，列表端 watch locateRequest 处理
 */
export function useQuote() {
  function setQuote(message: Message) {
    quotedMessage.value = message
  }

  function clearQuote() {
    quotedMessage.value = null
  }

  /** 触发一次定位请求：携带递增 token 让列表端 watch 即使相同 msgID 也能触发 */
  function requestLocate(msgID: string) {
    if (!msgID) return
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
