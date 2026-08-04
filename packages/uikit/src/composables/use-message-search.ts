import { type MaybeRef, computed, ref, toValue } from 'vue'
import { useUIKit } from './use-uikit'
import type { UiMessage } from '../sdk/types'

/** 消息搜索结果 */
export interface MessageSearchResult {
  /** 消息 ID */
  msgId: string
  /** 所属会话 ID */
  conversationId: string
  /** 发送者 ID */
  senderId: string
  /** 发送者显示名 */
  senderName: string
  /** 发送者头像 */
  avatar?: string
  /** 消息时间戳 */
  timestamp: number
  /** 摘要文本 */
  summary: string
  /** 服务端返回的高亮片段 */
  highlighted?: string[]
}

/** 消息搜索配置 */
export interface UseMessageSearchOptions {
  /** 是否启用 SDK 服务端搜索，默认 false（仅搜索本地已加载消息） */
  enableServerSearch?: boolean
  /** 每页大小，默认 20 */
  pageSize?: number
}

/** 判断消息内容是否命中关键词 */
function matchMessageContent(msg: UiMessage, keyword: string): boolean {
  const k = keyword.toLowerCase()
  if (msg.type === 'text') {
    const content = (msg.body as { content?: string }).content || ''
    return content.toLowerCase().includes(k)
  }
  if (msg.type === 'file') {
    const filename = (msg.body as { filename?: string }).filename || ''
    return filename.toLowerCase().includes(k)
  }
  if (msg.type === 'combine') {
    const title = (msg.body as { title?: string }).title || ''
    return title.toLowerCase().includes(k)
  }
  if (msg.type === 'location') {
    const address = (msg.body as { address?: string }).address || ''
    return address.toLowerCase().includes(k)
  }
  // 自定义消息支持搜索 ext 中的文本字段
  if (msg.type === 'custom') {
    const event = (msg.body as { event?: string }).event || ''
    const params = JSON.stringify((msg.body as { params?: Record<string, string> }).params || {})
    return event.toLowerCase().includes(k) || params.toLowerCase().includes(k)
  }
  return false
}

/** 从 UiMessage 提取摘要 */
function getMessageSummary(msg: UiMessage): string {
  if (msg.type === 'text')
    return (msg.body as { content?: string }).content || ''
  if (msg.type === 'image')
    return '[图片]'
  if (msg.type === 'voice')
    return '[语音]'
  if (msg.type === 'video')
    return '[视频]'
  if (msg.type === 'file')
    return `[文件] ${(msg.body as { filename?: string }).filename || ''}`
  if (msg.type === 'location')
    return `[位置] ${(msg.body as { address?: string }).address || ''}`
  if (msg.type === 'combine')
    return (msg.body as { title?: string }).title || '[聊天记录]'
  if (msg.type === 'custom')
    return (msg.body as { event?: string }).event || '[自定义消息]'
  return '[未知消息]'
}

/**
 * 消息搜索 Hook
 * - 默认仅搜索当前会话本地已加载消息
 * - 开启 enableServerSearch 后额外调用 SDK searchMessages 搜索服务端历史
 */
export function useMessageSearch(options: MaybeRef<UseMessageSearchOptions> = {}) {
  const { stores, client } = useUIKit()

  const keyword = ref('')
  const results = ref<MessageSearchResult[]>([])
  const loading = ref(false)
  const error = ref('')
  const pageNum = ref(1)
  const hasMore = ref(false)
  const totalPages = ref(0)

  const currentConversation = computed(() => stores.conversation.currentConversation)
  const currentConversationId = computed(() => stores.conversation.currentConversationId)

  function reset() {
    keyword.value = ''
    results.value = []
    pageNum.value = 1
    hasMore.value = false
    totalPages.value = 0
    error.value = ''
  }

  function buildResultFromUiMessage(msg: UiMessage): MessageSearchResult {
    const userInfo = stores.userInfo.getUserInfo(msg.from)
    return {
      msgId: msg.msgServerId || msg.msgLocalId || '',
      conversationId: msg.conversationId,
      senderId: msg.from,
      senderName: userInfo?.nickname || msg.from,
      avatar: userInfo?.avatarUrl,
      timestamp: msg.timestamp,
      summary: getMessageSummary(msg),
    }
  }

  function searchLocal(): MessageSearchResult[] {
    const cvsId = currentConversationId.value
    if (!cvsId)
      return []
    const k = keyword.value.trim()
    if (!k)
      return []
    const messages = stores.message.getMessages(cvsId)
    return messages
      .filter(msg => matchMessageContent(msg, k))
      .map(msg => buildResultFromUiMessage(msg))
  }

  async function searchServer(): Promise<MessageSearchResult[]> {
    const cvs = currentConversation.value
    if (!cvs?.id)
      return []

    const opts = toValue(options)
    const pageSize = opts.pageSize ?? 20
    const res: any = await client.value.chatManager.searchMessages({
      option: {
        keywordList: [keyword.value.trim()],
        conversationId: cvs.id,
        conversationType: cvs.type === 'groupChat' ? 'groupChat' : 'singleChat',
      },
      pageNum: pageNum.value,
      pageSize,
    })
    hasMore.value = !res?.isLast
    totalPages.value = res?.totalPages ?? -1
    const serverMsgs = res?.messages || []
    return serverMsgs.map((msg: any) => {
      const userInfo = stores.userInfo.getUserInfo(msg.from)
      return {
        msgId: msg.id || msg.msgId || msg.msgServerId || msg.msgLocalId || '',
        conversationId: msg.conversationId || cvs.id,
        senderId: msg.from,
        senderName: userInfo?.nickname || msg.from,
        avatar: userInfo?.avatarUrl,
        timestamp: msg.time || msg.timestamp,
        summary: msg.text || msg.msg || getMessageSummary(msg as unknown as UiMessage),
        highlighted: msg.highlight,
      } as MessageSearchResult
    })
  }

  async function search(nextPage = false): Promise<boolean> {
    const k = keyword.value.trim()
    if (!k) {
      reset()
      return true
    }

    if (!nextPage) {
      pageNum.value = 1
      results.value = []
    }

    loading.value = true
    error.value = ''

    try {
      const localResults = searchLocal()
      let serverResults: MessageSearchResult[] = []
      const opts = toValue(options)
      let serverFailed = false

      if (opts.enableServerSearch) {
        // 仅在服务端请求成功前递增页码；失败时在内层 catch 中回退
        if (nextPage) {
          pageNum.value += 1
        }
        try {
          serverResults = await searchServer()
        }
        catch (e: any) {
          serverFailed = true
          if (nextPage) {
            pageNum.value = Math.max(1, pageNum.value - 1)
          }
          // 服务未开通等错误不阻断本地搜索结果，仅记录日志
          console.warn('[useMessageSearch] server search failed:', e)
        }
      }

      // 合并并去重：本地优先，服务端补充
      const seen = new Set<string>()
      const merged: MessageSearchResult[] = []
      for (const item of [...localResults, ...serverResults]) {
        if (!item.msgId || seen.has(item.msgId))
          continue
        seen.add(item.msgId)
        merged.push(item)
      }
      merged.sort((a, b) => b.timestamp - a.timestamp)
      results.value = merged
      return !serverFailed
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      console.error('[useMessageSearch] search failed:', e)
      return false
    }
    finally {
      loading.value = false
    }
  }

  function loadMore() {
    const opts = toValue(options)
    if (!opts.enableServerSearch || !hasMore.value || loading.value)
      return
    search(true)
  }

  return {
    keyword,
    results,
    loading,
    error,
    hasMore,
    totalPages,
    search,
    loadMore,
    reset,
  }
}
