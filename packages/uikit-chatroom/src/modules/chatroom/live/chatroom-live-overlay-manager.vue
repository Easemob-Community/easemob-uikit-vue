<script setup lang="ts">
/**
 * 直播间 overlay 布局管理器：
 * - 统一管理多个浮动交互卡片/通知的锚定位置，避免互相重叠；
 * - 当前支持 `top`（顶部居中公告）与 `bottom-right`（右下交互卡片堆叠）；
 * - 内容完全通过插槽自定义，业务方可在此壳子内放置商品卡、红包、优惠券、PK 条等；
 * - 这是 UIKIT 对「多容器自动排位」的薄层抽象。
 */

import { computed } from 'vue'

export type LiveOverlayAnchor = 'top' | 'bottom-right'

export interface LiveOverlayItem {
  /** 唯一标识 */
  id: string | number
  /** 锚定位置 */
  anchor: LiveOverlayAnchor
  /** 同锚点内的排序权重（越大越靠前） */
  priority?: number
  /** 业务透传数据，供插槽渲染使用 */
  meta?: Record<string, unknown>
}

export interface ChatroomLiveOverlayManagerProps {
  /** overlay 条目列表 */
  items: LiveOverlayItem[]
}

const props = defineProps<ChatroomLiveOverlayManagerProps>()

const emit = defineEmits<{
  /** 业务方移除某条 overlay（如点击关闭） */
  (e: 'remove', id: string | number): void
}>()

/** 按锚点分组并排序 */
const grouped = computed(() => {
  const top: LiveOverlayItem[] = []
  const bottomRight: LiveOverlayItem[] = []
  for (const item of props.items) {
    if (item.anchor === 'top')
      top.push(item)
    else if (item.anchor === 'bottom-right')
      bottomRight.push(item)
  }
  const byPriority = (a: LiveOverlayItem, b: LiveOverlayItem) => (b.priority ?? 0) - (a.priority ?? 0)
  return {
    top: top.sort(byPriority),
    bottomRight: bottomRight.sort(byPriority),
  }
})

function handleClose(id: string | number) {
  emit('remove', id)
}
</script>

<template>
  <div class="live-overlay-manager">
    <!-- 顶部公告区 -->
    <div v-if="grouped.top.length > 0" class="live-overlay-manager__anchor live-overlay-manager__anchor--top">
      <div
        v-for="item in grouped.top"
        :key="`top-${item.id}`"
        class="live-overlay-manager__slot"
      >
        <slot name="item" :item="item" :close="() => handleClose(item.id)" />
      </div>
    </div>

    <!-- 右下交互卡片区 -->
    <div v-if="grouped.bottomRight.length > 0" class="live-overlay-manager__anchor live-overlay-manager__anchor--bottom-right">
      <div
        v-for="item in grouped.bottomRight"
        :key="`br-${item.id}`"
        class="live-overlay-manager__slot"
      >
        <slot name="item" :item="item" :close="() => handleClose(item.id)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-overlay-manager {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.live-overlay-manager__anchor {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
}

/* 顶部公告：居中，避开顶部信息栏 */
.live-overlay-manager__anchor--top {
  top: calc(56px + var(--uikit-safe-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

/* 右下交互卡片：与弹幕/输入栏留出间距 */
.live-overlay-manager__anchor--bottom-right {
  right: 8px;
  bottom: 108px;
  align-items: flex-end;
}

.live-overlay-manager__slot {
  position: relative;
  max-width: min(70vw, 280px);
}
</style>
