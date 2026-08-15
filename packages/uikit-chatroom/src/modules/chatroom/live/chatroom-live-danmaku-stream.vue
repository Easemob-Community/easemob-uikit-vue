<script setup lang="ts">
/**
 * 直播弹幕流（左下区，垂直向上排列，最大宽度 60%，P4 review UI 规范）：
 * - 每条消息独立胶囊（圆角 18px / rgba(0,0,0,0.3) + blur / 14px）；
 * - 最多同时显示 5 条，超出按优先级挤出（系统通知 > 礼物 > 购买提示 > 普通弹幕），
 *   退场向上淡出（500ms），新消息自底部滑入（300ms）；
 * - 类型：普通（用户名金色 + 内容白色）/ 系统签到（品牌红渐变加粗）/
 *   购买提示（独立红色胶囊 + 购物车图标 + 人数合并）/ 礼物（金边胶囊）；
 * - 高峰合并（>20 条/秒）：购买提示同文案合并计数，普通消息 1s 窗口同用户同内容合并 ×N；
 * - 用户名自动脱敏（maskUsername：朱***士）。
 */
import { ref, watch } from 'vue'
import { maskUsername } from './mask-username'

export interface LiveDanmakuItem {
  /** 自增 id（组件消费增量用） */
  id: number
  /** 消息类型 */
  kind: 'normal' | 'checkin' | 'purchase' | 'gift'
  /** 用户名（组件内脱敏展示） */
  name?: string
  /** 内容 */
  content: string
  /** 合并人数（购买提示「等N人」/ 普通消息重复次数） */
  count?: number
  /** 礼物图标 */
  giftIcon?: string
}

const props = defineProps<{
  /** 弹幕条目流（页面 push 追加，本组件按 id 增量消费） */
  items: LiveDanmakuItem[]
}>()

/** 类型优先级（越高越难被挤出）：系统签到 > 礼物 > 购买提示 > 普通弹幕 */
const KIND_PRIORITY: Record<LiveDanmakuItem['kind'], number> = {
  checkin: 3,
  gift: 2,
  purchase: 1,
  normal: 0,
}

/** 最多同时显示条数（UI 规范） */
const MAX_ITEMS = 5
/** 退场动画时长（ms），结束后移除 */
const LEAVE_MS = 500
/** 普通消息合并窗口（ms） */
const MERGE_WINDOW_MS = 1000

interface ActiveDanmaku extends LiveDanmakuItem {
  /** 展示名（已脱敏） */
  displayName: string
  /** 合并后的展示计数 */
  displayCount: number
  /** 入场动画完成前标记（控制 animation） */
  entering: boolean
}

/** 活跃弹幕（视觉从下往上：数组头 = 视觉底 = 最新） */
const active = ref<ActiveDanmaku[]>([])
/** 退场中（动画结束后移除） */
const leaving = ref<ActiveDanmaku[]>([])

let idSeq = 0
/** 合并窗口索引：key = kind|name|content → { activeIndex, count, timer } */
const mergeWindows = new Map<string, { index: number, count: number, timer: ReturnType<typeof setTimeout> }>()

/** 合并 key（purchase 忽略 name——购买提示是全体动作） */
function mergeKey(item: LiveDanmakuItem): string {
  const name = item.kind === 'purchase' ? '' : (item.name ?? '')
  return `${item.kind}|${name}|${item.content}`
}

/** 标记退场（按优先级挤出最不该留的：低优先级且最旧） */
function evictIfNeeded() {
  if (active.value.length <= MAX_ITEMS)
    return
  // 找到最低优先级的条目（同优先级取最旧=视觉最上=数组尾）
  let evictIndex = active.value.length - 1
  for (let i = active.value.length - 1; i >= 0; i--) {
    if (KIND_PRIORITY[active.value[i]!.kind] < KIND_PRIORITY[active.value[evictIndex]!.kind])
      evictIndex = i
  }
  const [target] = active.value.splice(evictIndex, 1)
  if (target)
    leaving.value = [...leaving.value, target]
  setTimeout(() => {
    leaving.value = leaving.value.filter(item => item.id !== target!.id)
  }, LEAVE_MS)
}

/** 消费新增条目（按 id 增量） */
watch(
  () => props.items.length,
  () => {
    for (let i = idSeq; i < props.items.length; i++) {
      const item = props.items[i]!
      idSeq += 1
      // 合并窗口命中：purchase 合并人数 / normal 合并次数
      const key = mergeKey(item)
      const window = mergeWindows.get(key)
      if (window && item.kind !== 'checkin' && item.kind !== 'gift') {
        window.count += 1
        const target = active.value[window.index]
        if (target) {
          target.displayCount = window.count
          target.content = `${target.content}${item.kind === 'purchase' ? '' : ''}`
        }
        // 刷新窗口计时
        clearTimeout(window.timer)
        window.timer = setTimeout(() => mergeWindows.delete(key), MERGE_WINDOW_MS)
        continue
      }
      const entry: ActiveDanmaku = {
        ...item,
        displayName: maskUsername(item.name ?? ''),
        displayCount: item.count ?? 1,
        entering: true,
      }
      active.value = [entry, ...active.value]
      evictIfNeeded()
      mergeWindows.set(key, { index: active.value.indexOf(entry), count: 1, timer: setTimeout(() => mergeWindows.delete(key), MERGE_WINDOW_MS) })
    }
    // 入场动画标记复位（触发 CSS animation）
    requestAnimationFrame(() => {
      for (const entry of active.value)
        entry.entering = false
    })
  },
)
</script>

<template>
  <div class="live-danmaku">
    <!-- 退场层（向上淡出动画中） -->
    <div
      v-for="item in leaving"
      :key="`leaving-${item.id}`"
      class="live-danmaku__item live-danmaku__item--leaving"
      :class="`live-danmaku__item--${item.kind}`"
    >
      <span v-if="item.kind === 'purchase'" class="live-danmaku__cart">🛒</span>
      <span v-if="item.kind === 'gift'" class="live-danmaku__gift-icon">{{ item.giftIcon }}</span>
      <template v-if="item.kind === 'normal' || item.kind === 'checkin' || item.kind === 'gift'">
        <span class="live-danmaku__name">{{ item.displayName }}：</span>
      </template>
      <span class="live-danmaku__content">{{ item.content }}</span>
      <span v-if="item.kind === 'purchase' && item.displayCount > 1" class="live-danmaku__count">等{{ item.displayCount }}人</span>
      <span v-if="item.kind === 'normal' && item.displayCount > 1" class="live-danmaku__count">×{{ item.displayCount }}</span>
    </div>

    <!-- 活跃层（column-reverse：数组头=视觉底=最新） -->
    <div
      v-for="item in active"
      :key="item.id"
      class="live-danmaku__item"
      :class="[`live-danmaku__item--${item.kind}`, { 'live-danmaku__item--enter': !item.entering }]"
    >
      <span v-if="item.kind === 'purchase'" class="live-danmaku__cart">🛒</span>
      <span v-if="item.kind === 'gift'" class="live-danmaku__gift-icon">{{ item.giftIcon }}</span>
      <template v-if="item.kind === 'normal' || item.kind === 'checkin' || item.kind === 'gift'">
        <span class="live-danmaku__name">{{ item.displayName }}：</span>
      </template>
      <span class="live-danmaku__content">{{ item.content }}</span>
      <span v-if="item.kind === 'purchase' && item.displayCount > 1" class="live-danmaku__count">等{{ item.displayCount }}人</span>
      <span v-if="item.kind === 'normal' && item.displayCount > 1" class="live-danmaku__count">×{{ item.displayCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.live-danmaku {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  max-width: 60%;
  pointer-events: none;
}

.live-danmaku__item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 6px 12px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  font-size: 14px;
  line-height: 1.4;
  color: #fff;
  opacity: 0;
  will-change: transform, opacity;
}

/* 入场：从底部滑入 + 淡入（300ms ease-out） */
.live-danmaku__item--enter {
  animation: danmaku-in 300ms ease-out forwards;
}

@keyframes danmaku-in {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 退场：向上淡出（500ms） */
.live-danmaku__item--leaving {
  position: absolute;
  transition:
    transform 500ms ease-out,
    opacity 500ms ease-out;
  transform: translateY(-30px);
  opacity: 0;
}

/* 普通消息：用户名金色/橙色，内容白色 */
.live-danmaku__item--normal .live-danmaku__name {
  color: #ffd666;
  font-weight: 500;
  flex-shrink: 0;
}

/* 系统签到：品牌红色渐变，白字加粗 */
.live-danmaku__item--checkin {
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  font-weight: 700;
}

/* 购买提示：独立红色胶囊条 + 购物车图标 */
.live-danmaku__item--purchase {
  background: rgba(229, 72, 77, 0.85);
  font-weight: 500;
}

.live-danmaku__cart {
  font-size: 14px;
  flex-shrink: 0;
}

/* 礼物：金边胶囊 */
.live-danmaku__item--gift {
  background: rgba(17, 24, 39, 0.55);
  border: 1px solid rgba(243, 200, 80, 0.6);
}

.live-danmaku__gift-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.live-danmaku__name {
  flex-shrink: 0;
}

.live-danmaku__content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-danmaku__count {
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.85;
}
</style>
