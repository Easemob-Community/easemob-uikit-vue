<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

/**
 * headless 弹幕轨道演示：
 * 模拟 `useChatroomMessage().subscribe(cb)` 的**批量消费契约**——
 * 消息源按帧批量回调（增量有序），业务自绘轨道渲染，丢帧由业务决定。
 * （真实接入时把模拟源换成 useChatroom + useChatroomMessage 即可，见页面说明）
 */
interface Danmaku {
  id: number
  name: string
  content: string
  color: string
}

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
const COMMENTS = ['主播好棒！', '666', '这个商品不错', '哈哈哈', '来了来了', '蹲一个优惠']
const COLORS = ['#7dd3fc', '#fbbf24', '#f472b6', '#86efac', '#c4b5fd']

const lanes = ref<Danmaku[]>([])
const maxLanes = 4
let seq = 0
let buffer: Danmaku[] = []
let rafId = 0
let sourceTimer: ReturnType<typeof setInterval> | undefined

/** 模拟消息源：随机产生一条弹幕 */
function produce() {
  buffer.push({
    id: ++seq,
    name: NAMES[seq % NAMES.length],
    content: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
    color: COLORS[seq % COLORS.length],
  })
}

/** 消费端：按帧批量 flush（对应 subscribe 回调），增量追加 + 轨道滑动 */
function flush() {
  if (buffer.length === 0)
    return
  const batch = buffer
  buffer = []
  lanes.value = [...lanes.value, ...batch].slice(-maxLanes * 6)
}

function tick() {
  flush()
  rafId = requestAnimationFrame(tick)
}

sourceTimer = setInterval(produce, 900)
rafId = requestAnimationFrame(tick)

onUnmounted(() => {
  clearInterval(sourceTimer)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="headless-demo">
    <div class="headless-demo__stage">
      <TransitionGroup name="lane" tag="div" class="headless-demo__lanes">
        <div v-for="item in lanes" :key="item.id" class="headless-demo__lane">
          <span class="headless-demo__name" :style="{ color: item.color }">{{ item.name }}</span>
          <span class="headless-demo__content">{{ item.content }}</span>
        </div>
      </TransitionGroup>
    </div>
    <p class="headless-demo__hint">
      无容器自绘弹幕轨道：模拟消息源按帧批量回调（对应 <code>subscribe</code> 的增量有序 + flush
      批量消费契约），UI 完全由业务自绘。真实接入时替换为
      <code>useChatroom()</code> + <code>useChatroomMessage()</code> 即可。
    </p>
  </div>
</template>

<style scoped>
.headless-demo__stage {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 10px;
  background: #14181f;
}

.headless-demo__lanes {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
}

.headless-demo__lane {
  display: flex;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 13px;
  white-space: nowrap;
}

.headless-demo__name {
  font-weight: 600;
}

.headless-demo__content {
  color: rgba(255, 255, 255, 0.9);
}

.headless-demo__hint {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

/* 新条目滑入动画 */
.lane-enter-active {
  transition: all 0.25s ease;
}

.lane-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.lane-leave-active {
  transition: all 0.2s ease;
  position: absolute;
}

.lane-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
