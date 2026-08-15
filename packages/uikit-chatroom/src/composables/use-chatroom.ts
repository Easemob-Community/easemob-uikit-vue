import { computed, watch } from 'vue'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { createNoticeMessage, resolveSdkErrorMessage, t, useCoreUIKit, useToast } from '@easemob/uikit-core'
import { CHATROOM_CONVERSATION_TYPE, CHATROOM_MESSAGE_DEFAULTS, CHATROOM_STATUS } from '../constants'
import { ChatroomAdapter } from '../sdk/adapter/chatroom-adapter'
import { dispatchSignalMessage, dispatchSignalStatus, subscribeSignalMessages, subscribeSignalStatus } from '../sdk/event/chatroom-events'
import { useChatroomMessageStore } from '../store/chatroom-message'
import { useChatroomStore } from '../store/chatroom'

export interface UseChatroomOptions {
  /** 进房拉取的历史消息条数（默认 50） */
  historyPageSize?: number
  /** 消息渲染列表封顶条数（默认 200；进房时按房间生效，见 join） */
  maxMessages?: number
}

/**
 * join ACK 超时（ms）：ACK 环节挂起（SDK 版本/网络差异）时强制复位，防 UI 永久卡「加入中」。
 * 房间详情（getChatroomInfo）失败有 catch 降级、历史拉取失败走 join 内降级（P2 review P0-1），
 * 二者不阻断已入房状态。
 */
const JOIN_ACK_TIMEOUT_MS = 15_000

/**
 * 给 promise 加超时：超时先执行 onTimeout（使 in-flight 响应失效），再 reject。
 * 用于 join ACK 兜底——SDK 各环节理论上都有超时，但不同版本/网络下行为可能
 * 差异（如 ACK 不返回），UIKit 侧必须保证状态机可恢复。
 */
function withJoinTimeout<T>(promise: Promise<T>, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout()
      reject(new Error('[UIKit:Chatroom] join 超时，请检查网络后重试'))
    }, JOIN_ACK_TIMEOUT_MS)
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
 * - **join 竞态**：连续 join 不同房间时，经 store 的全局递增 joinToken + roomId 双重校验，
 *   后到响应若已非目标房间则丢弃；
 * - **join 失败语义（P2 review 修正）**：`join()` resolve = 已入房；ACK 失败/超时整体回滚
 *   （复位 + toast + reject）；**入房后**的详情/历史失败不整体回滚（详情 catch 降级、
 *   历史 toast 提示可重试），避免「服务端已在房、UI 显示失败」的矛盾状态；
 * - **断线重连自动重进**：SDK 自动重连只恢复连接，聊天室需重新 join——
 *   经 core 连接状态（client store.connected）感知恢复后自动重进活动房间；
 *   被踢/解散（kicked/destroyed 终态）不自动重进；
 * - **dispose()**：headless（无组件作用域）场景下释放断线重连 watcher，
 *   组件内调用时 Vue 自动随卸载停止（二者并存安全）。
 */
export function useChatroom(options: UseChatroomOptions = {}) {
  const ctx = useCoreUIKit()
  const chatroomStore = useChatroomStore()
  const messageStore = useChatroomMessageStore()
  const toast = useToast()

  // ManagerHost 是 core provider 的稳定代理，运行时委托到当前 client（支持延迟/重新初始化）
  const adapter = new ChatroomAdapter(ctx.client.value)

  const status = computed(() => chatroomStore.status)
  const roomId = computed(() => chatroomStore.roomId)
  const roomInfo = computed(() => chatroomStore.info)
  const isJoined = computed(() => chatroomStore.isJoined)
  const announcement = computed(() => chatroomStore.announcement)
  const isAllMuted = computed(() => chatroomStore.isAllMuted)
  /** 被移出房间的 SDK 原因码（kicked 终态后有效，供容器 kicked 事件透传） */
  const kickReason = computed(() => chatroomStore.kickReason)

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
      // 进房提示「最近 N 条」（无离线消息概念，历史由进房拉取；重进时同样插入；
      // 条数取实际拉到的数量，房间不足 pageSize 条时不误导）
      const hint = createNoticeMessage(
        t('chatroom.notice.historyHint', '', { count: page.items.length }),
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
   * 重复进入同一房间（joining/joined 态）直接去重返回；切换房间时清理旧 UI 房数据。
   * 换房只移除旧 UI 房、保留信令房（§5.9 多房并行，P3 review 修正——此前 reset()
   * 清空整个注册表，信令房被静默清除且服务端成员资格残留）。
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

    // 切换房间时先清理旧 UI 房数据，再领令牌——顺序不能反：
    // nextJoinToken 经 ensureRoom 创建/复用房间对象并递增其 joinToken，
    // 若先领令牌再清数据（removeRoom 删除对象），setJoining 会重建一个
    // joinToken 归零的新对象，导致 isCurrentJoin 令牌失配、join 静默丢弃、
    // UI 永久卡「加入中」（两层建模重构引入，2026-08-15 修复）。
    const prev = chatroomStore.roomId
    if (prev && prev !== id) {
      // 旧 UI 房：清消息桶 + 移除注册表（信令房注册表条目保留，§5.9）
      const prevStatus = chatroomStore.roomStatus(prev)
      messageStore.clearBucket(prev)
      // 新房若有历史残留桶（如曾被用作信令房）一并清理
      messageStore.clearBucket(id)
      chatroomStore.removeRoom(prev)
      // 旧 UI 房服务端退出：显式 leave。UI 房 join 恒用 leaveOtherRooms: false
      // （见下方），不再依赖 SDK「加入新房自动离开旧房」默认——否则会连带踢掉
      // 并行加入的信令房（§5.9 硬约束）。JOINING 中的 prev leave 可能未落地，
      // 由 SDK 报错 catch 兜底（join 落地后此 leave 请求后到，服务端按序生效）。
      if (prevStatus !== CHATROOM_STATUS.LEAVING) {
        void adapter.leaveChatRoom(prev).catch(() => {
          // 旧房退出失败不阻断换房（服务端残留由重连清理）
        })
      }
    }
    const token = chatroomStore.nextJoinToken(id)
    chatroomStore.setJoining(id)

    try {
      // ACK 超时兜底：join ACK 挂起（SDK 侧行为差异、网络异常等）时强制复位，
      // 保证 UI 永不永久卡在「加入中」。
      await withJoinTimeout(
        // leaveOtherRooms: false——与信令房并行（§5.9）；旧 UI 房已显式 leave
        adapter.joinChatRoom(id, ext, false),
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
      chatroomStore.setJoined(id, info ?? { id, name: id })
      // 封顶条数按房间生效（P2 review P1-4：去掉模块级默认改写，避免跨实例污染）
      if (options.maxMessages !== undefined)
        messageStore.setMaxMessages(id, options.maxMessages)
      // 历史拉取失败不整体回滚（已入房）：仅提示，业务可经 loadHistory 重试
      await loadHistory(id, options.historyPageSize).catch((error: unknown) => {
        toast.error(resolveSdkErrorMessage(error, 'chatroom.error.historyFailed', t))
      })
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
    if (chatroomStore.status === CHATROOM_STATUS.JOINING) {
      // join 尚未完成：直接取消（服务端 join 可能尚未落地，不调 leaveChatRoom，
      // 避免误报「退出失败」；P2 review P2-13）
      messageStore.clearBucket(id)
      chatroomStore.removeRoom(id)
      return
    }
    chatroomStore.setLeaving(id)
    try {
      await adapter.leaveChatRoom(id)
    }
    catch (error) {
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.leaveFailed', t))
    }
    messageStore.clearBucket(id)
    chatroomStore.removeRoom(id)
  }

  /**
   * 加入信令房（§5.9 多房间订阅：静默订阅——不上屏、不落消息桶、不切活动视图）。
   * - join 显式 `leaveOtherRooms: false`（与 UI 房并行，不会互踢）；
   * - 默认不拉历史（`pullHistory: true` 时拉最近 N 条，按序经 signal-message 透传回调——
   *   P3 review 修正：此前经 loadHistory 拉取被「活动房间守卫」丢弃，历史永远到不了业务）；
   * - autoRejoin 控制断线重连是否自动重进；
   * - 失败/被踢/解散降级为状态回调（subscribeSignalStatus），不拖累 UI 房。
   */
  async function joinSignalRoom(
    roomId: string,
    options: { pullHistory?: boolean, autoRejoin?: boolean } = {},
  ): Promise<void> {
    if (!roomId)
      throw new Error('[UIKit:Chatroom] joinSignalRoom: roomId 不能为空')
    const joining = chatroomStore.roomStatus(roomId)
    if (joining === CHATROOM_STATUS.JOINING || joining === CHATROOM_STATUS.JOINED)
      return
    const token = chatroomStore.nextJoinToken(roomId)
    chatroomStore.setSignalJoining(roomId)
    const room = chatroomStore.ensureRoom(roomId, 'signal')
    room.autoRejoin = options.autoRejoin ?? true
    try {
      // 信令房与 UI 房并行：leaveOtherRooms 必须为 false（§5.9）
      await withJoinTimeout(
        adapter.joinChatRoom(roomId, undefined, false),
        () => {
          // 使 in-flight 响应失效（按房间令牌比较——活动房令牌与信令房令牌
          // 是两回事，P3 review 修正此前误用活动房 joinToken 导致失效永不生效）
          if (chatroomStore.roomStatus(roomId) === CHATROOM_STATUS.JOINING
            && chatroomStore.roomJoinToken(roomId) === token) {
            chatroomStore.nextJoinToken(roomId)
          }
        },
      )
      if (!chatroomStore.isCurrentJoin(token, roomId))
        return
      // 信令房不拉详情（静默订阅）；历史按配置可选：按序经 signal-message 透传
      chatroomStore.setJoined(roomId, { id: roomId, name: roomId })
      if (options.pullHistory) {
        await adapter.fetchHistory(roomId, ctx.stores.client.currentUser)
          .then((page) => {
            for (const msg of page.items)
              dispatchSignalMessage({ roomId, message: msg })
          })
          .catch(() => {
            // 信令房历史失败静默（业务可自行重试）
          })
      }
      dispatchSignalStatus({ roomId, status: 'joined' })
    }
    catch (error) {
      // 信令房失败降级：移除注册并派发 failed（不 toast——不打扰 UI 房交互）
      if (chatroomStore.isKnownRoom(roomId) && chatroomStore.roomKind(roomId) === 'signal')
        chatroomStore.removeRoom(roomId)
      dispatchSignalStatus({ roomId, status: 'failed', error })
      throw error
    }
  }

  /** 退出信令房（服务端失败静默清理） */
  async function leaveSignalRoom(roomId: string): Promise<void> {
    if (!chatroomStore.isKnownRoom(roomId))
      return
    chatroomStore.nextJoinToken(roomId)
    chatroomStore.setLeaving(roomId)
    try {
      await adapter.leaveChatRoom(roomId)
    }
    catch {
      // 信令房退出失败不打扰 UI 房
    }
    messageStore.clearBucket(roomId)
    chatroomStore.removeRoom(roomId)
  }

  // 断线重连自动重进（§5.9 全量重进）：断线时标记全部 joined 房间，
  // 重连后按注册表逐一重进（interact 恢复活动房；signal 恢复静默订阅，autoRejoin 控制）。
  // 多个组件同时调用 useChatroom 会各装一个 watcher，重连时 join 去重逻辑保证只生效一次；
  // 组件内由 Vue 随卸载自动停止，headless 场景经 dispose() 手动释放（P2 review P1-5）。
  const stopRejoinWatch = watch(() => ctx.stores.client.connected, (connected, prev) => {
    if (!connected) {
      for (const entry of chatroomStore.joinedRoomEntries)
        chatroomStore.setRoomPendingRejoin(entry.roomId, true)
      return
    }
    if (connected && prev === false) {
      const pending = chatroomStore.joinedRoomEntries.filter(entry => entry.pendingRejoin && entry.autoRejoin)
      for (const entry of pending) {
        messageStore.clearBucket(entry.roomId)
        chatroomStore.removeRoom(entry.roomId)
        if (entry.kind === 'signal') {
          void joinSignalRoom(entry.roomId, { autoRejoin: entry.autoRejoin }).catch(() => {
            // 信令房重进失败已降级为 status 回调
          })
        }
        else {
          void join(entry.roomId).catch(() => {
            // 重进失败已 toast（join 内部处理），保持 idle 态由业务方决定是否重试
          })
        }
      }
    }
  })

  return {
    status,
    roomId,
    roomInfo,
    isJoined,
    announcement,
    isAllMuted,
    kickReason,
    join,
    leave,
    loadHistory,
    joinSignalRoom,
    leaveSignalRoom,
    /** 订阅信令房消息透传（§5.9：payload { roomId, message }；返回取消订阅函数） */
    subscribeSignalMessages,
    /** 订阅信令房状态（joined/failed/kicked/destroyed；返回取消订阅函数） */
    subscribeSignalStatus,
    /** 释放内部 watcher（headless 无组件作用域时使用；组件内调用可忽略） */
    dispose: () => {
      stopRejoinWatch()
    },
  }
}
