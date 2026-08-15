<script setup lang="ts">
/**
 * 弹幕舞台（headless 页自绘 UI）：纯 CSS 动画渲染，不依赖容器消息列表。
 * - 弹幕条目：从右向左滚动（6 条轨道轮询分配，动画结束自动移除）；
 * - 礼物：居中飘屏（升起 + 缩放淡出）；
 * - 系统通知：居中灰条短暂停留（headless 无 notice 条，事件化呈现）。
 *
 * props.items 为新增条目流（页面 push 追加，本组件 watch 长度增量消费）。
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'

export interface DanmakuItem {
  id: number
  /** 内容文本 */
  text: string
  /** 发送者 */
  from: string
  /** 礼物消息（飘屏样式） */
  isGift?: boolean
  giftIcon?: string
  giftName?: string
  /** 系统通知（居中灰条） */
  isNotice?: boolean
}

const props = defineProps<{
  items: DanmakuItem[]
}>()

const TRACK_COUNT = 6

interface ActiveItem extends DanmakuItem {
  track: number
}

/** 活跃弹幕（动画结束后移除） */
const active = ref<ActiveItem[]>([])
/** 轨道轮询索引 */
let trackCursor = 0

/**
 * 舞台容器实测宽度（弹幕滚出终点用）：动画终点不能按视口宽度（100vw）——
 * PC 上容器 375px 居中、视口 1400px+，弹幕 9s 飞过整个视口在容器内观感过快。
 * 以容器实测宽度计算滚出距离，PC/移动端观感一致。
 */
const stageRef = ref<HTMLElement>()

function syncStageWidth() {
  const el = stageRef.value
  if (el)
    el.style.setProperty('--stage-width', `${el.clientWidth}px`)
}

onMounted(() => {
  syncStageWidth()
  window.addEventListener('resize', syncStageWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncStageWidth)
})

/** 活跃系统通知（单条，2.8s 后消失） */
const notice = ref<DanmakuItem | null>(null)

let idSeq = 0

watch(
  () => props.items.length,
  () => {
    // 增量消费：仅处理新增条目
    for (let i = idSeq; i < props.items.length; i++) {
      const item = props.items[i]!
      if (item.isNotice) {
        notice.value = item
        setTimeout(() => {
          if (notice.value?.id === item.id)
            notice.value = null
        }, 2800)
        continue
      }
      if (item.isGift) {
        // 礼物飘屏：随机轨道起落
        active.value.push({ ...item, track: Math.floor(Math.random() * TRACK_COUNT) })
        setTimeout(() => {
          active.value = active.value.filter(a => a.id !== item.id)
        }, 3200)
        continue
      }
      // 普通弹幕：轮询分配轨道
      const track = trackCursor % TRACK_COUNT
      trackCursor += 1
      const entry: ActiveItem = { ...item, track }
      active.value.push(entry)
      // 动画时长与 CSS 一致（约 9s），结束移除防累积
      setTimeout(() => {
        active.value = active.value.filter(a => a.id !== entry.id)
      }, 9200)
    }
    idSeq = props.items.length
  },
)
</script>

<template>
  <div class="danmaku-stage">
    <!-- 弹幕轨道层 -->
    <div
      v-for="(item, index) in active"
      :key="item.id"
      class="danmaku-item"
      :class="{ 'danmaku-item--gift': item.isGift }"
      :style="{ '--track': item.track, '--delay': `${(index % 5) * 0.15}s` }"
    >
      <template v-if="item.isGift">
        <span class="danmaku-item__gift-icon">{{ item.giftIcon }}</span>
        <span class="danmaku-item__gift-text">{{ item.from }} 送出 {{ item.giftName }}</span>
      </template>
      <template v-else>
        <span class="danmaku-item__from">{{ item.from }}：</span>
        <span class="danmaku-item__text">{{ item.text }}</span>
      </template>
    </div>

    <!-- 系统通知层（headless 事件化呈现） -->
    <div v-if="notice" class="danmaku-stage__notice">
      {{ notice.text }}
    </div>

    <!-- 空态 -->
    <div v-if="active.length === 0 && !notice" class="danmaku-stage__empty">
      等待弹幕…（发送消息或让另一账号发言）
    </div>
  </div>
</template>

<style scoped>
.danmaku-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #101828 0%, #1d2939 60%, #263447 100%);
}

.danmaku-stage__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

.danmaku-item {
  position: absolute;
  top: calc(8px + var(--track) * 30px);
  left: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 80%;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(4px);
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  animation: danmaku-roll 9s linear var(--delay) forwards;
}

@keyframes danmaku-roll {
  0% {
    transform: translateX(0);
  }
  100% {
    /* 终点 = 容器宽度 + 自身宽度（--stage-width 由组件挂载时实测，见 script） */
    transform: translateX(calc(-1 * var(--stage-width, 375px) - 100%));
  }
}

.danmaku-item--gift {
  background: linear-gradient(90deg, rgba(243, 200, 80, 0.35), rgba(255, 107, 107, 0.35));
  border: 1px solid rgba(243, 200, 80, 0.5);
  animation: gift-pop 3.2s ease-out forwards;
}

@keyframes gift-pop {
  0% {
    transform: scale(0.3) translateY(0);
    opacity: 0;
  }
  15% {
    transform: scale(1.15) translateY(-6px);
    opacity: 1;
  }
  30% {
    transform: scale(1) translateY(-4px);
  }
  100% {
    transform: scale(1.1) translateY(-20px);
    opacity: 0;
  }
}

.danmaku-item__from {
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.danmaku-item__text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.danmaku-item__gift-icon {
  font-size: 18px;
}

.danmaku-item__gift-text {
  font-weight: 600;
}

.danmaku-stage__notice {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: notice-in 2.8s ease forwards;
}

@keyframes notice-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
  }
  10% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
