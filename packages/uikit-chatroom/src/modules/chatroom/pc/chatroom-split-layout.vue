<script setup lang="ts">
/**
 * 聊天室 split 分栏布局（P5 PC 模式）：三栏 [舞台区 #stage | 消息主栏 | 成员侧栏]。
 *
 * - 纯布局壳子，不感知任何业务状态：stage 由业务注入（视频/白板/商品区），
 *   主栏（默认插槽）放消息流/输入条，成员栏放成员侧栏；
 * - 成员栏宽度可拖拽调整（core useResizable，min 200 / max 480，默认 280）；
 * - 未提供 #stage 插槽时舞台栏不渲染（两栏形态）；
 * - 窄视口坍缩由容器层决定（成员侧栏收起为弹层），本组件只负责分栏。
 */
import { computed, ref, watch } from 'vue'
import { useResizable } from '@easemob/uikit-core'

export interface ChatroomSplitLayoutProps {
  /** 成员栏宽度（px 数字或 CSS 长度，缺省 280px；可拖拽调整） */
  memberWidth?: number | string
  /** 是否渲染成员栏（场景 features.memberList !== 'none' 时） */
  showMembers?: boolean
}

const props = withDefaults(defineProps<ChatroomSplitLayoutProps>(), {
  memberWidth: 280,
  showMembers: true,
})

const resizeHandleRef = ref<HTMLElement>()

/** 成员栏初始宽度（数字 → px；字符串保留原样仅作初始值） */
const initialMemberWidth = computed(() => {
  if (typeof props.memberWidth === 'number')
    return props.memberWidth
  const parsed = Number.parseFloat(props.memberWidth)
  return Number.isFinite(parsed) ? parsed : 280
})

/** 成员栏当前宽度（拖拽中实时更新；min 200 / max 480 clamp） */
const { size: memberWidthPx, isResizing } = useResizable(resizeHandleRef, {
  axis: 'horizontal',
  initial: initialMemberWidth.value,
  min: 200,
  max: 480,
  // 手柄位于成员栏左缘：向左拖 = 变宽（增量方向相反）
  invert: true,
})

/** 成员栏宽度样式（拖拽用 px；外部字符串 prop 仅在初始时生效） */
const memberWidthStyle = computed(() => `${memberWidthPx.value}px`)

/** 外部 prop 变化时重置拖拽宽度（如场景切换 panels.memberWidth 变更） */
watch(
  () => initialMemberWidth.value,
  (width) => {
    if (width !== memberWidthPx.value)
      memberWidthPx.value = width
  },
)
</script>

<template>
  <div class="chatroom-split-layout" :class="{ 'chatroom-split-layout--resizing': isResizing }">
    <!-- 舞台区（业务注入视频/白板/商品区；未提供插槽时不渲染） -->
    <div v-if="$slots.stage" class="chatroom-split-layout__stage">
      <slot name="stage" />
    </div>

    <!-- 消息主栏（默认插槽：公告条 + 消息流 + 输入行） -->
    <div class="chatroom-split-layout__main">
      <slot />
    </div>

    <!-- 成员侧栏（可拖拽调宽） -->
    <template v-if="showMembers">
      <div
        ref="resizeHandleRef"
        class="chatroom-split-layout__handle"
        role="separator"
        aria-orientation="vertical"
        title="拖拽调整成员栏宽度"
      />
      <div class="chatroom-split-layout__members" :style="{ width: memberWidthStyle }">
        <slot name="members" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.chatroom-split-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

/* 舞台区：固定宽度（场景 panels.stageWidth 由业务经样式覆盖），黑底衬托视频 */
.chatroom-split-layout__stage {
  position: relative;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
  background: #000;
}

/* 消息主栏：占满剩余宽度 */
.chatroom-split-layout__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--uikit-chat-bg, var(--uikit-bg-base));
}

/* 分栏拖拽手柄（成员栏左缘；hover 高亮） */
.chatroom-split-layout__handle {
  flex-shrink: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
}

@media (hover: hover) {
  .chatroom-split-layout__handle:hover {
    background: var(--uikit-bg-active, rgba(51, 177, 255, 0.18));
  }
}

.chatroom-split-layout__handle:active {
  background: var(--uikit-bg-active, rgba(51, 177, 255, 0.3));
}

/* 成员侧栏：固定宽度（拖拽可调） */
.chatroom-split-layout__members {
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-left: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

/* 拖拽中禁用文本选中（useResizable 已处理 body 级，此处兜底成员栏内元素） */
.chatroom-split-layout--resizing,
.chatroom-split-layout--resizing * {
  user-select: none;
}
</style>
