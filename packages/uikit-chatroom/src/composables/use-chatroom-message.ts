import { computed, watch } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import type { UiMessage } from '@easemob/uikit-core'
import { MESSAGE_STATUS, extractSdkErrorReason, resolveSdkErrorMessage, t, useCoreUIKit, useToast } from '@easemob/uikit-core'
import { CHATROOM_MESSAGE_DEFAULTS, CHATROOM_STATUS } from '../constants'
import { ChatroomAdapter, toChatroomUiMessage } from '../sdk/adapter/chatroom-adapter'
import { useChatroomMessageStore } from '../store/chatroom-message'
import { useChatroomStore } from '../store/chatroom'

export interface UseChatroomMessageOptions {
  // 封顶条数配置已收敛到 useChatroom({ maxMessages })（进房时按房间生效，P2 review P1-4）：
  // 本 composable 只读渲染列表，不再持有全局可变默认值（避免多实例互相污染）。
}

/**
 * 聊天室消息收发渲染管线（活动房间视图 = UI 房）：
 * - 发送走 `ChatManager`（conversationType='chatRoom'），乐观上屏（sending → sent/failed）；
 *   发送侧频率限制由 SDK 控制，触发时限流错误 toast（core error.trafficLimit 文案
 *   「发送频率过快，请稍后重试」）并把消息标记 failed（不静默失败）；
 * - 历史拉取经 `getHistoryMessages`（进房由 useChatroom 触发，此处暴露向上翻页）；
 * - 接收侧封顶/批量合并策略在 chatroom-message store 内按 roomId 分桶接线
 *   （本层基于活动房间 ID 组装渲染视图；P3 信令房经显式 roomId 发送/订阅）。
 */
export function useChatroomMessage(_options: UseChatroomMessageOptions = {}) {
  const ctx = useCoreUIKit()
  const chatroomStore = useChatroomStore()
  const messageStore = useChatroomMessageStore()
  const toast = useToast()

  const adapter = new ChatroomAdapter(ctx.client.value)

  /** 活动房间 ID（未进房时为空串，各视图回落为空） */
  const activeRoomId = computed(() => chatroomStore.roomId)
  const messages = computed(() => messageStore.messagesFor(activeRoomId.value))
  const historyLoaded = computed(() => messageStore.historyLoadedFor(activeRoomId.value))
  const loadingHistory = computed(() => messageStore.loadingHistoryFor(activeRoomId.value))
  const historyHasMore = computed(() => messageStore.historyHasMoreFor(activeRoomId.value))

  /** 通用发送流程：乐观上屏 → SDK 发送 → 状态推进（roomId 缺省为活动房间） */
  async function send(sdkMsg: SdkMessage, roomId: string): Promise<SdkMessage> {
    const currentUser = ctx.stores.client.currentUser
    const local = toChatroomUiMessage(sdkMsg, currentUser)
    local.status = MESSAGE_STATUS.SENDING
    messageStore.addMessage(roomId, local)
    try {
      const sent = await adapter.sendMessage(sdkMsg)
      messageStore.updateMessage(roomId, local.msgLocalId, toChatroomUiMessage(sent, currentUser))
      return sent
    }
    catch (error) {
      messageStore.updateMessage(roomId, local.msgLocalId, {
        status: MESSAGE_STATUS.FAILED,
        failReason: extractSdkErrorReason(error),
      })
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.sendFailed', t))
      throw error
    }
  }

  /** 校验目标房间可发送：缺省用活动房间（须 joined）；显式 roomId（信令房）须已加入 */
  function requireRoomId(target?: string): string {
    if (target) {
      if (!chatroomStore.isKnownRoom(target) || chatroomStore.roomStatus(target) !== CHATROOM_STATUS.JOINED)
        throw new Error(`[UIKit:Chatroom] 目标房间 ${target} 未加入，无法发送消息`)
      return target
    }
    const id = chatroomStore.roomId
    if (!id || !chatroomStore.isJoined)
      throw new Error('[UIKit:Chatroom] 未加入聊天室，无法发送消息')
    return id
  }

  /**
   * 发送文本消息。roomId 缺省为活动房间（UI 房）；
   * 显式指定 roomId 可发往信令房（P3 多房间订阅，见设计文档 §5.9），发送节流按房间独立统计。
   */
  function sendText(content: string, options: { ext?: Record<string, unknown>, roomId?: string } = {}) {
    const target = requireRoomId(options.roomId)
    return send(adapter.createTextMessage(target, content, options.ext), target)
  }

  /** 发送图片消息（data 为 File 或已上传的 URL） */
  function sendImage(data: File | string, options: { ext?: Record<string, unknown>, roomId?: string } = {}) {
    const target = requireRoomId(options.roomId)
    return send(adapter.createImageMessage(target, data, options.ext), target)
  }

  /** 发送自定义消息（礼物 / 业务卡片等走 custom） */
  function sendCustom(
    event: string,
    params?: Record<string, string>,
    options: { ext?: Record<string, unknown>, roomId?: string } = {},
  ) {
    const target = requireRoomId(options.roomId)
    return send(adapter.createCustomMessage(target, event, params, options.ext), target)
  }

  /** 向上翻页拉取更早历史（进房首拉由 useChatroom.join 触发） */
  async function loadMoreHistory(pageSize: number = CHATROOM_MESSAGE_DEFAULTS.HISTORY_PAGE_SIZE) {
    const id = chatroomStore.roomId
    if (!id || messageStore.loadingHistoryFor(id) || !messageStore.historyHasMoreFor(id))
      return
    messageStore.setLoadingHistory(id, true)
    try {
      const page = await adapter.fetchHistory(id, ctx.stores.client.currentUser, messageStore.historyCursorFor(id), pageSize)
      if (chatroomStore.roomId !== id)
        return
      messageStore.prependHistory(id, page.items, page.cursor, page.hasMore ?? false)
    }
    finally {
      messageStore.setLoadingHistory(id, false)
    }
  }

  /**
   * 订阅活动房间消息增量（headless 契约 §5.10）：每次缓冲窗口 flush 批量回调，
   * 增量有序；与渲染桶并行（封顶只影响渲染列表，订阅者不丢消息，丢帧由业务决定）。
   * 订阅**跟随活动房间**：进房前调用（绑定空房，加入后自动生效）、换房/断线重进后
   * 自动重绑定（P3 review 修正——此前一次性绑定调用时刻的房间，进房前订阅永久失效）。
   * 返回取消订阅函数。
   */
  function subscribe(listener: (messages: UiMessage[]) => void): () => void {
    let unsub: (() => void) | null = null
    // 活动房间变化（进房 / 换房 / 重进）时重绑定；'' 表示未进房，不持有订阅
    const stop = watch(activeRoomId, (id) => {
      unsub?.()
      unsub = id ? messageStore.subscribe(id, listener) : null
    }, { immediate: true })
    return () => {
      unsub?.()
      unsub = null
      stop()
    }
  }

  return {
    messages,
    historyLoaded,
    loadingHistory,
    historyHasMore,
    sendText,
    sendImage,
    sendCustom,
    loadMoreHistory,
    subscribe,
  }
}
