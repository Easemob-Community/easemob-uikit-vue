import type { ChatroomSceneConfig } from '../../composables/use-chatroom-scene'
import type { SignalMessagePayload, SignalStatusPayload } from '../../sdk/event/chatroom-events'

/** 信令房订阅配置（§5.9：静默订阅——不上屏不落桶，消息透传 signal-message） */
export interface ChatroomSignalRoomConfig {
  /** 信令房间 ID */
  roomId: string
  /**
   * 是否拉取历史（默认 false：语义是订阅实时指令，历史回放由业务自调 API）。
   * true 时进房拉最近 N 条并按序经 signal-message 透传（P3 review 起真实生效）。
   */
  pullHistory?: boolean
  /** 断线重连是否自动重进（默认 true） */
  autoRejoin?: boolean
  /** 加入时透传的扩展信息（业务来源标记等；房间内其他成员经 member-joined 事件收到，P4 review 需求 2） */
  ext?: string
}

/** EmChatroomContainer 对外 props（类型独立文件，供包入口 re-export） */
export interface ChatroomContainerProps {
  /** 目标聊天室 ID（变化时自动退出旧房并入新房）；auto-join 关闭时仅渲染外壳 */
  roomId?: string
  /** 场景预设：内置场景名（live/voice/class）或部分配置（见 useChatroomScene） */
  scene?: string | Partial<ChatroomSceneConfig>
  /** 是否自动加入（有 roomId 时），默认 true */
  autoJoin?: boolean
  /** 进房拉取的历史消息条数（默认 50，展示「最近 N 条」提示） */
  historyPageSize?: number
  /** 消息渲染列表封顶条数（默认 200，防大直播间刷屏） */
  maxMessages?: number
  /** 加入 UI 房时透传的扩展信息（业务来源标记等；房间内其他成员经 member-joined 事件收到，P4 review 需求 2） */
  joinExt?: string
  /**
   * 信令房订阅列表（§5.9 多房间：1 个 UI 房 + N 个信令房；数组存在即多房，
   * 不引入 isMultiChatroom 布尔）。信令房消息经 signal-message 透传，业务自行呈现。
   */
  signalRooms?: ChatroomSignalRoomConfig[]
}

/** 成员加入事件 payload（含 join ext，P4 review 需求 2） */
export interface ChatroomMemberJoinedPayload {
  /** 房间 ID */
  roomId: string
  /** 加入的成员（解码后的用户信息） */
  members: Array<{ userId: string, nickname?: string, avatarUrl?: string }>
  /** 加入时透传的扩展信息（joinExt / signalRooms[].ext） */
  ext?: string
}

/** EmChatroomContainer 对外 emits */
export interface ChatroomContainerEmits {
  /** 点击顶部返回（业务决定路由/关闭） */
  (e: 'back'): void
  /** 当前用户被移出聊天室 */
  (e: 'kicked', reason: number): void
  /** 聊天室被解散 */
  (e: 'destroyed'): void
  /** 加入聊天室失败（错误已 toast，此事件供业务补充处理） */
  (e: 'join-error', error: unknown): void
  /**
   * 成员加入（含 join ext 透传，P4 review 需求 2）：业务可据此识别
   * 新成员来源/携带信息做自定义逻辑（如「XX 来自直播间 A」提示）。
   */
  (e: 'member-joined', payload: ChatroomMemberJoinedPayload): void
  /** 信令房消息透传（§5.9：UIKit 零渲染零假设，payload 为解码后的 UiMessage） */
  (e: 'signal-message', payload: SignalMessagePayload): void
  /** 信令房状态变化（joined/failed/kicked/destroyed；失败不拖累 UI 房） */
  (e: 'signal-status', payload: SignalStatusPayload): void
}
