<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useThemeStore, useViewport } from '@easemob-community/uikit-core'
import type { ChatDrawerProps } from '../types'

const props = withDefaults(defineProps<ChatDrawerProps>(), {
  overlay: true,
  closeOnClickOverlay: true,
  width: 320,
  offsetTop: 0,
  mode: 'push',
  fullscreen: false,
  closeOnClickOutside: true,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}>()

const themeStore = useThemeStore()
const { isMobile } = useViewport()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'chat-drawer__panel--square' : '',
)

/** 是否按覆盖模式渲染：全屏强制走覆盖结构（满铺），push 才走占位挤压结构 */
const isOverlayMode = computed(() => props.fullscreen || props.mode === 'overlay')

/**
 * H5 整页接管（模式 A）：fullscreen 语义在移动端升级为视口级 fixed 全屏层，
 * 脱离聊天容器坐标系、盖住宿主页面 header，消除双层 header；
 * PC 端 fullscreen 仍保持容器内满铺（不影响桌面布局）
 */
const isFixedFullscreen = computed(() => props.fullscreen && isMobile.value)

const panelRef = ref<HTMLElement>()

const offsetTopStyle = computed(() => {
  if (typeof props.offsetTop === 'number')
    return `${props.offsetTop}px`
  return props.offsetTop
})

/** 抽屉宽度统一为 CSS 值（供 overlay 行内样式与 push 模式 CSS 变量使用） */
const widthStyle = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width,
)

function close() {
  emit('update:show', false)
  emit('close')
}

function onOverlayClick() {
  if (props.closeOnClickOverlay) {
    close()
  }
}

/** 点击 panel 外部关闭（overlay 模式 = 遮罩点击语义，push 模式需开启 closeOnClickOutside） */
/**
 * 使用 capture: false 确保 bubble 阶段的 event.stopPropagation()（如内层
 * Teleport Popup 上的 @click.stop/@pointerdown.stop）能够阻止此监听器触发，
 * 避免内层弹窗内的点击误关闭外层 Drawer。
 *
 * 另外，Popup/Modal 通常通过 Teleport 挂载到 body，其 DOM 不在 panelRef
 * 内部，因此 onClickOutside 会将其判定为外部点击。这里通过
 * target.closest('.uikit-popup') 忽略所有弹窗容器内的点击，保证从
 * Drawer 中打开 Modal 时不会误关 Drawer。
 */
onClickOutside(panelRef, (event) => {
  if (!props.show) return
  // 全屏满铺无外部可点，不响应点击外部关闭
  if (props.fullscreen) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.uikit-popup')) return
  if (isOverlayMode.value) {
    // overlay 模式：外部点击即遮罩点击，沿用 closeOnClickOverlay 语义
    if (!props.closeOnClickOverlay) return
  }
  else if (!props.closeOnClickOutside) {
    // push 模式为布局占位、无遮罩，需显式开启「点击外部（聊天区/空白处）关闭」
    return
  }
  close()
}, { capture: false })
</script>

<template>
  <!-- 覆盖 / 全屏模式：absolute 满铺壳 + 遮罩或点击层 + 右侧滑入面板 -->
  <Transition name="chat-drawer-fade">
    <div v-if="show && isOverlayMode" class="chat-drawer" :class="{ 'chat-drawer--fixed': isFixedFullscreen }">
      <!-- 遮罩层（visible overlay） -->
      <div v-if="overlay" class="chat-drawer__overlay" @click="onOverlayClick" />
      <!-- 透明点击层（overlay=false 时覆盖外部区域，支持点击关闭） -->
      <div v-else-if="!fullscreen" class="chat-drawer__click-layer" @click="onOverlayClick" />
      <Transition name="chat-drawer-slide">
        <div
          v-if="show"
          ref="panelRef"
          class="chat-drawer__panel"
          :class="[shapeClass, { 'chat-drawer__panel--fullscreen': fullscreen }]"
          :style="fullscreen ? undefined : { width: widthStyle }"
        >
          <div v-if="$slots.header" class="chat-drawer__header">
            <slot name="header" />
          </div>
          <div class="chat-drawer__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="chat-drawer__footer">
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- push 模式：静态 flex 项占位挤压聊天区，宽度过渡展开/收起 -->
  <Transition name="chat-drawer-push">
    <div
      v-if="show && !isOverlayMode"
      ref="panelRef"
      class="chat-drawer__push-panel"
      :class="shapeClass"
    >
      <!-- 内层固定宽度：宽度过渡期间内容不挤压换行 -->
      <div class="chat-drawer__push-inner">
        <div v-if="$slots.header" class="chat-drawer__header">
          <slot name="header" />
        </div>
        <div class="chat-drawer__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="chat-drawer__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.chat-drawer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;
}

/* H5 整页接管（模式 A）：脱离聊天容器 fixed 满铺视口，盖住宿主页面 header，消除双层 header。
   z-index 取 1000（与 multi-select-bar 同档）：高于宿主页面内容，低于 Popup 全局分配器
   基线 2000，保证从抽屉内打开的 Modal/Popup（teleport 到 body）仍叠在抽屉之上 */
.chat-drawer--fixed {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 100vh */
  height: 100dvh;
  z-index: 1000;
  /* 面板滚动到边界时不把滚动链穿透给被盖住的宿主页面 */
  overscroll-behavior: contain;
}

.chat-drawer__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-drawer__click-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.chat-drawer__panel {
  position: absolute;
  top: v-bind(offsetTopStyle);
  right: 0;
  height: calc(100% - v-bind(offsetTopStyle));
  /* 面板底色与聊天容器统一（--uikit-chat-bg），全页面默认颜色一致 */
  background: var(--uikit-chat-bg, var(--uikit-bg-elevated, var(--uikit-bg-base)));
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  box-shadow: var(--uikit-shadow, -2px 0 8px rgba(0, 0, 0, 0.1));
  border-left: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 12px) 0 0 var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.chat-drawer__panel--square {
  border-radius: 0;
}

/* 全屏模式（移动端独立页面）：忽略 offsetTop 与宽度，满铺且圆角归零 */
.chat-drawer__panel--fullscreen {
  top: 0;
  width: 100%;
  height: 100%;
  border-left: none;
  border-radius: 0;
}

/* push 模式：静态 flex 项占位挤压聊天区，与主区平级的平面区域（背景与聊天容器一致，无描边） */
.chat-drawer__push-panel {
  flex-shrink: 0;
  height: 100%;
  width: v-bind(widthStyle);
  /* border-box：与主区（stretch 对齐）上下边缘严格齐平 */
  box-sizing: border-box;
  overflow: hidden;
  background: var(--uikit-chat-bg, var(--uikit-bg-elevated, var(--uikit-bg-base)));
  border-radius: var(--uikit-components-radius, 12px);
}

/* 内层固定宽度：宽度过渡期间内容保持排版不挤压换行 */
.chat-drawer__push-inner {
  width: v-bind(widthStyle);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-drawer__header {
  flex-shrink: 0;
}

.chat-drawer__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.chat-drawer__footer {
  flex-shrink: 0;
}

/* overlay 淡入淡出 */
.chat-drawer-fade-enter-active,
.chat-drawer-fade-leave-active {
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-drawer-fade-enter-from,
.chat-drawer-fade-leave-to {
  opacity: 0;
}

/* panel 从右侧滑入 */
.chat-drawer-slide-enter-active {
  transition: transform var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.chat-drawer-slide-leave-active {
  transition: transform var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.chat-drawer-slide-enter-from,
.chat-drawer-slide-leave-to {
  transform: translateX(100%);
}

/* push 模式：宽度从 0 展开，挤压聊天区；节奏与 overlay 滑入一致 */
.chat-drawer-push-enter-active {
  transition: width var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel);
}

.chat-drawer-push-leave-active {
  transition: width var(--uikit-anim-duration-leave) var(--uikit-anim-easing-accel);
}

.chat-drawer-push-enter-from,
.chat-drawer-push-leave-to {
  width: 0;
}
</style>
