<script setup lang="ts">
/**
 * 直播弹幕流（左下区，参考图 UI 规范重构）：
 * - 视觉分为两区：
 *   1. 上部通知区（固定展示）：checkin（商品上架/签到）、purchase（购买提示）；
 *   2. 下部聊天区（自动滚动）：normal（普通弹幕）、gift（礼物）；
 * - 每条消息独立胶囊，超出 maxLines（默认 2 行）截断省略（-webkit-line-clamp）；
 * - 视觉样式全部经 `--live-danmaku-*` CSS 变量开放（气泡底色/用户名色/各类型渐变/字号/圆角等），
 *   在组件任意祖先元素上覆盖即可；token 清单见下方 style 块头注释。
 *   All visuals are themable via `--live-danmaku-*` CSS custom properties — override on any ancestor.
 * - H5 字号按 viewport 相对缩放（clamp 11px~13px），避免大屏占比失衡；
 * - 用户名脱敏可开关（mask-name prop，默认 true）；
 * - 购买提示 / 普通消息在 1s 窗口内合并计数；超出最大条数按优先级挤出。
 */
import { computed, ref, watch } from 'vue'
import { maskUsername } from './mask-username'
import {
  CHAT_KINDS,
  isChatKind,
  isNotificationKind,
  NOTIFICATION_KINDS,
  type LiveDanmakuItem,
  type LiveDanmakuKind,
} from './live-danmaku-types'

export type { LiveDanmakuItem } from './live-danmaku-types'

export interface LiveDanmakuStreamProps {
  /** 弹幕条目流（页面 push 追加，本组件按 id 增量消费） */
  items: LiveDanmakuItem[]
  /** 是否对用户名脱敏（默认 true） */
  maskName?: boolean
  /** 聊天区最多同时显示条数 */
  maxChatItems?: number
  /** 通知区最多同时显示条数 */
  maxNoticeItems?: number
  /** 弹幕气泡圆角预设：rounded（普通圆角）/ pill（胶囊大圆角）/ square（方圆角）；默认 rounded */
  shape?: 'rounded' | 'pill' | 'square'
  /**
   * 单条弹幕最大展示行数，超出截断省略；默认 2
   * Max lines shown per danmaku bubble before truncating with ellipsis (default: 2)
   */
  maxLines?: number
  /**
   * 字号档位：small（默认，H5 弹幕推荐）/ medium / large；
   * 不传时走 --live-danmaku-font-size token（祖先元素可覆盖），传了则以档位为准。
   * Font size preset: small (default, recommended for H5 danmaku) / medium / large.
   * When omitted, the --live-danmaku-font-size token governs (overridable on any ancestor).
   */
  size?: 'small' | 'medium' | 'large'
}

/** 字号档位映射（写入 --live-danmaku-font-size，图标/计数徽标按系数跟随） */
const DANMAKU_FONT_SIZES: Record<NonNullable<LiveDanmakuStreamProps['size']>, string> = {
  small: 'clamp(10px, 2.8vw, 12px)',
  medium: 'clamp(11px, 3.2vw, 13px)',
  large: 'clamp(12px, 3.6vw, 15px)',
}

const props = withDefaults(defineProps<LiveDanmakuStreamProps>(), {
  maskName: true,
  maxChatItems: 5,
  maxNoticeItems: 3,
  shape: 'rounded',
  maxLines: 2,
  size: undefined,
})

/** 类型优先级（越高越难被挤出）：欢迎 > 系统签到 > 礼物 > 购买提示 > 普通弹幕 */
const KIND_PRIORITY: Record<LiveDanmakuKind, number> = {
  welcome: 4,
  checkin: 3,
  gift: 2,
  purchase: 1,
  normal: 0,
}

/** 根元素样式：maxLines 始终写入；size 仅显式传入时写入（否则保留祖先 token 覆盖通道） */
const rootStyle = computed(() => ({
  '--live-danmaku-max-lines': String(props.maxLines),
  ...(props.size ? { '--live-danmaku-font-size': DANMAKU_FONT_SIZES[props.size] } : {}),
}))

/** 退场动画时长（ms），结束后移除 */
const LEAVE_MS = 500
/** 普通消息合并窗口（ms） */
const MERGE_WINDOW_MS = 1000

interface ActiveDanmaku extends LiveDanmakuItem {
  /** 合并后的展示计数 */
  displayCount: number
  /** 入场动画完成前标记（控制 animation） */
  entering: boolean
}

interface MergeWindow {
  /** 关联的活跃条目 id */
  id: number
  /** 合并计数 */
  count: number
  /** 窗口过期计时器 */
  timer: ReturnType<typeof setTimeout>
}

/** 上部通知区（固定展示） */
const notices = ref<ActiveDanmaku[]>([])
/** 下部聊天区（自动滚动） */
const chats = ref<ActiveDanmaku[]>([])
/** 通知区退场中 */
const leavingNotices = ref<ActiveDanmaku[]>([])
/** 聊天区退场中 */
const leavingChats = ref<ActiveDanmaku[]>([])

/** 合并窗口索引：key = kind|name|content → { id, count, timer } */
const noticeWindows = new Map<string, MergeWindow>()
const chatWindows = new Map<string, MergeWindow>()

let idSeq = 0

/** 展示名（按 mask-name 决定是否脱敏） */
function displayName(item: LiveDanmakuItem): string {
  const name = item.name ?? ''
  if (!name)
    return ''
  return props.maskName ? maskUsername(name) : name
}

/** 合并 key（purchase 忽略 name——购买提示是全体动作） */
function mergeKey(item: LiveDanmakuItem): string {
  const name = item.kind === 'purchase' ? '' : (item.name ?? '')
  return `${item.kind}|${name}|${item.content}`
}

/** 标记退场（按优先级挤出最不该留的：低优先级且最旧） */
function evictIfNeeded(
  list: ActiveDanmaku[],
  windows: Map<string, MergeWindow>,
  max: number,
  leavingList: ActiveDanmaku[],
) {
  if (list.length <= max)
    return
  // 找到最低优先级的条目（同优先级取最旧 = 数组尾）
  let evictIndex = list.length - 1
  for (let i = list.length - 1; i >= 0; i--) {
    if (KIND_PRIORITY[list[i]!.kind] < KIND_PRIORITY[list[evictIndex]!.kind])
      evictIndex = i
  }
  const [target] = list.splice(evictIndex, 1)
  if (!target)
    return
  // 清掉该条目的合并窗口，避免后续错误合并到已退场条目
  windows.delete(mergeKey(target))
  leavingList.push(target)
  setTimeout(() => {
    const idx = leavingList.findIndex(item => item.id === target.id)
    if (idx >= 0)
      leavingList.splice(idx, 1)
  }, LEAVE_MS)
}

/** 消费单条新增条目 */
function consumeItem(item: LiveDanmakuItem) {
  const isNotice = isNotificationKind(item.kind)
  const list = isNotice ? notices.value : chats.value
  const windows = isNotice ? noticeWindows : chatWindows
  const max = isNotice ? props.maxNoticeItems : props.maxChatItems
  const leavingList = isNotice ? leavingNotices.value : leavingChats.value

  // 可合并类型：purchase（等N人）、normal（×N）
  const key = mergeKey(item)
  const window = windows.get(key)
  if (window && (item.kind === 'purchase' || item.kind === 'normal')) {
    window.count += 1
    const target = list.find(active => active.id === window.id)
    if (target)
      target.displayCount = window.count
    clearTimeout(window.timer)
    window.timer = setTimeout(() => windows.delete(key), MERGE_WINDOW_MS)
    return
  }

  const entry: ActiveDanmaku = {
    ...item,
    displayCount: item.count ?? 1,
    entering: true,
  }
  list.unshift(entry)
  evictIfNeeded(list, windows, max, leavingList)
  windows.set(key, {
    id: entry.id,
    count: entry.displayCount,
    timer: setTimeout(() => windows.delete(key), MERGE_WINDOW_MS),
  })
}

/** 消费新增条目（按 id 增量） */
watch(
  () => props.items.length,
  () => {
    for (let i = idSeq; i < props.items.length; i++) {
      const item = props.items[i]!
      idSeq += 1
      consumeItem(item)
    }
    // 入场动画标记复位（触发 CSS animation）
    requestAnimationFrame(() => {
      for (const entry of notices.value)
        entry.entering = false
      for (const entry of chats.value)
        entry.entering = false
    })
  },
)
</script>

<template>
  <div class="live-danmaku" :style="rootStyle">
    <!-- 上部通知区（固定展示） -->
    <div v-if="notices.length > 0 || leavingNotices.length > 0" class="live-danmaku__notices">
      <div
        v-for="item in leavingNotices"
        :key="`leaving-notice-${item.id}`"
        class="live-danmaku__item live-danmaku__item--leaving"
        :class="[`live-danmaku__item--${item.kind}`, `live-danmaku__item--${props.shape}`]"
      >
        <span v-if="item.kind === 'purchase'" class="live-danmaku__cart">🛒</span>
        <template v-if="item.kind === 'purchase'">
          <span class="live-danmaku__name">{{ displayName(item) }}</span>
          <span class="live-danmaku__count live-danmaku__count--inline">等{{ item.displayCount }}人</span>
          <span class="live-danmaku__content">{{ item.content }}</span>
        </template>
        <template v-else-if="item.kind === 'welcome'">
          <span v-if="item.isVip" class="live-danmaku__crown">👑</span>
          <span class="live-danmaku__welcome-text">欢迎 <span class="live-danmaku__welcome-name" :class="{ 'live-danmaku__welcome-name--vip': item.isVip }">{{ displayName(item) }}</span> 💕 {{ item.content || '进入' }}</span>
        </template>
        <template v-else>
          <span v-if="displayName(item)" class="live-danmaku__name">{{ displayName(item) }}：</span>
          <span class="live-danmaku__content">{{ item.content }}</span>
        </template>
      </div>

      <div
        v-for="item in notices"
        :key="`notice-${item.id}`"
        class="live-danmaku__item"
        :class="[`live-danmaku__item--${item.kind}`, `live-danmaku__item--${props.shape}`, { 'live-danmaku__item--enter': !item.entering }]"
      >
        <span v-if="item.kind === 'purchase'" class="live-danmaku__cart">🛒</span>
        <template v-if="item.kind === 'purchase'">
          <span class="live-danmaku__name">{{ displayName(item) }}</span>
          <span class="live-danmaku__count live-danmaku__count--inline">等{{ item.displayCount }}人</span>
          <span class="live-danmaku__content">{{ item.content }}</span>
        </template>
        <template v-else-if="item.kind === 'welcome'">
          <span v-if="item.isVip" class="live-danmaku__crown">👑</span>
          <span class="live-danmaku__welcome-text">欢迎 <span class="live-danmaku__welcome-name" :class="{ 'live-danmaku__welcome-name--vip': item.isVip }">{{ displayName(item) }}</span> 💕 {{ item.content || '进入' }}</span>
        </template>
        <template v-else>
          <span v-if="displayName(item)" class="live-danmaku__name">{{ displayName(item) }}：</span>
          <span class="live-danmaku__content">{{ item.content }}</span>
        </template>
      </div>
    </div>

    <!-- 下部聊天区（自动滚动：column-reverse，数组头 = 视觉底 = 最新） -->
    <div v-if="chats.length > 0 || leavingChats.length > 0" class="live-danmaku__chat">
      <div
        v-for="item in leavingChats"
        :key="`leaving-chat-${item.id}`"
        class="live-danmaku__item live-danmaku__item--leaving"
        :class="[`live-danmaku__item--${item.kind}`, `live-danmaku__item--${props.shape}`]"
      >
        <span v-if="item.kind === 'gift'" class="live-danmaku__gift-icon">{{ item.giftIcon }}</span>
        <span v-if="displayName(item)" class="live-danmaku__name">{{ displayName(item) }}：</span>
        <span class="live-danmaku__content">{{ item.content }}</span>
        <span v-if="item.kind === 'normal' && item.displayCount > 1" class="live-danmaku__count">×{{ item.displayCount }}</span>
      </div>

      <div
        v-for="item in chats"
        :key="`chat-${item.id}`"
        class="live-danmaku__item"
        :class="[`live-danmaku__item--${item.kind}`, `live-danmaku__item--${props.shape}`, { 'live-danmaku__item--enter': !item.entering }]"
      >
        <span v-if="item.kind === 'gift'" class="live-danmaku__gift-icon">{{ item.giftIcon }}</span>
        <span v-if="displayName(item)" class="live-danmaku__name">{{ displayName(item) }}：</span>
        <span class="live-danmaku__content">{{ item.content }}</span>
        <span v-if="item.kind === 'normal' && item.displayCount > 1" class="live-danmaku__count">×{{ item.displayCount }}</span>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="notices.length === 0 && chats.length === 0 && leavingNotices.length === 0 && leavingChats.length === 0" class="live-danmaku__empty">
      等待弹幕…（发送消息或让另一账号发言）
    </div>
  </div>
</template>

<style scoped>
/*
 * 主题 token 契约 / Theming tokens（在组件任意祖先元素上覆盖即可，默认值 = fallback）：
 * Override on any ancestor element (inline style or CSS); fallbacks preserve the default look.
 *   --live-danmaku-bg                 普通气泡底色（默认 rgba(0,0,0,0.3)）
 *   --live-danmaku-text-color         正文色（默认 #fff）
 *   --live-danmaku-font-size          字号（默认 clamp(10px,2.8vw,12px) = size small 档；
 *                                     图标/计数徽标按系数跟随；传了 size prop 则以档位为准）
 *   --live-danmaku-line-height        行高（默认 1.35）
 *   --live-danmaku-padding            气泡内边距（默认 5px 10px）
 *   --live-danmaku-blur               背景模糊（默认 6px）
 *   --live-danmaku-radius             rounded 圆角（默认 16px）
 *   --live-danmaku-radius-pill        pill 圆角（默认 999px）
 *   --live-danmaku-radius-square      square 方圆角（默认 6px）
 *   --live-danmaku-name-color         通用用户名色（默认 rgba(255,255,255,0.85)）
 *   --live-danmaku-normal-name-color  普通弹幕用户名色（默认 #ffd666）
 *   --live-danmaku-checkin-bg         签到气泡背景（默认品牌红渐变）
 *   --live-danmaku-purchase-bg        购买提示背景（默认 rgba(229,72,77,0.9)）
 *   --live-danmaku-welcome-bg         欢迎条背景（默认金橙渐变）
 *   --live-danmaku-welcome-shadow     欢迎条投影
 *   --live-danmaku-welcome-vip-color  VIP 用户名高亮色（默认 #ffefb8）
 *   --live-danmaku-welcome-vip-shadow VIP 用户名光晕
 *   --live-danmaku-gift-bg            礼物气泡背景
 *   --live-danmaku-gift-border-color  礼物金边色
 *   --live-danmaku-icon-size          行内图标字号（默认 = 正文字号 × 1.08）
 *   --live-danmaku-count-size         计数徽标字号（默认 = 正文字号 × 0.85）
 *   --live-danmaku-empty-bg           空态背景
 *   --live-danmaku-empty-color        空态文字色
 *   --live-danmaku-max-width          弹幕流最大宽度（默认 280px；组件宽 = min(父级宽, 此值)）
 *   --live-danmaku-max-lines          单条最大行数（默认 2，一般由 maxLines prop 驱动）
 */
.live-danmaku {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  /* 宽度链必须全链路「定宽」：width: 100% 填充父级 + 非百分比 max-width 封顶。
     此前用 max-width: min(70%, 280px)：当祖先是不定宽容器（如 abs 只设 left 的
     shrink-to-fit 包裹层）时，百分比 max-width 与父级固有宽度形成循环依赖，
     实际可用宽度被算成比内容窄一点，短消息出现「12\n3」式逐字异常换行。
     消费侧如需 70% 宽度，请在包裹层用 width 明确给出（demo 页即如此）。 */
  width: 100%;
  max-width: var(--live-danmaku-max-width, 280px);
  pointer-events: none;
}

.live-danmaku__notices,
.live-danmaku__chat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  /* width: 100% 让本容器受外层 .live-danmaku 的 max-width 限制；
     align-items: flex-start 保证每个 item 只按自身文字宽度展示，不会被拉伸。 */
  width: 100%;
}

/* 聊天区：视觉上从底部往上堆叠（最新在最下） */
.live-danmaku__chat {
  flex-direction: column-reverse;
}

.live-danmaku__empty {
  padding: 8px 12px;
  border-radius: 14px;
  background: var(--live-danmaku-empty-bg, rgba(0, 0, 0, 0.25));
  color: var(--live-danmaku-empty-color, rgba(255, 255, 255, 0.45));
  font-size: var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px));
  line-height: 1.4;
}

.live-danmaku__item {
  display: flex;
  align-items: center;
  gap: 4px;
  /* max-content 保证气泡宽度以自身文字为导向，不会被 fit-content 压窄；
     max-width: 100% 限制其不超过父容器宽度。 */
  width: max-content;
  max-width: 100%;
  padding: var(--live-danmaku-padding, 5px 10px);
  background: var(--live-danmaku-bg, rgba(0, 0, 0, 0.3));
  backdrop-filter: blur(var(--live-danmaku-blur, 6px));
  -webkit-backdrop-filter: blur(var(--live-danmaku-blur, 6px));
  font-size: var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px));
  line-height: var(--live-danmaku-line-height, 1.35);
  color: var(--live-danmaku-text-color, #fff);
  opacity: 0;
  will-change: transform, opacity;
}

/* 圆角预设：普通圆角 */
.live-danmaku__item--rounded {
  border-radius: var(--live-danmaku-radius, 16px);
}

/* 圆角预设：胶囊大圆角 */
.live-danmaku__item--pill {
  border-radius: var(--live-danmaku-radius-pill, 999px);
}

/* 圆角预设：方圆角 */
.live-danmaku__item--square {
  border-radius: var(--live-danmaku-radius-square, 6px);
}

/* 入场动画：通知区从上方滑入，聊天区从下方滑入 */
.live-danmaku__notices .live-danmaku__item--enter {
  animation: notice-in 300ms ease-out forwards;
}

.live-danmaku__chat .live-danmaku__item--enter {
  animation: chat-in 300ms ease-out forwards;
}

@keyframes notice-in {
  from {
    transform: translateY(-16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes chat-in {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 退场：向上淡出 */
.live-danmaku__item--leaving {
  position: absolute;
  transition:
    transform 500ms ease-out,
    opacity 500ms ease-out;
  transform: translateY(-24px);
  opacity: 0;
}

/* 普通消息：用户名金色/橙色 */
.live-danmaku__item--normal .live-danmaku__name {
  color: var(--live-danmaku-normal-name-color, #ffd666);
  font-weight: 500;
  flex-shrink: 0;
}

/* 系统签到：品牌红色渐变 */
.live-danmaku__item--checkin {
  background: var(--live-danmaku-checkin-bg, linear-gradient(90deg, #e5484d, #ff6b6b));
  font-weight: 600;
}

/* 购买提示：独立红色胶囊 */
.live-danmaku__item--purchase {
  background: var(--live-danmaku-purchase-bg, rgba(229, 72, 77, 0.9));
  font-weight: 500;
}

.live-danmaku__cart {
  font-size: var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px));
  flex-shrink: 0;
}

/* 欢迎进入：金色/橙色渐变条（参考图效果） */
.live-danmaku__item--welcome {
  background: var(--live-danmaku-welcome-bg, linear-gradient(90deg, #f59e0b, #f97316));
  box-shadow: var(--live-danmaku-welcome-shadow, 0 2px 10px rgba(249, 115, 22, 0.35));
  font-weight: 500;
}

.live-danmaku__crown {
  font-size: var(--live-danmaku-icon-size, calc(var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px)) * 1.08));
  flex-shrink: 0;
}

.live-danmaku__welcome-text {
  white-space: nowrap;
}

.live-danmaku__welcome-name {
  font-weight: 700;
}

.live-danmaku__welcome-name--vip {
  color: var(--live-danmaku-welcome-vip-color, #ffefb8);
  text-shadow: var(--live-danmaku-welcome-vip-shadow, 0 0 8px rgba(255, 239, 184, 0.8));
}

/* 礼物：金边胶囊 */
.live-danmaku__item--gift {
  background: var(--live-danmaku-gift-bg, rgba(17, 24, 39, 0.55));
  border: 1px solid var(--live-danmaku-gift-border-color, rgba(243, 200, 80, 0.6));
}

.live-danmaku__gift-icon {
  font-size: var(--live-danmaku-icon-size, calc(var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px)) * 1.08));
  flex-shrink: 0;
}

.live-danmaku__name {
  flex-shrink: 0;
  color: var(--live-danmaku-name-color, rgba(255, 255, 255, 0.85));
}

.live-danmaku__content {
  /* flex: 0 1 auto + min-width: 0 允许 content 在气泡内收缩：
     此前用 flex: none + max-width: 100%，而 flex item 的百分比 max-width
     相对气泡「整个内容盒」解析（不减去前面的用户名/图标占位），长文本
     收缩被禁后内容框超出气泡右缘，2 行文本视觉上溢出气泡。
     行数经 --live-danmaku-max-lines（maxLines prop）参数化，默认 2 行。 */
  flex: 0 1 auto;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: var(--live-danmaku-max-lines, 2);
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.live-danmaku__count {
  flex-shrink: 0;
  font-size: var(--live-danmaku-count-size, calc(var(--live-danmaku-font-size, clamp(10px, 2.8vw, 12px)) * 0.85));
  opacity: 0.9;
}

.live-danmaku__count--inline {
  margin: 0 1px;
}
</style>
