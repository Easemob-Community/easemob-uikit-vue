import { type MaybeRef, computed, ref, toValue } from 'vue'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '@easemob/uikit-core'
import type { UiMessage } from '@easemob/uikit-core'
import { useUIKit } from './use-uikit'
import { createLogger } from '@easemob/uikit-core'

const logger = createLogger('UIKit:UseMessageSearch')

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

/** 搜索范围：当前会话 / 全部会话（全部会话依赖服务端搜索） */
export type MessageSearchScope = 'conversation' | 'global'

/** 可筛选的消息类型（'' 表示全部）；取 MESSAGE_TYPE 子集，服务端调用时再映射 wire 类型 */
export type MessageSearchTypeFilter =
  | ''
  | typeof MESSAGE_TYPE.TEXT
  | typeof MESSAGE_TYPE.IMAGE
  | typeof MESSAGE_TYPE.VIDEO
  | typeof MESSAGE_TYPE.FILE
  | typeof MESSAGE_TYPE.LOCATION

/** UI 消息类型 → websdk2 searchMessages 的 wire msgTypes 字面量（SDK 协议字段，保留字面量） */
const SEARCH_WIRE_TYPE_MAP: Record<Exclude<MessageSearchTypeFilter, ''>, 'txt' | 'img' | 'video' | 'file' | 'loc'> = {
  [MESSAGE_TYPE.TEXT]: 'txt',
  [MESSAGE_TYPE.IMAGE]: 'img',
  [MESSAGE_TYPE.VIDEO]: 'video',
  [MESSAGE_TYPE.FILE]: 'file',
  [MESSAGE_TYPE.LOCATION]: 'loc',
}

/** 判断消息内容是否命中关键词 */
function matchMessageContent(msg: UiMessage, keyword: string): boolean {
  const k = keyword.toLowerCase()
  if (msg.type === MESSAGE_TYPE.TEXT) {
    const content = (msg.body as { content?: string }).content || ''
    return content.toLowerCase().includes(k)
  }
  if (msg.type === MESSAGE_TYPE.FILE) {
    const filename = (msg.body as { filename?: string }).filename || ''
    return filename.toLowerCase().includes(k)
  }
  if (msg.type === MESSAGE_TYPE.COMBINE) {
    const title = (msg.body as { title?: string }).title || ''
    return title.toLowerCase().includes(k)
  }
  if (msg.type === MESSAGE_TYPE.LOCATION) {
    const address = (msg.body as { address?: string }).address || ''
    return address.toLowerCase().includes(k)
  }
  // 自定义消息支持搜索 ext 中的文本字段
  if (msg.type === MESSAGE_TYPE.CUSTOM) {
    const event = (msg.body as { event?: string }).event || ''
    const params = JSON.stringify((msg.body as { params?: Record<string, string> }).params || {})
    return event.toLowerCase().includes(k) || params.toLowerCase().includes(k)
  }
  return false
}

/** 从 UiMessage 提取摘要 */
function getMessageSummary(msg: UiMessage): string {
  if (msg.type === MESSAGE_TYPE.TEXT)
    return (msg.body as { content?: string }).content || ''
  if (msg.type === MESSAGE_TYPE.IMAGE)
    return '[图片]'
  if (msg.type === MESSAGE_TYPE.VOICE)
    return '[语音]'
  if (msg.type === MESSAGE_TYPE.VIDEO)
    return '[视频]'
  if (msg.type === MESSAGE_TYPE.FILE)
    return `[文件] ${(msg.body as { filename?: string }).filename || ''}`
  if (msg.type === MESSAGE_TYPE.LOCATION)
    return `[位置] ${(msg.body as { address?: string }).address || ''}`
  if (msg.type === MESSAGE_TYPE.COMBINE)
    return (msg.body as { title?: string }).title || '[聊天记录]'
  if (msg.type === MESSAGE_TYPE.CUSTOM)
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
  /** 搜索范围（全部会话仅在 enableServerSearch=true 时可用） */
  const scope = ref<MessageSearchScope>('conversation')
  /** 消息类型筛选（'' = 全部） */
  const activeType = ref<MessageSearchTypeFilter>('')
  /** 服务端搜索不可用（服务未开通，505），UI 据此显示降级提示 */
  const serverUnavailable = ref(false)

  const currentConversation = computed(() => stores.conversation.currentConversation)
  const currentConversationId = computed(() => stores.conversation.currentConversationId)

  function reset() {
    keyword.value = ''
    results.value = []
    pageNum.value = 1
    hasMore.value = false
    totalPages.value = 0
    error.value = ''
    scope.value = 'conversation'
    activeType.value = ''
    serverUnavailable.value = false
  }

  function buildResultFromUiMessage(msg: UiMessage): MessageSearchResult {
    const userInfo = stores.userInfo.getUserInfo(msg.from)
    const contact = stores.contact.getContact(msg.from)
    return {
      msgId: msg.msgServerId || msg.msgLocalId || '',
      conversationId: msg.conversationId,
      senderId: msg.from,
      senderName: contact?.remark || userInfo?.nickname || msg.from,
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
      .filter(msg => (!activeType.value || msg.type === activeType.value) && matchMessageContent(msg, k))
      .map(msg => buildResultFromUiMessage(msg))
  }

  /** 判断是否为「搜索服务未开通」错误（websdk2 映射 HTTP 403 / 别名 4030204 为 505） */
  function isServiceNotEnabled(e: any): boolean {
    return e?.code === 505 || e?.name === 'service_not_enabled'
  }

  async function searchServer(): Promise<MessageSearchResult[]> {
    const opts = toValue(options)
    const pageSize = opts.pageSize ?? 20
    const isGlobal = scope.value === 'global'
    const cvs = currentConversation.value
    // 会话内搜索必须有当前会话；全局搜索不传 conversationId/conversationType
    if (!isGlobal && !cvs?.id)
      return []

    const option = {
      keywordList: [keyword.value.trim()],
      // 会话内搜索传会话 ID 与类型（必同传）；全局搜索两者都不传
      ...(!isGlobal && cvs?.id
        ? {
            conversationId: cvs.id,
            conversationType: (cvs.type === CONVERSATION_TYPE.GROUPCHAT
              ? CONVERSATION_TYPE.GROUPCHAT
              : CONVERSATION_TYPE.SINGLECHAT) as 'singleChat' | 'groupChat',
          }
        : {}),
      ...(activeType.value ? { msgTypes: [SEARCH_WIRE_TYPE_MAP[activeType.value]] } : {}),
    }

    const res: any = await client.value.chatManager.searchMessages({
      option,
      pageNum: pageNum.value,
      pageSize,
    })
    hasMore.value = !res?.isLast
    totalPages.value = res?.totalPages ?? -1
    const serverMsgs = res?.messages || []
    return serverMsgs.map((msg: any) => {
      const userInfo = stores.userInfo.getUserInfo(msg.from)
      const contact = stores.contact.getContact(msg.from)
      return {
        msgId: msg.id || msg.msgId || msg.msgServerId || msg.msgLocalId || '',
        conversationId: msg.conversationId || cvs?.id || '',
        senderId: msg.from,
        senderName: contact?.remark || userInfo?.nickname || msg.from,
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
      // 全局范围只走服务端（本地仅加载了当前会话消息，混入会误导）
      const isGlobal = scope.value === 'global'
      const localResults = isGlobal ? [] : searchLocal()
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
          serverUnavailable.value = false
        }
        catch (e: any) {
          serverFailed = true
          if (nextPage) {
            pageNum.value = Math.max(1, pageNum.value - 1)
          }
          // 服务未开通（505）：置降级标记供 UI 提示；其余错误仅记录日志，均不阻断本地结果
          if (isServiceNotEnabled(e)) {
            serverUnavailable.value = true
          }
          logger.warn('[useMessageSearch] server search failed:', e)
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
      logger.error('[useMessageSearch] search failed:', e)
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
    scope,
    activeType,
    serverUnavailable,
    search,
    loadMore,
    reset,
  }
}
