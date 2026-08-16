/**
 * 直播/语聊房场景通用弹幕类型。
 *
 * 设计原则：
 * - kind 只描述消息语义，不绑定视觉位置；
 * - 视觉分区由 NOTIFICATION_KINDS / CHAT_KINDS 决定，便于 live/voice 场景复用。
 */

/** 弹幕消息类型 */
export type LiveDanmakuKind = 'normal' | 'checkin' | 'purchase' | 'gift' | 'welcome'

/** 弹幕条目（直播场景自绘 overlay / 语聊房未来可复用） */
export interface LiveDanmakuItem {
  /** 自增 id（组件消费增量用） */
  id: number
  /** 消息类型 */
  kind: LiveDanmakuKind
  /** 用户名（组件内按 mask-name 决定是否脱敏展示） */
  name?: string
  /** 内容 */
  content: string
  /** 合并人数（购买提示「等N人」/ 普通消息重复次数） */
  count?: number
  /** 礼物图标 */
  giftIcon?: string
  /** 是否 VIP（welcome 类型高亮用） */
  isVip?: boolean
}

/** 固定在上部通知区的类型：商品上架、签到、购买提示、成员欢迎 */
export const NOTIFICATION_KINDS: readonly LiveDanmakuKind[] = ['checkin', 'purchase', 'welcome']

/** 自动滚动聊天区的类型：普通弹幕、礼物 */
export const CHAT_KINDS: readonly LiveDanmakuKind[] = ['normal', 'gift']

/** 判断是否为通知类型 */
export function isNotificationKind(kind: LiveDanmakuKind): boolean {
  return NOTIFICATION_KINDS.includes(kind)
}

/** 判断是否为聊天类型 */
export function isChatKind(kind: LiveDanmakuKind): boolean {
  return CHAT_KINDS.includes(kind)
}
