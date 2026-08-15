import { computed, watch } from 'vue'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { createNoticeMessage, resolveSdkErrorMessage, t, useCoreUIKit, useToast } from '@easemob/uikit-core'
import { CHATROOM_CONVERSATION_TYPE, CHATROOM_MESSAGE_DEFAULTS, CHATROOM_STATUS } from '../constants'
import { ChatroomAdapter } from '../sdk/adapter/chatroom-adapter'
import { useChatroomMessageStore } from '../store/chatroom-message'
import { useChatroomStore } from '../store/chatroom'

export interface UseChatroomOptions {
  /** 进房拉取的历史消息条数（默认 50） */
  historyPageSize?: number
  /** 消息渲染列表封顶条数（默认 200） */
  maxMessages?: number
}

/** join 链路整体超时（ms）：ACK / 详情 / 历史任一步骤挂起时强制复位，防 UI 永久卡「加入中」 */
const JOIN_TIMEOUT_MS = 15_000

/**
 * 给 promise 加超时：超时先执行 onTimeout（使 in-flight 响应失效），再 reject。
 * 用于 join 链路兜底——SDK 各环节理论上都有超时，但不同版本/网络下行为可能
 * 差异（如 ACK 不返回、REST 挂起），UIKit 侧必须保证状态机可恢复。
 */
function withJoinTimeout<T>(promise: Promise<T>, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout()
      reject(new Error('[UIKit:Chatroom] join 超时，请检查网络后重试'))
    }, JOIN_TIMEOUT_MS)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * 聊天室房间生命周期：join / leave / 状态查询（活动房间视图 = UI 房）。
 *
 * - **两层建模**（设计文档 §5.9）：store 内部为「房间注册表 Map + activeRoomId」，
 *   本层暴露的 join/leave/status 等即活动房间语义（单房为其特例，P2-2 验收口径不变）；
 * - **join 竞态**：连续 join 不同房间时，经 store 的递增 joinToken + roomId 双重校验，
 *   后到响应若已非目标房间则丢弃；
 * - **断线重连自动重进**：SDK 自动重连只恢复连接，聊天室需重新 join——
 *   经 core 连接状态（client store.connected）感知恢复后自动重进活动房间；
 *   被踢/解散（kicked/destroyed 终态）不自动重进。
 */
export function useChatroom(options: UseChatroomOptions = {}) {
  const ctx = useCoreUIKit()
  const chatroomStore = useChatroomStore()
  const messageStore = useChatroomMessageStore()
  const toast = useToast()

  if (options.maxMessages !== undefined)
    messageStore.setDefaultMaxMessages(options.maxMessages)

  // ManagerHost 是 core provider 的稳定代理，运行时委托到当前 client（支持延迟/重新初始化）
  const adapter = new ChatroomAdapter(ctx.client.value)

  const status = computed(() => chatroomStore.status)
  const roomId = computed(() => chatroomStore.roomId)
  const roomInfo = computed(() => chatroomStore.info)
  const isJoined = computed(() => chatroomStore.isJoined)
  const announcement = computed(() => chatroomStore.announcement)
  const isAllMuted = computed(() => chatroomStore.isAllMuted)

  /** 进房后拉历史（无离线消息概念，进房必拉最近 N 条；拉完插入「最近 N 条」系统提示） */
  async function loadHistory(id: string, pageSize: number = CHATROOM_MESSAGE_DEFAULTS.HISTORY_PAGE_SIZE) {
    if (!id || messageStore.loadingHistoryFor(id))
      return
    messageStore.setLoadingHistory(id, true)
    try {
      const page = await adapter.fetchHistory(
        id,
        ctx.stores.client.currentUser,
        messageStore.historyLoadedFor(id) ? messageStore.historyCursorFor(id) : undefined,
        pageSize,
      )
      // 拉取期间已切房/退房则丢弃
      if (chatroomStore.roomId !== id)
        return
      messageStore.prependHistory(id, page.items, page.cursor, page.hasMore ?? false)
      // 进房提示「最近 N 条」（无离线消息概念，历史由进房拉取；重进时同样插入）
      const hint = createNoticeMessage(
        t('chatroom.notice.historyHint', '', { count: pageSize }),
        id,
        // core notice 工具的 conversationType 形参是单群聊场景联合，聊天室 wire 值
        // 'chatRoom' 不在其内；与 chatroom-events.ts 同一处断言，不扩散
        CHATROOM_CONVERSATION_TYPE.CHATROOM as unknown as ConversationTypeValue,
        ctx.stores.client.currentUser,
      )
      messageStore.addMessage(id, hint)
    }
    finally {
      messageStore.setLoadingHistory(id, false)
    }
  }

  /** 房间属性全量拉取兜底（四层同步第四层：进房时/事件丢失后） */
  async function refreshAttributes(id: string) {
    try {
      const attrs = await adapter.getAttributes(id)
      if (chatroomStore.roomId === id && chatroomStore.isJoined)
        chatroomStore.setAttributes(attrs)
    }
    catch {
      // 属性拉取失败不阻断进房（部分套餐未开通属性能力），按需经 useChatroomAttributes 重试
    }
  }

  /**
   * 加入聊天室（加入后设为活动房间 = UI 房）。
   * 重复进入同一房间（joining/joined 态）直接去重返回；切换房间时清理旧房间数据。
   */
  async function join(id: string, ext?: string): Promise<void> {
    if (!id)
      throw new Error('[UIKit:Chatroom] join: roomId 不能为空')
    if (
      chatroomStore.roomId === id
      && (chatroomStore.status === CHATROOM_STATUS.JOINING || chatroomStore.status === CHATROOM_STATUS.JOINED)
    ) {
      return
    }

    // 切换房间时先清理旧数据，再领令牌——顺序不能反：
    // nextJoinToken 经 ensureRoom 创建/复用房间对象并递增其 joinToken，
    // 若先领令牌再 reset（清空注册表），房间对象被销毁，setJoining 会重建
    // 一个 joinToken 归零的新对象，导致 isCurrentJoin 令牌失配、join 静默丢弃、
    // UI 永久卡「加入中」（两层建模重构引入，2026-08-15 修复）。
    if (chatroomStore.roomId !== id) {
      messageStore.clearBucket(id)
      chatroomStore.reset()
    }
    const token = chatroomStore.nextJoinToken(id)
    chatroomStore.setJoining(id)

    try {
      // 超时兜底：join ACK / 房间详情 / 历史拉取任一环节挂起（SDK 侧行为差异、
      // 网络异常等）时强制复位，保证 UI 永不永久卡在「加入中」。
      await withJoinTimeout(
        adapter.joinChatRoom(id, ext),
        () => {
          // 使 in-flight 响应失效（超时后到达的 ACK 不再触发 setJoined）
          if (chatroomStore.roomId === id && chatroomStore.joinToken === token)
            chatroomStore.nextJoinToken(id)
        },
      )
      // join 竞态：响应返回时已非目标房间（期间发起了新 join / 已 leave）则丢弃
      if (!chatroomStore.isCurrentJoin(token, id))
        return
      // 进房后拉详情（名称/公告/权限/成员数）；详情失败不阻断进房
      const info = await adapter.getChatroomInfo(id).catch(() => null)
      if (!chatroomStore.isCurrentJoin(token, id))
        return
      chatroomStore.setJoined(info ?? { id, name: id })
      await loadHistory(id, options.historyPageSize)
      void refreshAttributes(id)
    }
    catch (error) {
      // 失败/超时恢复：仅当 UI 仍停留在该房间的加入中态时复位
      // （竞态丢弃场景由接管方负责状态，不在此覆盖）
      if (chatroomStore.roomId === id && chatroomStore.status === CHATROOM_STATUS.JOINING) {
        messageStore.clearBucket(id)
        chatroomStore.removeRoom(id)
      }
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.joinFailed', t))
      throw error
    }
  }

  /** 退出当前活动房间（无房间时静默返回；服务端失败也照常本地清理） */
  async function leave(): Promise<void> {
    const id = chatroomStore.roomId
    if (!id)
      return
    // 使进行中的 join 响应失效
    chatroomStore.nextJoinToken(id)
    chatroomStore.setLeaving()
    try {
      await adapter.leaveChatRoom(id)
    }
    catch (error) {
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.leaveFailed', t))
    }
    messageStore.clearBucket(id)
    chatroomStore.removeRoom(id)
  }

  // 断线重连自动重进：connected false→true 且断线前处于 joined 时重新 join 活动房间。
  // 多个组件同时调用 useChatroom 会各装一个 watcher，重连时 join 去重逻辑保证只生效一次。
  // （P3 多房间订阅扩展为按注册表全量重进，见设计文档 §5.9。）
  watch(() => ctx.stores.client.connected, (connected, prev) => {
    if (!connected && chatroomStore.isJoined) {
      chatroomStore.setPendingRejoin(true)
      return
    }
    if (connected && prev === false && chatroomStore.pendingRejoin && chatroomStore.roomId) {
      const target = chatroomStore.roomId
      messageStore.clearBucket(target)
      chatroomStore.removeRoom(target)
      void join(target).catch(() => {
        // 重进失败已 toast（join 内部处理），保持 idle 态由业务方决定是否重试
      })
    }
  })

  return {
    status,
    roomId,
    roomInfo,
    isJoined,
    announcement,
    isAllMuted,
    join,
    leave,
    loadHistory,
  }
}
