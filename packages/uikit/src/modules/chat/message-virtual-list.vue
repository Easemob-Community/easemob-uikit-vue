<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useScroll } from '@vueuse/core'

export interface MessageVirtualListProps<T> {
  /** 数据列表 */
  items: T[]
  /** 每项预估高度（px），默认 60 */
  estimateHeight?: number
  /** 上下缓冲区数量，默认 5 */
  buffer?: number
  /** 列表唯一标识字段 */
  keyField?: keyof T
}

const props = withDefaults(defineProps<MessageVirtualListProps<any>>(), {
  estimateHeight: 60,
  buffer: 5,
  keyField: 'id' as any,
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

/** 滚动状态 */
const { arrivedState, y: scrollTop } = useScroll(listRef, { throttle: 16 })

/** 列表总高度（基于预估） */
const totalHeight = computed(() => {
  return props.items.reduce((sum, item) => {
    const key = String(item[props.keyField])
    return sum + (heightCache.value[key] || props.estimateHeight)
  }, 0)
})

/** 计算可见范围起始索引 */
const startIndex = computed(() => {
  if (!props.items.length) return 0
  const scroll = scrollTop.value
  let accumulated = 0
  for (let i = 0; i < props.items.length; i++) {
    const key = String(props.items[i][props.keyField])
    const h = heightCache.value[key] || props.estimateHeight
    if (accumulated + h > scroll) return Math.max(0, i - props.buffer)
    accumulated += h
  }
  return 0
})

/** 计算可见范围结束索引 */
const endIndex = computed(() => {
  if (!props.items.length || !listRef.value) return 0
  const containerHeight = listRef.value.clientHeight
  const scroll = scrollTop.value
  let accumulated = 0
  let visibleEnd = 0
  for (let i = 0; i < props.items.length; i++) {
    const key = String(props.items[i][props.keyField])
    const h = heightCache.value[key] || props.estimateHeight
    accumulated += h
    if (accumulated >= scroll + containerHeight) {
      visibleEnd = i
      break
    }
    visibleEnd = i
  }
  return Math.min(props.items.length - 1, visibleEnd + props.buffer)
})

/** 可见区域的数据 */
const visibleItems = computed(() => {
  if (!props.items.length) return []
  const start = startIndex.value
  const end = endIndex.value
  return props.items.slice(start, end + 1).map((item, index) => ({
    item,
    index: start + index,
  }))
})

/** 顶部 padding */
const paddingTop = computed(() => {
  let sum = 0
  for (let i = 0; i < startIndex.value; i++) {
    const key = String(props.items[i][props.keyField])
    sum += heightCache.value[key] || props.estimateHeight
  }
  return sum
})

/** 底部 padding */
const paddingBottom = computed(() => {
  let sum = 0
  for (let i = endIndex.value + 1; i < props.items.length; i++) {
    const key = String(props.items[i][props.keyField])
    sum += heightCache.value[key] || props.estimateHeight
  }
  return sum
})

/** 监听滚动到顶部/底部 */
watch(() => arrivedState.top, (isTop) => {
  if (isTop) emit('reach-top')
})

watch(() => arrivedState.bottom, (isBottom) => {
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

/** 可见项变化时测量 */
watch(visibleItems, () => {
  measureHeights()
})

onMounted(() => {
  measureHeights()
})

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
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
    }
  })
}

defineExpose({
  scrollToBottom,
  scrollToIndex,
  listRef,
})
</script>

<template>
  <div ref="listRef" class="message-virtual-list">
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
  -webkit-overflow-scrolling: touch;
}

.message-virtual-list__spacer {
  display: flex;
  flex-direction: column;
}

.message-virtual-list__item {
  flex-shrink: 0;
}
</style>
