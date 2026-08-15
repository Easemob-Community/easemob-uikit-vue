<script setup lang="ts">
/**
 * 轻量变高虚拟列表（P4 review 需求 5：大体量消息流性能）：
 * - 只渲染可视区 + 上下缓冲行，上下用占位块撑起滚动高度；
 * - 行高实测缓存（未测行用 estimateHeight 估算），滚动/追加时惰性修正；
 * - 场景约定：消息流「历史在前、新消息追加末尾」；prepend 历史时调用
 *   resetHeights()（index→行映射移位，行高缓存需失效）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 数据源（任意数组；切片渲染） */
  items: unknown[]
  /** 未测行的估算行高（px），默认 48 */
  estimateHeight?: number
  /** 行间距（px），默认 8 */
  gap?: number
  /** 可视区上下缓冲行数，默认 6 */
  buffer?: number
  /** 行 key 提取（稳定 key 防行内容错位；缺省用 index） */
  itemKey?: (item: unknown, index: number) => string | number
}>(), {
  estimateHeight: 48,
  gap: 8,
  buffer: 6,
  itemKey: undefined,
})

const emit = defineEmits<{
  /** 滚动事件（容器判定底部跟随等） */
  (e: 'scroll', event: Event): void
}>()

const scrollRef = ref<HTMLElement>()
const viewportHeight = ref(0)
const scrollTop = ref(0)
/** index → 实测行高 */
const heights = new Map<number, number>()
/** 行高修正版本（测量变化触发重渲染） */
const version = ref(0)

function heightAt(index: number): number {
  return heights.get(index) ?? props.estimateHeight
}

/** 前缀和偏移（items 数百量级内 O(n) 重算可接受） */
const offsets = computed<number[]>(() => {
  const list: number[] = [0]
  let acc = 0
  for (let i = 0; i < props.items.length; i++) {
    acc += heightAt(i) + (i > 0 ? props.gap : 0)
    list.push(acc)
  }
  return list
})

const totalHeight = computed(() => offsets.value[props.items.length] ?? 0)

/** 二分查找 scrollTop 所在行 index */
function findStart(target: number): number {
  const offs = offsets.value
  let lo = 0
  let hi = props.items.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offs[mid]! <= target)
      lo = mid + 1
    else
      hi = mid
  }
  return Math.max(0, lo - 1)
}

/** 可见范围（含缓冲） */
const range = computed(() => {
  const count = props.items.length
  if (count === 0)
    return { start: 0, end: 0 }
  const start = Math.max(0, findStart(scrollTop.value) - props.buffer)
  const limit = scrollTop.value + viewportHeight.value + props.buffer * props.estimateHeight
  const offs = offsets.value
  let end = start
  while (end < count && offs[end + 1]! <= limit)
    end++
  return { start, end: Math.min(count, end + 1) }
})

const visibleItems = computed(() => props.items.slice(range.value.start, range.value.end))
const padTop = computed(() => offsets.value[range.value.start] ?? 0)
const padBottom = computed(() => totalHeight.value - (offsets.value[range.value.end] ?? totalHeight.value))

/** 行渲染后测量（缓存实测高度；变化触发重算） */
const rowRefs: (HTMLElement | null)[] = []

function measureRows() {
  nextTick(() => {
    let changed = false
    for (let i = range.value.start; i < range.value.end; i++) {
      const el = rowRefs[i - range.value.start]
      if (el) {
        const h = el.getBoundingClientRect().height
        if (Math.abs((heights.get(i) ?? props.estimateHeight) - h) > 0.5) {
          heights.set(i, h)
          changed = true
        }
      }
    }
    if (changed)
      version.value++
  })
}

watch(() => [range.value.start, range.value.end, props.items.length, version.value], measureRows)

function onScroll(event: Event) {
  scrollTop.value = scrollRef.value?.scrollTop ?? 0
  emit('scroll', event)
}

/** 滚到底部（消息流底部跟随；调用方在消息追加后 rAF 调用） */
function scrollToBottom() {
  const el = scrollRef.value
  if (el)
    el.scrollTop = el.scrollHeight
}

/** 行高缓存失效（prepend 历史后 index→行映射移位时调用） */
function resetHeights() {
  heights.clear()
  version.value++
}

function syncViewport() {
  viewportHeight.value = scrollRef.value?.clientHeight ?? 0
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
})

defineExpose({ scrollToBottom, resetHeights })
</script>

<template>
  <div ref="scrollRef" class="virtual-list" @scroll="onScroll">
    <div class="virtual-list__pad" :style="{ height: `${padTop}px` }" />
    <template
      v-for="(item, index) in visibleItems"
      :key="itemKey ? itemKey(item, range.start + index) : range.start + index"
    >
      <div
        :ref="el => { rowRefs[index] = el as HTMLElement | null }"
        class="virtual-list__row"
      >
        <slot name="item" :item="item" :index="range.start + index" />
      </div>
    </template>
    <div class="virtual-list__pad" :style="{ height: `${padBottom}px` }" />
  </div>
</template>

<style scoped>
.virtual-list {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.virtual-list__pad {
  flex-shrink: 0;
}

.virtual-list__row {
  padding-bottom: v-bind('`${gap}px`');
}
</style>
