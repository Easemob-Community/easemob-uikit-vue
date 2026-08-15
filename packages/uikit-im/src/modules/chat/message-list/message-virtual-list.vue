<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'

export interface MessageVirtualListProps<T> {
  /** 数据列表 */
  items: T[]
  /** 每项预估高度（px），默认 60 */
  estimateHeight?: number
  /** 上下缓冲区数量，默认 5 */
  buffer?: number
  /** 列表唯一标识字段 */
  keyField?: keyof T
  /** 消息项之间的间距（px），默认 12 */
  gap?: number
  /** 列表内边距（px），默认 16 */
  padding?: number
}

const props = withDefaults(defineProps<MessageVirtualListProps<any>>(), {
  estimateHeight: 60,
  buffer: 5,
  keyField: 'id' as any,
  gap: 12,
  padding: 16,
})

const emit = defineEmits<{
  (e: 'scroll', event: Event): void
  (e: 'reach-top'): void
  (e: 'reach-bottom'): void
}>()

/** 列表容器引用 */
const listRef = ref<HTMLElement>()

/** 实际测量的高度缓存 */
const heightCache = ref<Record<string, number>>({})

/** 同步的滚动位置（避免 useScroll throttle 导致的白屏） */
const scrollTop = ref(0)

/** 滚动到达状态 */
const arrivedState = ref({ top: false, bottom: false })

/** 监听容器滚动事件，同步更新 scrollTop */
function onScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el) return
  scrollTop.value = el.scrollTop

  // 更新到达状态
  const threshold = 2
  arrivedState.value.top = el.scrollTop <= threshold
  arrivedState.value.bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold

  emit('scroll', event)
}

/** 列表总高度（基于预估） */
const totalHeight = computed(() => {
  return props.items.reduce((sum, item) => {
    const key = String(item[props.keyField])
    return sum + (heightCache.value[key] || props.estimateHeight)
  }, 0)
})

/** 计算可见范围索引和 padding —— 合并为单次遍历，避免重复计算 */
const virtualState = computed(() => {
  if (!props.items.length || !listRef.value) {
    return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0 }
  }

  const scroll = scrollTop.value
  const containerHeight = listRef.value.clientHeight
  const buffer = props.buffer
  let accumulated = 0
  let start = 0
  let end = 0
  let paddingTop = 0

  // 找 startIndex 并计算 paddingTop
  for (let i = 0; i < props.items.length; i++) {
    const key = String(props.items[i][props.keyField])
    const h = heightCache.value[key] || props.estimateHeight

    if (start === 0 && accumulated + h > scroll) {
      start = Math.max(0, i - buffer)
      // paddingTop = start 之前所有项的高度和
      paddingTop = accumulated
      // 如果 start 因 buffer 回退，需加上回退部分的高度
      for (let j = i - 1; j >= start; j--) {
        const bk = String(props.items[j][props.keyField])
        paddingTop -= heightCache.value[bk] || props.estimateHeight
      }
    }

    accumulated += h

    // 找 endIndex
    if (accumulated >= scroll + containerHeight) {
      end = Math.min(props.items.length - 1, i + buffer)
      break
    }
    end = i
  }

  // 如果还没找到 start（scroll 超出总高度），显示最后几项
  if (start === 0 && accumulated <= scroll) {
    start = Math.max(0, props.items.length - 1 - buffer)
    paddingTop = 0
    for (let i = 0; i < start; i++) {
      const key = String(props.items[i][props.keyField])
      paddingTop += heightCache.value[key] || props.estimateHeight
    }
    end = props.items.length - 1
  }

  // 计算 paddingBottom
  let paddingBottom = 0
  for (let i = end + 1; i < props.items.length; i++) {
    const key = String(props.items[i][props.keyField])
    paddingBottom += heightCache.value[key] || props.estimateHeight
  }

  return { start, end, paddingTop, paddingBottom }
})

/** 可见区域的数据 */
const visibleItems = computed(() => {
  if (!props.items.length) return []
  const { start, end } = virtualState.value
  return props.items.slice(start, end + 1).map((item, index) => ({
    item,
    index: start + index,
  }))
})

/** 顶部 padding */
const paddingTop = computed(() => virtualState.value.paddingTop)

/** 底部 padding */
const paddingBottom = computed(() => virtualState.value.paddingBottom)

/** 监听滚动到顶部/底部 */
watch(() => arrivedState.value.top, (isTop) => {
  if (isTop) emit('reach-top')
})

watch(() => arrivedState.value.bottom, (isBottom) => {
  if (isBottom) emit('reach-bottom')
})

/** 测量实际高度 */
function measureHeights() {
  nextTick(() => {
    if (!listRef.value) return
    const children = listRef.value.querySelectorAll<HTMLElement>('[data-virtual-index]')
    children.forEach((el) => {
      const index = Number(el.dataset.virtualIndex)
      const item = props.items[index]
      if (item) {
        const key = String(item[props.keyField])
        heightCache.value[key] = el.getBoundingClientRect().height
      }
    })
  })
}

/** 数据变化时测量 */
watch(() => props.items.length, () => {
  measureHeights()
})

/** 可见项变化时测量 —— 使用 nextTick 合并多次触发 */
let measureRafId: number | null = null
watch(visibleItems, () => {
  if (measureRafId) cancelAnimationFrame(measureRafId)
  measureRafId = requestAnimationFrame(() => {
    measureRafId = null
    measureHeights()
  })
})

onMounted(() => {
  measureHeights()
})

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      const target = listRef.value.scrollHeight
      listRef.value.scrollTop = target
      // 同步更新内部 scrollTop，避免 throttle 导致白屏
      scrollTop.value = target
      arrivedState.value.bottom = true
      arrivedState.value.top = false
    }
  })
}

/** 滚动到指定索引 */
function scrollToIndex(index: number) {
  nextTick(() => {
    let sum = 0
    for (let i = 0; i < index && i < props.items.length; i++) {
      const key = String(props.items[i][props.keyField])
      sum += heightCache.value[key] || props.estimateHeight
    }
    if (listRef.value) {
      listRef.value.scrollTop = sum
      // 同步更新内部 scrollTop，避免 throttle 导致白屏
      scrollTop.value = sum
      // 更新到达状态
      const el = listRef.value
      const threshold = 2
      arrivedState.value.top = el.scrollTop <= threshold
      arrivedState.value.bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
    }
  })
}

/** 保持当前滚动位置（加载历史消息后调用） */
function preserveScrollPosition(prevScrollTop: number, prevScrollHeight: number) {
  nextTick(() => {
    if (!listRef.value) return
    const newScrollHeight = listRef.value.scrollHeight
    const newScrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
    listRef.value.scrollTop = newScrollTop
    scrollTop.value = newScrollTop
    // 更新到达状态
    const el = listRef.value
    const threshold = 2
    arrivedState.value.top = el.scrollTop <= 0
    arrivedState.value.bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
  })
}

defineExpose({
  scrollToBottom,
  scrollToIndex,
  preserveScrollPosition,
  listRef,
})
</script>

<template>
  <div
    ref="listRef"
    class="message-virtual-list"
    :style="{ '--vl-gap': `${props.gap}px`, '--vl-padding': `${props.padding}px` }"
    @scroll="onScroll"
  >
    <div class="message-virtual-list__spacer" :style="{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }">
      <div
        v-for="{ item, index } in visibleItems"
        :key="String(item[keyField])"
        :data-virtual-index="index"
        class="message-virtual-list__item"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-virtual-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--vl-padding, 16px);
  -webkit-overflow-scrolling: touch;
}

.message-virtual-list__spacer {
  display: flex;
  flex-direction: column;
}

.message-virtual-list__item {
  flex-shrink: 0;
}

.message-virtual-list__item:not(:last-child) {
  padding-bottom: var(--vl-gap, 12px);
}
</style>
