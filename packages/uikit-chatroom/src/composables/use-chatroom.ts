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
      // 同时清理旧房消息桶（P2 review P1-3：此前只清注册表，旧桶与挂起定时器泄漏）
      const prev = chatroomStore.roomId
      if (prev)
        messageStore.clearBucket(prev)
      messageStore.clearBucket(id)
      chatroomStore.reset()
    }
    const token = chatroomStore.nextJoinToken(id)
    chatroomStore.setJoining(id)

    try {
      // ACK 超时兜底：join ACK 挂起（SDK 侧行为差异、网络异常等）时强制复位，
      // 保证 UI 永不永久卡在「加入中」。
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
  // 多个组件同时调用 useChatroom 会各装一个 watcher，重连时 join 去重逻辑保证只生效一次；
  // 组件内由 Vue 随卸载自动停止，headless 场景经 dispose() 手动释放（P2 review P1-5）。
  // （P3 多房间订阅扩展为按注册表全量重进，见设计文档 §5.9。）
  const stopRejoinWatch = watch(() => ctx.stores.client.connected, (connected, prev) => {
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
    kickReason,
    join,
    leave,
    loadHistory,
    /** 释放内部 watcher（headless 无组件作用域时使用；组件内调用可忽略） */
    dispose: () => {
      stopRejoinWatch()
    },
  }
}
