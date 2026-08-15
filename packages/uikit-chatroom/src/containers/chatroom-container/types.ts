import type { ChatroomSceneConfig } from '../../composables/use-chatroom-scene'

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
}
