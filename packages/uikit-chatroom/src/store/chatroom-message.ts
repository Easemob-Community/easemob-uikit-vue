import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { UiMessage } from '@easemob/uikit-core'
import { CHATROOM_MESSAGE_DEFAULTS } from '../constants'

/**
 * 单房间消息桶（注册表条目；多房间并存时消息流互不干扰）。
 *
 * 广播消息流语义：无未读 / 无会话 / 无回执。
 * 接收侧渲染节流（与 SDK 发送侧限流是两个层面，见设计文档 5.3/5.7）：
 * - 实时消息先入**接收缓冲队列**，按 FLUSH_INTERVAL（150ms）窗口批量合并进渲染列表，
 *   渲染频率与消息到达速度解耦，防大直播间刷屏时 DOM 更新成为瓶颈；
 * - 渲染列表**封顶**（默认保留最近 200 条，可配），超出丢弃最旧消息；
 * - 历史与实时流重叠时按 msgServerId 去重。
 */
export interface ChatroomMessageBucket {
  /** 渲染列表（已封顶；增量经缓冲队列批量合并） */
  messages: UiMessage[]
  /** 渲染列表封顶条数（setMaxMessages 可配） */
  maxMessages: number
  /** 进房历史是否已拉取 */
  historyLoaded: boolean
  loadingHistory: boolean
  /** 历史分页游标（向上翻更早历史时使用） */
  historyCursor?: string
  historyHasMore: boolean
  /** 接收缓冲队列（桶内私有，不进响应式系统） */
  buffer: UiMessage[]
  flushTimer: ReturnType<typeof setTimeout> | null
  /** 渲染列表 msgServerId 索引（去重）；本地通知消息 serverId 为空不入索引 */
  serverIdIndex: Set<string>
}

function createBucket(): ChatroomMessageBucket {
  return {
    messages: [],
    maxMessages: CHATROOM_MESSAGE_DEFAULTS.MAX_MESSAGES,
    historyLoaded: false,
    loadingHistory: false,
    historyCursor: undefined,
    historyHasMore: false,
    buffer: [],
    flushTimer: null,
    serverIdIndex: new Set(),
  }
}

/**
 * 聊天室广播消息流（**按 roomId 分桶**，见设计文档 §5.9——UI 房走完整管线，
 * P3 信令房只订阅增量不进桶；单房为其特例）。
 *
 * store 本身不感知「活动房间」：读操作一律显式传 roomId，
 * 由 composable 层基于 chatroom store 的 activeRoomId 组装视图（防双 store 状态漂移）。
 */
export const useChatroomMessageStore = defineStore('chatroomMessage', () => {
  /** 房间消息桶注册表（reactive Map：set/delete 原生响应） */
  const buckets = reactive(new Map<string, ChatroomMessageBucket>())
  /**
   * 桶级增量订阅者（headless 契约 §5.10：flush 批量通知，增量有序；订阅与渲染桶并行，
   *  封顶 trim 只影响渲染列表，订阅者不丢消息）
   */
  const roomSubscribers = new Map<string, Set<(messages: UiMessage[]) => void>>()

  function ensureBucket(roomId: string): ChatroomMessageBucket {
    let bucket = buckets.get(roomId)
    if (!bucket) {
      bucket = createBucket()
      buckets.set(roomId, bucket)
    }
    return bucket
  }

  // ===== 增量订阅（headless，§5.10） =====

  /**
   * 订阅指定房间的消息增量：每次缓冲窗口 flush 时批量回调（增量有序），
   * 与渲染桶并行（封顶/去重只影响渲染列表，订阅者拿到完整增量，可自行决定丢帧）。
   * 返回取消订阅函数。
   */
  function subscribe(roomId: string, listener: (messages: UiMessage[]) => void): () => void {
    let set = roomSubscribers.get(roomId)
    if (!set) {
      set = new Set()
      roomSubscribers.set(roomId, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0)
        roomSubscribers.delete(roomId)
    }
  }

  /** flush 后批量通知订阅者（无订阅者零开销） */
  function notifySubscribers(roomId: string, messages: UiMessage[]) {
    const set = roomSubscribers.get(roomId)
    if (!set || set.size === 0)
      return
    for (const listener of set)
      listener(messages)
  }

  // ===== 读（按 roomId） =====

  /** 指定房间渲染列表（未登记房间返回空数组，composable 层经活动房间 ID 读取） */
  function messagesFor(roomId: string): UiMessage[] {
    return buckets.get(roomId)?.messages ?? []
  }

  function historyLoadedFor(roomId: string): boolean {
    return buckets.get(roomId)?.historyLoaded ?? false
  }

  function loadingHistoryFor(roomId: string): boolean {
    return buckets.get(roomId)?.loadingHistory ?? false
  }

  function historyHasMoreFor(roomId: string): boolean {
    return buckets.get(roomId)?.historyHasMore ?? false
  }

  function historyCursorFor(roomId: string): string | undefined {
    return buckets.get(roomId)?.historyCursor
  }

  // ===== 写（按 roomId） =====

  /** 超出封顶时丢弃最旧消息并同步去重索引 */
  function trimToCap(bucket: ChatroomMessageBucket) {
    const overflow = bucket.messages.length - bucket.maxMessages
    if (overflow <= 0)
      return
    const dropped = bucket.messages.slice(0, overflow)
    bucket.messages = bucket.messages.slice(overflow)
    for (const msg of dropped) {
      if (msg.msgServerId)
        bucket.serverIdIndex.delete(msg.msgServerId)
    }
  }

  /**
   * 直接追加一条消息（本地通知 / 自己发送的乐观上屏），跳过缓冲队列。
   */
  function addMessage(roomId: string, message: UiMessage) {
    const bucket = ensureBucket(roomId)
    if (message.msgServerId) {
      if (bucket.serverIdIndex.has(message.msgServerId))
        return
      bucket.serverIdIndex.add(message.msgServerId)
    }
    bucket.messages = [...bucket.messages, message]
    trimToCap(bucket)
  }

  /** 实时消息入接收缓冲队列，按窗口批量合并（事件层调用） */
  function enqueueMessages(roomId: string, incoming: UiMessage[]) {
    if (incoming.length === 0)
      return
    const bucket = ensureBucket(roomId)
    bucket.buffer.push(...incoming)
    if (bucket.flushTimer !== null)
      return
    bucket.flushTimer = setTimeout(() => {
      bucket.flushTimer = null
      flushBuffer(roomId, bucket)
    }, CHATROOM_MESSAGE_DEFAULTS.FLUSH_INTERVAL)
  }

  /** 立即合并缓冲队列（批量 append + 去重 + 封顶） */
  function flushBuffer(roomId: string, bucket: ChatroomMessageBucket = ensureBucket(roomId)) {
    if (bucket.flushTimer !== null) {
      clearTimeout(bucket.flushTimer)
      bucket.flushTimer = null
    }
    if (bucket.buffer.length === 0)
      return
    const fresh = bucket.buffer.filter((msg) => {
      if (!msg.msgServerId)
        return true
      if (bucket.serverIdIndex.has(msg.msgServerId))
        return false
      bucket.serverIdIndex.add(msg.msgServerId)
      return true
    })
    bucket.buffer = []
    if (fresh.length === 0)
      return
    bucket.messages = [...bucket.messages, ...fresh]
    trimToCap(bucket)
    // 增量订阅（headless）：渲染桶 trim 不影响订阅者（§5.10 无消费者不丢消息）
    notifySubscribers(roomId, fresh)
  }

  /** 前插历史消息（进房拉取 / 向上翻页），按 msgServerId 去重 */
  function prependHistory(roomId: string, items: UiMessage[], cursor: string | undefined, hasMore: boolean) {
    const bucket = ensureBucket(roomId)
    const fresh = items.filter((msg) => {
      if (!msg.msgServerId)
        return true
      if (bucket.serverIdIndex.has(msg.msgServerId))
        return false
      bucket.serverIdIndex.add(msg.msgServerId)
      return true
    })
    if (fresh.length > 0) {
      bucket.messages = [...fresh, ...bucket.messages]
      trimToCap(bucket)
    }
    bucket.historyCursor = cursor
    bucket.historyHasMore = hasMore
    bucket.historyLoaded = true
  }

  /** 按本地 ID 更新消息（发送态推进 / 失败标记） */
  function updateMessage(roomId: string, localId: string, patch: Partial<UiMessage>) {
    const bucket = buckets.get(roomId)
    if (!bucket)
      return
    const index = bucket.messages.findIndex(m => m.msgLocalId === localId)
    if (index === -1)
      return
    const next = [...bucket.messages]
    const merged = { ...next[index]!, ...patch } as UiMessage
    // 发送成功后消息获得 serverId，补进去重索引
    if (merged.msgServerId && !bucket.serverIdIndex.has(merged.msgServerId))
      bucket.serverIdIndex.add(merged.msgServerId)
    next[index] = merged
    bucket.messages = next
  }

  /** 标记消息已撤回（广播场景撤回仅从简：打标，UI 层提示即可） */
  function markRecalled(roomId: string, serverId: string) {
    const bucket = buckets.get(roomId)
    if (!bucket)
      return
    const index = bucket.messages.findIndex(m => m.msgServerId === serverId)
    if (index === -1)
      return
    const next = [...bucket.messages]
    next[index] = { ...next[index]!, recalled: true } as UiMessage
    bucket.messages = next
  }

  function setLoadingHistory(roomId: string, value: boolean) {
    const bucket = ensureBucket(roomId)
    bucket.loadingHistory = value
  }

  function setMaxMessages(roomId: string, value: number) {
    const bucket = ensureBucket(roomId)
    bucket.maxMessages = Math.max(1, value)
    trimToCap(bucket)
  }

  /** 清空指定房间消息桶（退房 / 换房 / 断线重进前） */
  function clearBucket(roomId: string) {
    const bucket = buckets.get(roomId)
    if (!bucket)
      return
    if (bucket.flushTimer !== null) {
      clearTimeout(bucket.flushTimer)
      bucket.flushTimer = null
    }
    buckets.delete(roomId)
    roomSubscribers.delete(roomId)
  }

  /** 清空全部消息桶（logout） */
  function clearAll() {
    for (const bucket of buckets.values()) {
      if (bucket.flushTimer !== null) {
        clearTimeout(bucket.flushTimer)
        bucket.flushTimer = null
      }
    }
    buckets.clear()
  }

  return {
    messagesFor,
    historyLoadedFor,
    loadingHistoryFor,
    historyHasMoreFor,
    historyCursorFor,
    subscribe,
    addMessage,
    enqueueMessages,
    flushBuffer,
    prependHistory,
    updateMessage,
    markRecalled,
    setLoadingHistory,
    setMaxMessages,
    clearBucket,
    clearAll,
  }
})
