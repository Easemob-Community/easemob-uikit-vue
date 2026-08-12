<script setup lang="ts">
/**
 * 设置面板分组标题：标题文字 + 问号说明入口
 *
 * 鼠标悬停（或键盘聚焦）问号时，浮出该配置项的实际含义说明；
 * 浮层 fixed 定位并做视口边界修正，避免被抽屉滚动容器裁剪。
 */
import { nextTick, ref } from 'vue'

interface Props {
  /** 分组标题 */
  title: string
  /** 配置含义说明；不传则不渲染问号 */
  tip?: string
}

defineProps<Props>()

const show = ref(false)
const anchorRef = ref<HTMLElement>()
const popupRef = ref<HTMLElement>()
const pos = ref({ top: 0, left: 0 })

function positionPopup() {
  const anchor = anchorRef.value
  const popup = popupRef.value
  if (!anchor || !popup)
    return
  const rect = anchor.getBoundingClientRect()
  const popupRect = popup.getBoundingClientRect()
  const gap = 8
  // 优先显示在问号下方；底部空间不足时翻转到上方
  let top = rect.bottom + gap
  if (top + popupRect.height > window.innerHeight - gap)
    top = Math.max(gap, rect.top - popupRect.height - gap)
  // 水平方向左对齐问号，并夹在视口内
  const left = Math.min(Math.max(gap, rect.left), window.innerWidth - popupRect.width - gap)
  pos.value = { top, left }
}

async function onEnter() {
  show.value = true
  await nextTick()
  positionPopup()
}

function onLeave() {
  show.value = false
}
</script>

<template>
  <span class="demo-setting-label" @mouseenter="onEnter" @mouseleave="onLeave">
    <span class="demo-setting-label__title">{{ title }}</span>
    <span
      v-if="tip"
      ref="anchorRef"
      class="demo-setting-label__help"
      tabindex="0"
      aria-label="查看配置说明"
      @focus="onEnter"
      @blur="onLeave"
    >
      ?
    </span>
    <Transition name="demo-tip-fade">
      <div
        v-if="show && tip"
        ref="popupRef"
        class="demo-setting-label__popup"
        role="tooltip"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      >
        {{ tip }}
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.demo-setting-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 与 demo-settings__label 视觉一致 */
  font-size: 12px;
  font-weight: 600;
  color: var(--uikit-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.demo-setting-label__title {
  line-height: 1.2;
}

.demo-setting-label__help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--uikit-text-tertiary, #9ca3af);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--uikit-text-tertiary, #9ca3af);
  cursor: help;
  outline: none;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.demo-setting-label__help:hover,
.demo-setting-label__help:focus-visible {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-setting-label__popup {
  position: fixed;
  z-index: 10000;
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 6px;
  background-color: rgba(17, 24, 39, 0.95);
  color: #f9fafb;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: normal;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.demo-tip-fade-enter-active,
.demo-tip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.demo-tip-fade-enter-from,
.demo-tip-fade-leave-to {
  opacity: 0;
}
</style>
