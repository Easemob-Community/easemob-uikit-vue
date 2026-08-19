/**
 * 直播/语聊房场景通用弹幕类型。
 *
 * 设计原则：
 * - kind 只描述消息语义，不绑定视觉位置；
 * - 视觉分区由 NOTIFICATION_KINDS / CHAT_KINDS 决定，便于 live/voice 场景复用；
 * - 业务自定义 kind 通过联合加宽 `| (string & {})` 透传：内置 kind 走常量分区，
 *   自定义 kind 用条目级 `zone` 显式指定分区（缺省回落聊天区），并建议配合
 *   ChatroomLiveDanmakuStream 的 `#item` 插槽自定义渲染（见 docs/CHATROOM-CAPABILITY-REVIEW.md §五 P6-2）。
 */

/** 弹幕消息类型（内置语义；业务自定义 kind 经 `| (string & {})` 加宽透传） */
export type LiveDanmakuKind = 'normal' | 'checkin' | 'purchase' | 'gift' | 'welcome' | (string & {})

/** 弹幕视觉分区（条目级 zone 优先于 NOTIFICATION_KINDS / CHAT_KINDS 常量） */
export type LiveDanmakuZone = 'notice' | 'chat'

/** 弹幕条目（直播场景自绘 overlay / 语聊房未来可复用） */
export interface LiveDanmakuItem {
  /** 自增 id（组件消费增量用） */
  id: number
  /** 消息类型（内置 kind 走常量分区；自定义 kind 配合 zone 指定分区 + #item 插槽渲染） */
  kind: LiveDanmakuKind
  /** 用户名（组件内按 mask-name 决定是否脱敏展示；插槽 scope 同时暴露 displayName） */
  name?: string
  /** 内容 */
  content: string
  /** 合并人数（购买提示「等N人」/ 普通消息重复次数） */
  count?: number
  /** 礼物图标 */
  giftIcon?: string
  /** 是否 VIP（welcome 类型高亮用） */
  isVip?: boolean
  /**
   * 视觉分区覆盖（'notice' 上部通知区 / 'chat' 滚动聊天区）。
   * 缺省按 NOTIFICATION_KINDS / CHAT_KINDS 常量判定；自定义 kind 用此字段显式指定。
   */
  zone?: LiveDanmakuZone
  /** 业务数据透传（如 { vipLevel: 6, badge: '🚀' }），供 #badge / #item 插槽消费 */
  meta?: Record<string, unknown>
}

/** 固定在上部通知区的类型：商品上架、签到、购买提示、成员欢迎 */
export const NOTIFICATION_KINDS: readonly LiveDanmakuKind[] = ['checkin', 'purchase', 'welcome']

/** 自动滚动聊天区的类型：普通弹幕、礼物 */
export const CHAT_KINDS: readonly LiveDanmakuKind[] = ['normal', 'gift']

/** 判断是否为通知类型（参数加宽：自定义 kind 由条目 zone 显式指定，不依赖常量） */
export function isNotificationKind(kind: string): boolean {
  return NOTIFICATION_KINDS.includes(kind as LiveDanmakuKind)
}

/** 判断是否为聊天类型（参数加宽：自定义 kind 由条目 zone 显式指定，不依赖常量） */
export function isChatKind(kind: string): boolean {
  return CHAT_KINDS.includes(kind as LiveDanmakuKind)
}
